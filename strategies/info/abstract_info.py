from abc import ABC, abstractmethod

class AbstractInfo(ABC):
    @abstractmethod
    def get_camera_info(self, camera_id: str):
        pass
