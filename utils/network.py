from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl

# Network utility placeholder, for any IP or subnet-related operations
def validate_ip(ip_address):
    pass

def calculate_subnets(base_subnet):
    pass

class TLSAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        # Create an SSL context with certificate verification disabled
        context = ssl.create_default_context()
        context.check_hostname = False  # Disable hostname checking
        context.verify_mode = ssl.CERT_NONE  # Disable certificate verification
        kwargs['ssl_context'] = context
        return super(TLSAdapter, self).init_poolmanager(*args, **kwargs)  
