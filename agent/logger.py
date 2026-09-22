import logging

def get_logger(name: str = "agent") -> logging.Logger:
    """Return a configured logger that writes to stdout.

    The logger uses a concise format:
        [LEVEL] timestamp - message
    Secrets are never logged.
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger
