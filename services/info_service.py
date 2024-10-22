from strategies.info.onvif_info import ONVIFInfo
from strategies.info.iapi_info import IAPIInfo

class InfoService:
    def __init__(self):
        self.info_strategies = {
            "onvif": ONVIFInfo(),
            "iapi": IAPIInfo(),
        }

    async def get_info(self, strategy_name: str, websocket, data):
        strategy = self.info_strategies.get(strategy_name)
        if strategy:
            response = strategy.get_camera_info(data)
            await websocket.send_json(response)
        else:
            await websocket.send_json({"error":f"Unknown info strategy: {strategy_name}"})
