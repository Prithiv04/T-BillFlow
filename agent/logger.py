import logging
import sys

class DynamicStdoutHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            sys.stdout.write(msg + "\n")
            sys.stdout.flush()
        except Exception:
            self.handleError(record)

def get_logger(name: str = "agent") -> logging.Logger:
    """Return a configured logger that writes to stdout.

    The logger uses a concise format:
        [LEVEL] timestamp - message
    Secrets are never logged.
    """
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.setLevel(logging.INFO)
    handler = DynamicStdoutHandler()
    formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger
