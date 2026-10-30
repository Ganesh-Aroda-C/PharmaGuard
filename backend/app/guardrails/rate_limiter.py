import time
from collections import defaultdict
from typing import Dict, Tuple
from backend.app.config import settings


class ClientRateLimiter:
    def __init__(self, requests_per_minute: int = None):
        self.rpm = requests_per_minute or settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        self.client_requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, client_id: str) -> Tuple[bool, int]:
        """
        Sliding window rate limit check.
        Returns: (is_allowed, remaining_requests_in_window)
        """
        now = time.time()
        window_start = now - 60.0

        # Clean old timestamps
        timestamps = [t for t in self.client_requests[client_id] if t > window_start]
        self.client_requests[client_id] = timestamps

        if len(timestamps) >= self.rpm:
            return False, 0

        self.client_requests[client_id].append(now)
        remaining = max(0, self.rpm - len(self.client_requests[client_id]))
        return True, remaining


rate_limiter = ClientRateLimiter()
