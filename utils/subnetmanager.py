from multiprocessing import Process
import ipaddress
import netifaces
import subprocess
import time
import platform


from utils.logger import setup_logger

class SubnetManager:
    def __init__(self, alive_subnet_list):
        self.alive_subnet_list = alive_subnet_list
        self.logging = setup_logger()

    def get_alive_subnets(self):
        start_time = time.time() 
        ip, netmask = self.get_ip_and_subnet()

        if ip:
            base_subnet = self.calculate_base_subnet(ip, prefix=16)
            if base_subnet:
                base_network = ipaddress.IPv4Network(base_subnet)
                self.find_alive_subnets(base_network, netmask)
                subnet_latency = time.time() - start_time
                return {"alive_subnets" : list(self.alive_subnet_list), "subnet_latency":subnet_latency}
            else:
                self.logging.warning("Failed to calculate base subnet")
                return {"error":"Failed to calculate base subnet"}
        else:
            self.logging.warning("Failed to get current IP address")
            return {"error":"Failed to get current IP address"}

    def ping_subnet(self, subnet):
        """
        Ping the first IP in the subnet to check if the subnet is alive.
        """
        try:
            first_ip = str(next(subnet.hosts()))  # First usable IP in subnet
            if platform.system().lower() == 'windows':
                result = subprocess.run(['ping', '-n', '1', '-w', '1000', first_ip], stdout=subprocess.PIPE)
            else:
                result = subprocess.run(['ping', '-c', '1', '-W', '1', first_ip], stdout=subprocess.PIPE)
                        
            if result.returncode == 0:
                self.logging.debug(f"Subnet {subnet} is alive (ping response from {first_ip})")
                self.alive_subnet_list.append(str(subnet))
            else:
                self.logging.debug(f"Subnet {subnet} is not responding")
        except Exception as e:
            self.logging.warning(f"Error pinging subnet {subnet}: {e}")

    def find_alive_subnets(self, base_network, prefix_cidr):
        """
        Iterate over /23 subnets in the given /16 network and check if they are alive.
        """
        try:
            self.alive_subnet_list[:] = [] 
            # Split the base network (e.g., 192.168.0.0/16) into /23 subnets
            subnets = list(base_network.subnets(new_prefix=prefix_cidr))  
            processes = []
            for subnet in subnets:
                p = Process(target=self.ping_subnet, args=(subnet, ))
                processes.append(p)
                p.start()

            for p in processes:
                p.join()

            self.logging.info(f"Alive subnets found: {self.alive_subnet_list}")
        except Exception as e:
            self.logging.warning(f"Error finding alive subnets: {e}")

    def get_ip_and_subnet(self):
        """
        Get the current IP address and subnet mask of the machine dynamically.
        """
        interfaces = netifaces.interfaces()
        for iface in interfaces:
            addrs = netifaces.ifaddresses(iface)
            
            if netifaces.AF_INET in addrs:  # Look for the IPv4 address
                for link in addrs[netifaces.AF_INET]:
                    ip_address = link.get('addr')
                    netmask = link.get('netmask')
                    
                    if ip_address and not ip_address.startswith('127.'):
                        network = ipaddress.IPv4Network(f"{ip_address}/{netmask}", strict=False)
                        netmask = network.prefixlen
                        self.logging.info(f"IP Address: {ip_address}, Subnet Mask: {netmask}, Network: {network}")
                        return ip_address, netmask

        return None, None

    def calculate_base_subnet(self, ip, prefix=16):
        """
        Calculate the base /16 subnet from the current IP.
        """
        try:
            ip_obj = ipaddress.IPv4Address(ip)
            network = ipaddress.IPv4Network(f"{ip_obj}/{prefix}", strict=False)
            base_subnet = str(network.network_address) + f"/{prefix}"
            self.logging.info(f"Calculated base subnet: {base_subnet}")
            return base_subnet
        except Exception as e:
            self.logging.warning(f"Error calculating base subnet: {e}")
            return None
