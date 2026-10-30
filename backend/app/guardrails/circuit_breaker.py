import time
import threading
from enum import Enum
from typing import Callable, Any, Optional
from backend.app.config import settings


class CircuitState(str, Enum):
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Provider failing, fast-fail / fallback
    HALF_OPEN = "HALF_OPEN"# Testing recovery with a single call


class CircuitBreakerOpenException(Exception):
    """Raised when call is blocked by open circuit breaker"""
    pass


class CircuitBreaker:
    _instances = {}
    _lock = threading.Lock()

    def __init__(
        self,
        name: str = "default_provider",
        failure_threshold: int = None,
        recovery_timeout: float = None
    ):
        self.name = name
        self.failure_threshold = failure_threshold or settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD
        self.recovery_timeout = recovery_timeout or settings.CIRCUIT_BREAKER_RECOVERY_TIMEOUT_SECONDS
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.last_state_change = time.time()
        self.total_trips = 0

    @classmethod
    def get_breaker(cls, name: str = "default_provider") -> "CircuitBreaker":
        with cls._lock:
            if name not in cls._instances:
                cls._instances[name] = CircuitBreaker(name=name)
            return cls._instances[name]

    def call(self, func: Callable, *args, **kwargs) -> Any:
        now = time.time()

        # Check if circuit should transition from OPEN to HALF_OPEN
        if self.state == CircuitState.OPEN:
            if now - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = now
            else:
                raise CircuitBreakerOpenException(
                    f"Circuit breaker '{self.name}' is OPEN. Provider temporarily unavailable. "
                    f"Recovery countdown: {int(self.recovery_timeout - (now - self.last_failure_time))}s remaining."
                )

        try:
            result = func(*args, **kwargs)
            # Success in CLOSED or HALF_OPEN
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.last_state_change = time.time()
            return result
        except Exception as e:
            self._handle_failure(now)
            raise e

    def _handle_failure(self, now: float):
        self.failure_count += 1
        self.last_failure_time = now

        if self.state == CircuitState.HALF_OPEN:
            # Immediate re-trip
            self.state = CircuitState.OPEN
            self.last_state_change = now
            self.total_trips += 1
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.last_state_change = now
            self.total_trips += 1

    def record_manual_failure(self):
        """Allows tests to simulate provider failures"""
        self._handle_failure(time.time())

    def reset(self):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.last_state_change = time.time()

    def get_status(self):
        now = time.time()
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "total_trips": self.total_trips,
            "is_available": self.state != CircuitState.OPEN or (now - self.last_failure_time >= self.recovery_timeout),
            "recovery_timeout_sec": self.recovery_timeout,
            "last_state_change": self.last_state_change
        }
