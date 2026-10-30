import re
from typing import Tuple, List

# Patterns targeting prompt injection, jailbreaks, system instruction overrides
INJECTION_PATTERNS = [
    r'ignore\s+(all\s+)?(previous|prior|above)\s+instructions',
    r'disregard\s+(all\s+)?(previous|prior|above)\s+instructions',
    r'system\s+prompt\s+override',
    r'you\s+are\s+now\s+a\s+(dan|jailbroken|unrestricted)',
    r'bypass\s+(safety|regulatory|compliance)\s+rules',
    r'reveal\s+(internal|system)\s+prompt',
    r'format\s+as\s+json\s+with\s+always\s+non-reportable',
    r'do\s+not\s+cite\s+any\s+documents',
    r'always\s+classify\s+as\s+(expedited|non-reportable)',
    r'base64\s+decode\s+this',
    r'<\s*script\s*>',
    r'exec\s*\(',
    r'__import__\s*\('
]

TOXICITY_PATTERNS = [
    r'\b(kill\s+yourself|hate\s+speech|racial\s+slur)\b'
]


class GuardrailEngine:
    @classmethod
    def inspect_text_input(cls, text: str) -> Tuple[bool, List[str]]:
        """
        Scans free-text fields (reaction descriptions, medical history) for prompt injection attempts.
        Returns: (is_safe, reasons)
        """
        if not text:
            return True, []

        reasons = []
        text_lower = text.lower()

        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                reasons.append(f"Detected suspicious prompt injection pattern: '{pattern}'")

        for pattern in TOXICITY_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                reasons.append(f"Detected toxic content pattern: '{pattern}'")

        is_safe = len(reasons) == 0
        return is_safe, reasons

    @classmethod
    def sanitize_untrusted_text(cls, text: str) -> str:
        """Sanitizes text by neutralizing potential prompt escape sequences"""
        if not text:
            return ""
        sanitized = text.replace("```", "'''")
        sanitized = re.sub(r'[\r\n]{3,}', '\n\n', sanitized)
        return sanitized.strip()
