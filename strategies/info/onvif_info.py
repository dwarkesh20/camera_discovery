from multiprocessing.connection import Client
import time
from utils.logger import setup_logger
from strategies.info.abstract_info import AbstractInfo
from zeep.wsse.username import UsernameToken


class ONVIFInfo(AbstractInfo):
    def __init__(self):
        self.logging = setup_logger()

    def get_camera_info(self, data):
        try:
            start_time = time.time()
            
            host = data.get("host")
            username = data.get("username")
            password = data.get("password")

            xaddr = f'http://{host}/onvif/device_service'
            client = Client(
                'http://www.onvif.org/onvif/ver10/device/wsdl/devicemgmt.wsdl',
                wsse=UsernameToken(username, password)
            )
            client.transport.session.auth = (username, password)
            client.transport.timeout = 10
            service = client.create_service('{http://www.onvif.org/ver10/device/wsdl}DeviceBinding', xaddr)
            device_info = service.GetDeviceInformation()
            if not device_info:
                return {"error":"Error during ONVIF camera discovery"}
            device_info_dict = {
                "Manufacturer": device_info.Manufacturer,
                "Model": device_info.Model,
                "FirmwareVersion": device_info.FirmwareVersion,
                "SerialNumber": device_info.SerialNumber,
                "HardwareId": device_info.HardwareId
            }
            self.logging.info(f"ONVIF camera discovery: {device_info_dict}")
            self.logging.info(f"ONVIF latency: {time.time()-start_time}")
            response = {
                "host": host,
                "cameraInfo": device_info_dict
            }
            return response
        except Exception as e:
            self.logging.warning(f"Error during ONVIF camera discovery: {e}")
            return {"error":"ONVIF Error: Failed to fetch Camera Information."}