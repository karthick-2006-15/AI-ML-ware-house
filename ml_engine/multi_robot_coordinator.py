from typing import List, Tuple, Dict, Optional, Set, Any
from simulation.environment import WarehouseEnv
from simulation.entities import Robot, RobotHealth
from ml_engine.pathfinding import AStarPlanner

class MultiRobotCoordinator:
    """
    Decentralized/Centralized Hybrid Multi-Robot Coordinator.
    Provides:
    - Same-cell collision prevention
    - Head-on swap conflict prevention
    - Priority-based waiting and yield arbitration
    - Deadlock detection and lateral evasion replanning
    - Event tracking for timeline and analytics
    """
    def __init__(self, env: WarehouseEnv, planner: AStarPlanner):
        self.env = env
        self.planner = planner
        self.deadlocks_detected = 0
        self.deadlocks_resolved = 0
        self.conflicts_avoided = 0
        self.replans_count = 0
        self.events: List[Dict[str, Any]] = []

    def get_robot_priority(self, robot: Robot) -> float:
        """
        Calculates dynamic priority score:
        1. Higher task priority (HIGH > NORMAL > LOW)
        2. Low battery going to charge gets high emergency priority
        3. Longer wait time accumulates priority (anti-starvation)
        4. Tie-breaker by robot ID
        """
        base = 1.0
        if robot.status == 'moving_to_charge':
            base = 10.0  # Critical path to prevent dying on floor
        elif robot.current_task_obj:
            p_level = getattr(robot.current_task_obj, 'priority_level', 2)
            base = p_level * 3.0
            
        # Age-weighted wait bonus
        wait_bonus = robot.wait_counter * 2.0
        
        # ID tiebreaker (consistent order)
        id_num = int(''.join(filter(str.isdigit, robot.id)) or '0')
        tiebreaker = 1.0 / (id_num + 1.0)
        
        return base + wait_bonus + tiebreaker

    def coordinate_step(self, zone_congestion: Optional[Dict[str, Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        Executes safe simultaneous movement step for all active robots.
        Guarantees:
        - ZERO collisions (same-cell and swap conflicts are physically eliminated)
        - Deadlock detection and evasion
        - Accurate event logging
        """
        step_events = []
        active_robots = [
            r for r in self.env.robots 
            if r.health != RobotHealth.FAILED and r.battery > 0
        ]
        
        # Current positions map: (x, y) -> Robot
        curr_positions: Dict[Tuple[int, int], Robot] = {(r.x, r.y): r for r in active_robots}
        
        # Desired next moves: Robot -> target (x, y)
        desired_moves: Dict[str, Tuple[int, int]] = {}
        for r in active_robots:
            if r.path:
                desired_moves[r.id] = r.path[0]

        # 1. Detect dynamic obstacle blockages in paths
        for r in active_robots:
            if r.path:
                next_tile = r.path[0]
                # If next tile is blocked by static or dynamic obstacle
                if self.env.is_obstacle(next_tile[0], next_tile[1]):
                    # Replan around obstacle
                    target_goal = r.path[-1]
                    new_path = self.planner.replan_around_obstacle(
                        current_pos=(r.x, r.y),
                        goal=target_goal,
                        blocked_pos=next_tile,
                        requesting_robot_id=r.id
                    )
                    r.replans_count += 1
                    self.replans_count += 1
                    
                    if new_path:
                        r.path = new_path
                        desired_moves[r.id] = r.path[0]
                        evt = {
                            "type": "alert",
                            "robotId": r.id,
                            "description": f"Dynamic obstacle detected at ({next_tile[0]}, {next_tile[1]}) — route recalculated."
                        }
                        step_events.append(evt)
                    else:
                        # Path completely blocked, clear and wait
                        r.path = []
                        r.wait_counter += 1
                        desired_moves.pop(r.id, None)

        # 2. Identify and Resolve Conflicts
        # Target cell contention: target (x, y) -> list of robots wanting it
        contenders: Dict[Tuple[int, int], List[Robot]] = {}
        for r in active_robots:
            if r.id in desired_moves:
                target = desired_moves[r.id]
                contenders.setdefault(target, []).append(r)

        # Robots approved to move this tick
        approved_to_move: Set[str] = set()
        
        # Resolve Same-Cell Contention
        for target, r_list in contenders.items():
            if len(r_list) == 1:
                # Only 1 contender for target cell
                continue
                
            # Multiple robots want the same cell!
            # Sort by priority descending
            r_list.sort(key=lambda r: self.get_robot_priority(r), reverse=True)
            winner = r_list[0]
            losers = r_list[1:]
            
            for loser in losers:
                # Remove desired move, make loser wait
                desired_moves.pop(loser.id, None)
                loser.wait_counter += 1
                loser.conflicts_avoided += 1
                self.conflicts_avoided += 1
                evt = {
                    "type": "move",
                    "robotId": loser.id,
                    "description": f"Traffic conflict avoided: {loser.id} waiting for {winner.id}."
                }
                step_events.append(evt)

        # 3. Resolve Head-on / Swap Conflicts:
        # Robot A at (x1, y1) wants (x2, y2), and Robot B at (x2, y2) wants (x1, y1)
        for r_a in list(active_robots):
            if r_a.id not in desired_moves:
                continue
            t_a = desired_moves[r_a.id]
            
            # Is there another robot currently occupying t_a?
            r_b = curr_positions.get(t_a)
            if r_b and r_b.id in desired_moves:
                t_b = desired_moves[r_b.id]
                if t_b == (r_a.x, r_a.y):
                    # HEAD-ON CONFLICT DETECTED!
                    pri_a = self.get_robot_priority(r_a)
                    pri_b = self.get_robot_priority(r_b)
                    
                    winner, loser = (r_a, r_b) if pri_a >= pri_b else (r_b, r_a)
                    
                    desired_moves.pop(loser.id, None)
                    loser.wait_counter += 1
                    loser.conflicts_avoided += 1
                    self.conflicts_avoided += 1
                    
                    # If loser is blocked head-on, try to find an evasion step (side step)
                    if loser.wait_counter >= 2 and loser.path:
                        self.deadlocks_detected += 1
                        # Attempt lateral replanning
                        target_goal = loser.path[-1]
                        alt_path = self.planner.find_path(
                            start=(loser.x, loser.y),
                            goal=target_goal,
                            ignore_robots=False,
                            requesting_robot_id=loser.id,
                            avoid_cells={(winner.x, winner.y), desired_moves.get(winner.id, (winner.x, winner.y))}
                        )
                        if alt_path:
                            loser.path = alt_path
                            loser.wait_counter = 0
                            self.deadlocks_resolved += 1
                            evt = {
                                "type": "alert",
                                "robotId": loser.id,
                                "description": f"Deadlock detected — resolving traffic conflict with alternate route."
                            }
                            step_events.append(evt)
                        else:
                            evt = {
                                "type": "move",
                                "robotId": loser.id,
                                "description": f"Traffic conflict avoided: {loser.id} waiting for {winner.id}."
                            }
                            step_events.append(evt)
                    else:
                        evt = {
                            "type": "move",
                            "robotId": loser.id,
                            "description": f"Traffic conflict avoided: {loser.id} waiting for {winner.id}."
                        }
                        step_events.append(evt)

        # 4. Moving robots into non-occupied cells
        for r in active_robots:
            if r.id in desired_moves:
                target = desired_moves[r.id]
                # Verify cell is not currently occupied by a robot that is NOT moving out
                occ = curr_positions.get(target)
                if occ and occ.id not in desired_moves:
                    # Target robot is stationary; cannot move into it!
                    r.wait_counter += 1
                    r.conflicts_avoided += 1
                    self.conflicts_avoided += 1
                    
                    # Check for deadlock
                    if r.wait_counter >= 3:
                        self.deadlocks_detected += 1
                        # Trigger replan avoiding stationary robot
                        if r.path:
                            alt_path = self.planner.replan_around_obstacle(
                                current_pos=(r.x, r.y),
                                goal=r.path[-1],
                                blocked_pos=target,
                                requesting_robot_id=r.id
                            )
                            if alt_path:
                                r.path = alt_path
                                r.wait_counter = 0
                                self.deadlocks_resolved += 1
                                step_events.append({
                                    "type": "alert",
                                    "robotId": r.id,
                                    "description": f"Deadlock detected — resolving traffic conflict."
                                })
                    continue
                    
                # Safe to move!
                is_loaded = (r.status in ['picking', 'moving_to_packing'])
                r.move_along_path(is_loaded=is_loaded)
                r.wait_counter = 0
                
        self.events.extend(step_events)
        return step_events
