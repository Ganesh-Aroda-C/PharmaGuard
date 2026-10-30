import re
from typing import List, Dict, Any

# Standardized MedDRA and Pharmacovigilance Lay-to-Medical Terminology Mapping
SYNONYM_DICTIONARY = {
    "skin peeling": [
        "exfoliative dermatitis",
        "toxic epidermal necrolysis",
        "stevens-johnson syndrome",
        "epidermal detachment",
        "lyell's syndrome",
        "severe cutaneous adverse reactions"
    ],
    "skin peeling badly": [
        "exfoliative dermatitis",
        "toxic epidermal necrolysis",
        "stevens-johnson syndrome",
        "epidermal necrolysis",
        "desquamation"
    ],
    "skin shedding": [
        "exfoliative dermatitis",
        "toxic epidermal necrolysis",
        "desquamation"
    ],
    "blistering": [
        "stevens-johnson syndrome",
        "bullous dermatitis",
        "erythema multiforme",
        "epidermal detachment"
    ],
    "rash": [
        "maculopapular rash",
        "erythematous rash",
        "urticaria",
        "pruritic rash",
        "dermatitis"
    ],
    "yellow skin": [
        "jaundice",
        "hyperbilirubinemia",
        "hepatic dysfunction",
        "hepatitis"
    ],
    "turning yellow": [
        "jaundice",
        "acute hepatic necrosis",
        "cholestasis"
    ],
    "cannot breathe": [
        "dyspnea",
        "bronchospasm",
        "anaphylactic shock",
        "angioedema"
    ],
    "swelling face": [
        "angioedema",
        "facial edema",
        "anaphylactoid reaction"
    ],
    "dizziness": [
        "vertigo",
        "ataxia",
        "presyncope",
        "somnolence"
    ],
    "sleepy": [
        "somnolence",
        "sedation",
        "fatigue",
        "drowsiness"
    ],
    "shaking": [
        "tremor",
        "ataxia",
        "involuntary movements"
    ],
    "bruising": [
        "thrombocytopenia",
        "aplastic anemia",
        "purpura",
        "coagulopathy"
    ],
    "stomach pain": [
        "abdominal distress",
        "gastritis",
        "nausea",
        "vomiting",
        "gastric irritation"
    ]
}


def search_alternative_medical_terms(query_or_phrase: str) -> List[Dict[str, Any]]:
    """Identifies lay terminology in patient report and maps to clinical terms"""
    phrase_lower = query_or_phrase.lower()
    matched_results = []

    for lay_term, medical_synonyms in SYNONYM_DICTIONARY.items():
        if lay_term in phrase_lower:
            matched_results.append({
                "lay_term": lay_term,
                "medical_terms": medical_synonyms,
                "clinical_category": "Adverse Reaction Terminology (MedDRA Equivalent)"
            })

    # If no exact match, tokenize and check partials
    if not matched_results:
        tokens = re.findall(r'\b[a-z]{4,}\b', phrase_lower)
        for tok in tokens:
            for lay_term, medical_synonyms in SYNONYM_DICTIONARY.items():
                if tok in lay_term:
                    matched_results.append({
                        "lay_term": lay_term,
                        "medical_terms": medical_synonyms,
                        "clinical_category": "Partial Match"
                    })
                    break

    return matched_results
