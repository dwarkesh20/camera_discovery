import requests
from utils.logger import setup_logger
from strategies.info.abstract_info import AbstractInfo
from utils.network import TLSAdapter
from requests.auth import HTTPBasicAuth


class IAPIInfo(AbstractInfo):
    def __init__(self):
        self.logging = setup_logger()

    def get_camera_info(self, data):
        host = data.get("host")
        username = data.get("username")
        password = data.get("password")
        
        URL = f"https://{host}/iAPI/element.cgi?action=read&group=System&group=Network.MacAddress"
        try:
            session = requests.Session()
            adapter = TLSAdapter()
            session.mount('https://', adapter)
            
            response = session.get(URL, verify=False, auth=HTTPBasicAuth(username, password))
            if response.status_code == 200:
                decoded_response = response.content.decode('utf-8')

                parsed_data = {}
                for line in decoded_response.split('\r\n'):
                    if line:
                        key, value = line.split('=')
                        parsed_data[key] = value

                self.logging.info(f"iAPI response: {parsed_data}")
                response = {
                    "host": host,
                    "iAPIcameraInfo": parsed_data
                }
                return response
            else:
                self.logging.info(f"iAPI Error: {response.text}")
                return {"error": "iAPI Error: Failed to fetch Camera Information."}
                
        except Exception as e:
            self.logging.info(f"iAPI Error: {e}")
            return {"error": "iAPI Error: Failed to fetch Camera Information."}