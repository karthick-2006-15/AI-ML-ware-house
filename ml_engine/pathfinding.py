import heapq
from typing import List, Tuple, Dict, Optional, Any, Set
from simulation.environment import WarehouseEnv

def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> int:
    """Manhattan distance heuristic for grid-based warehouse topology"""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

class AStarPlanner:
    """
    Modular, high-performance A* path planner with dynamic obstacle avoidance,
    congestion-aware cost function, and space-time reservation support.
    """
    def __init__(self, env: WarehouseEnv):
        self.env = env
        self.neighbors = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    def calculate_step_cost(
        self, 
        current: Tuple[int, int], 
        neighbor: Tuple[int, int], 
        zone_congestion: Optional[Dict[str, Dict[str, Any]]] = None,
        reserved_cells: Optional[Dict[Tuple[int, int], str]] = None,
        requesting_robot_id: Optional[str] = None
    ) -> float:
        """
        Total Cost = distance (1.0) + congestion_cost + conflict_cost + obstacle_proximity_cost
        """
        base_cost = 1.0
        
        # 1. Zone Congestion Cost (from XGBoost / Zone Analytics)
        congestion_penalty = 0.0
        if zone_congestion:
            zone = self.env.get_zone(neighbor[0], neighbor[1])
            z_info = zone_congestion.get(zone, {})
            c_level = z_info.get("congestion", "LOW")
            if c_level == "HIGH":
                congestion_penalty = 3.5
            elif c_level == "MEDIUM":
                congestion_penalty = 1.5

        # 2. Reservation / Conflict Cost
        conflict_penalty = 0.0
        if reserved_cells and neighbor in reserved_cells:
            res_robot = reserved_cells[neighbor]
            if res_robot != requesting_robot_id:
                conflict_penalty = 5.0  # Encourage detour if cell reserved

        return base_cost + congestion_penalty + conflict_penalty

    def find_path(
        self,
        start: Tuple[int, int],
        goal: Tuple[int, int],
        ignore_robots: bool = True,
        requesting_robot_id: Optional[str] = None,
        reserved_cells: Optional[Dict[Tuple[int, int], str]] = None,
        zone_congestion: Optional[Dict[str, Dict[str, Any]]] = None,
        avoid_cells: Optional[Set[Tuple[int, int]]] = None
    ) -> List[Tuple[int, int]]:
        """
        Finds optimal collision-free path between start and goal.
        If goal is a shelf/station, allows navigation directly adjacent to or onto the target.
        """
        if start == goal:
            return []

        avoid = avoid_cells or set()
        close_set: Set[Tuple[int, int]] = set()
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        gscore: Dict[Tuple[int, int], float] = {start: 0.0}
        fscore: Dict[Tuple[int, int], float] = {start: float(heuristic(start, goal))}
        oheap: List[Tuple[float, Tuple[int, int]]] = []
        
        heapq.heappush(oheap, (fscore[start], start))
        
        while oheap:
            current = heapq.heappop(oheap)[1]
            
            if current == goal:
                data = []
                while current in came_from:
                    data.append(current)
                    current = came_from[current]
                return data[::-1]
                
            close_set.add(current)
            
            for i, j in self.neighbors:
                neighbor = (current[0] + i, current[1] + j)
                
                # Check boundaries and obstacles
                if neighbor in avoid and neighbor != goal:
                    continue
                    
                if not self.env.is_valid_position(neighbor[0], neighbor[1], ignore_robots=ignore_robots, requesting_robot_id=requesting_robot_id):
                    # If neighbor is the goal itself (e.g. shelf or station), allow it so robot can reach pickup
                    if neighbor != goal:
                        continue
                        
                step_cost = self.calculate_step_cost(
                    current, 
                    neighbor, 
                    zone_congestion=zone_congestion,
                    reserved_cells=reserved_cells,
                    requesting_robot_id=requesting_robot_id
                )
                tentative_g_score = gscore[current] + step_cost
                
                if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, float('inf')):
                    continue
                    
                if tentative_g_score < gscore.get(neighbor, float('inf')) or neighbor not in [item[1] for item in oheap]:
                    came_from[neighbor] = current
                    gscore[neighbor] = tentative_g_score
                    fscore[neighbor] = tentative_g_score + heuristic(neighbor, goal)
                    heapq.heappush(oheap, (fscore[neighbor], neighbor))
                    
        return []

    def replan_around_obstacle(
        self,
        current_pos: Tuple[int, int],
        goal: Tuple[int, int],
        blocked_pos: Tuple[int, int],
        requesting_robot_id: Optional[str] = None
    ) -> List[Tuple[int, int]]:
        """Fast dynamic replanning when an obstacle or blocked robot is detected ahead"""
        avoid = {blocked_pos}
        return self.find_path(
            start=current_pos,
            goal=goal,
            ignore_robots=True,
            requesting_robot_id=requesting_robot_id,
            avoid_cells=avoid
        )

    def plan(
        self,
        start: Tuple[int, int],
        goal: Tuple[int, int],
        ignore_robots: bool = True,
        requesting_robot_id: Optional[str] = None,
        reserved_cells: Optional[Dict[Tuple[int, int], str]] = None,
        zone_congestion: Optional[Dict[str, Dict[str, Any]]] = None,
        avoid_cells: Optional[Set[Tuple[int, int]]] = None
    ) -> List[Tuple[int, int]]:
        return self.find_path(start, goal, ignore_robots, requesting_robot_id, reserved_cells, zone_congestion, avoid_cells)

# Maintain backwards compatibility function signature
def astar(
    env: WarehouseEnv, 
    start: Tuple[int, int], 
    goal: Tuple[int, int], 
    ignore_robots: bool = True,
    zone_congestion: Optional[Dict[str, Dict[str, Any]]] = None
) -> List[Tuple[int, int]]:
    planner = AStarPlanner(env)
    return planner.find_path(start, goal, ignore_robots=ignore_robots, zone_congestion=zone_congestion)

