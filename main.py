import json
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from services.discovery_service import DiscoveryService
from services.info_service import InfoService
from utils.logger import setup_logger

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger = setup_logger()
    discovery_service = DiscoveryService()
    info_service = InfoService()

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            data = json.loads(data)
            action = data.get("action")
            
            if action == "nmap_scan":
                await discovery_service.run_discovery("nmap", websocket)

            elif action == "get_onvif_info":
                await info_service.get_info("onvif", websocket, data)

            elif action == "get_iapi_info":
                await info_service.get_info("iapi", websocket, data)

    except WebSocketDisconnect:
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
