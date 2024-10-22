import logging

def setup_logger():
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    fmt = "[%(asctime)s:%(filename)s:%(lineno)s:%(funcName)s:%(levelname)s] %(message)s"
    logging.basicConfig(filename="camera_discovery.log", level=logging.INFO, format=fmt)

    logger = logging.getLogger(__name__)

    return logger
