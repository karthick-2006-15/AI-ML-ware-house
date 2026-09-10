import heapq
from typing import List, Tuple
from simulation.environment import WarehouseEnv

def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar(env: WarehouseEnv, start: Tuple[int, int], goal: Tuple[int, int], ignore_robots=True) -> List[Tuple[int, int]]:
    neighbors = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    
    close_set = set()
    came_from = {}
    gscore = {start: 0}
    fscore = {start: heuristic(start, goal)}
    oheap = []
    
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
        
        for i, j in neighbors:
            neighbor = current[0] + i, current[1] + j
            
            # For goal, it might be a shelf. If goal is a shelf, we should allow adjacent cells to be the final path point, 
            # or just ignore grid obstacles if neighbor == goal (so path goes exactly TO the shelf)
            if not env.is_valid_position(neighbor[0], neighbor[1], ignore_robots=ignore_robots):
                if neighbor != goal:
                    continue
                    
            tentative_g_score = gscore[current] + 1
            
            if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, 0):
                continue
                
            if tentative_g_score < gscore.get(neighbor, 0) or neighbor not in [i[1] for i in oheap]:
                came_from[neighbor] = current
                gscore[neighbor] = tentative_g_score
                fscore[neighbor] = tentative_g_score + heuristic(neighbor, goal)
                heapq.heappush(oheap, (fscore[neighbor], neighbor))
                
    return [] # No path found
