from multiprocessing import Process
import time

import nmap
from utils.logger import setup_logger
from strategies.discovery.abstract_discovery import AbstractDiscovery

class NmapDiscovery(AbstractDiscovery):
    def __init__(self, camera_queue, alive_subnet_list):
        self.camera_queue = camera_queue
        self.alive_subnet_list = alive_subnet_list
        self.logging = setup_logger()

    def scan_subnet(self, subnet):
        self.logging.debug(f"Start scanning subnet: {subnet}")
        scanner = nmap.PortScanner()
        scanner.scan(hosts=str(subnet), arguments='--open -T5 -p 554,80,443,8080 -sT --max-retries 0 --host-timeout 1s --initial-rtt-timeout 100ms --min-parallelism 300 --max-parallelism 500 --min-hostgroup 512 -n')

        self.logging.debug(f"End scanning subnet: {subnet}")
        for host in scanner.all_hosts():
            if scanner[host].has_tcp(554) and scanner[host]['tcp'][554]['state'] == 'open':
                self.logging.debug(f"Camera found: {host} - RTSP 554 open")                
                ports = list(scanner[host]['tcp'].keys())
                services = []
                for port in ports:
                    service = scanner[host]['tcp'][port]['name']
                    services.append(service)
                camera_data = {
                    "camera": {
                        "host": host,
                        "ports": ports,
                        "services": services
                    }
                }
                self.camera_queue.put(camera_data)

    def discover_cameras(self):
        start_time = time.time() 
        processes = []
        try:
            for subnet in self.alive_subnet_list:
                p = Process(target=self.scan_subnet, args=(subnet, ))
                processes.append(p)
                p.start()

            for p in processes:
                p.join()

            total_latency = time.time() - start_time
            self.logging.info(f"scan completed in {total_latency}s")
            return {"success":total_latency}
        except Exception as e:
            return {"error":str(e)}            
