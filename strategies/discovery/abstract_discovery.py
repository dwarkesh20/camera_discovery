from abc import ABC, abstractmethod

class AbstractDiscovery(ABC):
    @abstractmethod
    def discover_cameras(self):
        pass
