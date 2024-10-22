from strategies.discovery.abstract_discovery import AbstractDiscovery

class CustomDiscovery(AbstractDiscovery):
    def discover_cameras(self):
        return ["cameraX", "cameraY"]
