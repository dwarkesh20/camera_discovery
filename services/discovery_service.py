import asyncio
from multiprocessing import Manager, Queue
from strategies.discovery.nmap_discovery import NmapDiscovery
from utils.subnetmanager import SubnetManager

class DiscoveryService:
    def __init__(self):
        self.camera_queue = Queue()
        self.alive_subnet_list = Manager().list()

        self.strategies = {
            "nmap": NmapDiscovery(self.camera_queue, self.alive_subnet_list)
        }

    async def run_discovery(self, strategy_name: str, websocket):
        strategy = self.strategies.get(strategy_name)
        if strategy:
            subnet_manager = SubnetManager(self.alive_subnet_list)
            loop = asyncio.get_running_loop()
            subnets_result = await loop.run_in_executor(None, subnet_manager.get_alive_subnets)
            await websocket.send_json(subnets_result)
            
            response = await loop.run_in_executor(None, strategy.discover_cameras)
            if response.get("success"):
                while not self.camera_queue.empty():
                    camera_data = self.camera_queue.get()
                    await websocket.send_json(camera_data)
                latrncy = response.get("success")
                await websocket.send_json({"latency": latrncy})
            else:
                await websocket.send_json(response)
        else:
            await websocket.send_json({"error": f"Unknown strategy: {strategy_name}"})
