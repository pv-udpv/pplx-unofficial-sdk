"""Logging utilities."""

import logging
import sys


def get_logger(name: str, level: int | None = None) -> logging.Logger:
    """Get a configured logger instance.

    Args:
        name: Logger name
        level: Optional logging level (defaults to INFO)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.setLevel(level or logging.INFO)
    return logger
