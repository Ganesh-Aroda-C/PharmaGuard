import time
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from backend.app.config import settings
from backend.app.guardrails.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException

logger = logging.getLogger(__name__)


class LLMResponse:
    def __init__(
        self,
        content: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        model_name: str = "stub",
        duration_ms: float = 0.0,
        estimated_cost_usd: float = 0.0
    ):
        self.content = content
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.model_name = model_name
        self.duration_ms = duration_ms
        self.estimated_cost_usd = estimated_cost_usd

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "model_name": self.model_name,
            "duration_ms": self.duration_ms,
            "estimated_cost_usd": self.estimated_cost_usd
        }


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1500
    ) -> LLMResponse:
        pass


class DeterministicStubProvider(BaseLLMProvider):
    """
    Deterministic stub provider for development, automated testing, and Locust benchmarks.
    Simulates realistic LLM latency without calling external APIs or incurring cost.
    """
    def __init__(self, delay_seconds: float = None):
        self.delay_seconds = delay_seconds if delay_seconds is not None else settings.LLM_STUB_DELAY_SECONDS
        self.cost_per_1k_prompt = 0.00015
        self.cost_per_1k_completion = 0.00060

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1500
    ) -> LLMResponse:
        start_time = time.time()
        if self.delay_seconds > 0:
            time.sleep(self.delay_seconds)

        prompt_tokens = max(10, len(prompt.split()))
        
        # Provide structured contextual response based on prompt contents
        prompt_lower = prompt.lower()
        if "research" in prompt_lower or "extract" in prompt_lower:
            response_json = {
                "extracted_entities": {
                    "suspect_drug": "Carbamazepine" if "carbamazepine" in prompt_lower else "Unknown",
                    "reaction": "skin peeling badly",
                    "mapped_medical_terms": ["exfoliative dermatitis", "toxic epidermal necrolysis", "stevens-johnson syndrome"],
                    "timing_sequence": "1 week after drug initiation",
                    "hospitalized": True if "hospital" in prompt_lower else False,
                    "demographics": "adult"
                },
                "search_queries": [
                    "Carbamazepine approved package insert adverse reactions",
                    "NDCTR 2019 Rule 67 serious adverse event hospitalization",
                    "IPC PvPI guidance severe cutaneous adverse reactions expedited reporting"
                ],
                "recommended_tools": ["search_corpus", "lookup_clause", "search_alternative_terms"]
            }
            content = json.dumps(response_json, indent=2)
        elif "verify" in prompt_lower or "assessment" in prompt_lower:
            response_json = {
                "seriousness_verified": True,
                "expectedness_verified": True,
                "citations_valid": True,
                "reasoning_complete": True,
                "determination_notes": "All claims directly cross-referenced against NDCTR 2019 Rule 67(3) and Carbamazepine Package Insert Section 6.1."
            }
            content = json.dumps(response_json, indent=2)
        else:
            content = "Deterministic verification and reasoning completed based on reference corpus evidence."

        completion_tokens = max(10, len(content.split()))
        duration_ms = (time.time() - start_time) * 1000
        cost = (prompt_tokens / 1000 * self.cost_per_1k_prompt) + (completion_tokens / 1000 * self.cost_per_1k_completion)

        return LLMResponse(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            model_name="deterministic-stub-v1",
            duration_ms=round(duration_ms, 2),
            estimated_cost_usd=round(cost, 6)
        )


class LLMService:
    _instance = None

    def __init__(self):
        self.breaker = CircuitBreaker.get_breaker("llm_provider")
        self._provider = None
        self._init_provider()

    @classmethod
    def get_instance(cls) -> "LLMService":
        if cls._instance is None:
            cls._instance = LLMService()
        return cls._instance

    def _init_provider(self):
        provider_name = settings.LLM_PROVIDER.lower()
        if provider_name == "deterministic_stub":
            self._provider = DeterministicStubProvider(delay_seconds=settings.LLM_STUB_DELAY_SECONDS)
        else:
            # Fallback to stub if external provider not configured or missing keys
            logger.warning(f"Provider '{provider_name}' specified but falling back to DeterministicStubProvider.")
            self._provider = DeterministicStubProvider(delay_seconds=settings.LLM_STUB_DELAY_SECONDS)

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1500
    ) -> LLMResponse:
        """Executes LLM call protected by circuit breaker and bounded exponential retry"""
        def _execute():
            return self._provider.generate(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens
            )

        # Execute through circuit breaker
        retries = 0
        max_retries = settings.LLM_MAX_RETRIES
        delay = 0.2

        while True:
            try:
                return self.breaker.call(_execute)
            except CircuitBreakerOpenException as e:
                logger.error(f"Circuit breaker open: {e}")
                raise e
            except Exception as e:
                retries += 1
                if retries > max_retries:
                    logger.error(f"LLM call exhausted {max_retries} retries: {e}")
                    raise e
                time.sleep(delay)
                delay *= 2.0
