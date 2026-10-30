from typing import Dict, Any, List, Tuple, Optional
from backend.app.schemas.report import ReportingRoute


class DecisionEngine:
    RULE_VERSION = "1.0.0-ndctr2019-ipc"

    @classmethod
    def evaluate_seriousness(cls, report_fields: Dict[str, Any]) -> Tuple[bool, List[str], str]:
        """
        Evaluates seriousness strictly against IPC PvPI Guidance G4.1 criteria:
        1. Death
        2. Inpatient hospitalization or prolongation
        3. Life-threatening
        4. Persistent or significant disability/incapacity
        5. Congenital anomaly
        6. Other medically important event
        """
        criteria_met = []

        if report_fields.get("is_death") or report_fields.get("outcome") == "fatal":
            criteria_met.append("Death (IPC-PVPI-G4.1 / NDCTR Rule 67)")

        if report_fields.get("is_hospitalized") or report_fields.get("hospitalization_admission_date"):
            criteria_met.append("Inpatient Hospitalization (IPC-PVPI-G4.1 / NDCTR Rule 67)")

        if report_fields.get("is_life_threatening"):
            criteria_met.append("Life-Threatening Condition (IPC-PVPI-G4.1)")

        if report_fields.get("is_disability"):
            criteria_met.append("Persistent Disability / Incapacity (IPC-PVPI-G4.1)")

        if report_fields.get("is_congenital_anomaly"):
            criteria_met.append("Congenital Anomaly / Birth Defect (IPC-PVPI-G4.1)")

        if report_fields.get("is_other_medically_important"):
            criteria_met.append("Other Medically Important Event (IPC-PVPI-G4.1)")

        is_serious = len(criteria_met) > 0
        if is_serious:
            rationale = f"Event satisfies statutory seriousness criteria under IPC-PVPI-G4.1: {', '.join(criteria_met)}."
        else:
            rationale = "Event does not meet any statutory seriousness criteria (no death, hospitalization, disability, or life-threatening outcome reported)."

        return is_serious, criteria_met, rationale

    @classmethod
    def evaluate_expectedness(
        cls,
        suspect_drug: str,
        matched_medical_terms: List[str],
        retrieved_pi_chunks: List[Dict[str, Any]]
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Evaluates expectedness against approved package insert text.
        Returns: (is_expected, rationale, matching_clause_id)
        """
        if not retrieved_pi_chunks:
            return (
                False,
                f"No approved package insert passages found in reference corpus for drug '{suspect_drug}'. Cannot confirm expectedness.",
                None
            )

        # Check if any matched medical term appears in package insert chunks
        for chunk in retrieved_pi_chunks:
            text_lower = chunk["text"].lower()
            for term in matched_medical_terms:
                term_lower = term.lower()
                if term_lower in text_lower:
                    clause = chunk.get("section_or_clause", "Package Insert Adverse Reactions")
                    return (
                        True,
                        f"Reaction '{term}' is documented and listed in approved Package Insert under {clause}.",
                        chunk["chunk_id"]
                    )

        # If medical terms weren't found in PI chunks
        return (
            False,
            f"Reported reaction ({', '.join(matched_medical_terms) if matched_medical_terms else 'unmatched'}) is not listed in the approved Product Information for '{suspect_drug}'. Classified as Unexpected.",
            None
        )

    @classmethod
    def determine_reporting_route(
        cls,
        is_serious: bool,
        is_expected: bool,
        is_hospitalized: bool,
        has_scar_symptoms: bool,
        has_corpus_evidence: bool,
        is_timing_valid: bool
    ) -> Tuple[ReportingRoute, Optional[int], List[str], str]:
        """
        Determines the regulatory reporting stream grounded in NDCTR 2019 and IPC Guidance:
        
        Modifying Provisions:
        - Clause NDCTR-2019-R67(3) & IPC-PVPI-G5.2.4: Severe Cutaneous Adverse Reaction (SCAR) / skin peeling with hospitalization
          mandates Expedited Report within 14 days, regardless of package insert listedness.
        - Standard Rules:
          - Serious + Unexpected -> Expedited Report within 14 days (NDCTR Rule 67(1), IPC-PVPI-G5.1(a)).
          - Serious + Expected (no modifier) -> Periodic Safety Report (NDCTR Rule 68(4), IPC-PVPI-G5.1(b)).
          - Non-Serious -> Periodic Safety Report / Non-Reportable (NDCTR Rule 68(4)).
        - Escalation Triggers:
          - Missing corpus evidence or invalid timing -> Human Review Required (IPC-PVPI-G7.1).
        """
        modifying_provisions = []

        # Check escalation first
        if not has_corpus_evidence:
            return (
                ReportingRoute.HUMAN_REVIEW_REQUIRED,
                None,
                [],
                "Drug or reaction falls outside indexed corpus reference documents. Escalated to Qualified Person for Pharmacovigilance pursuant to IPC-PVPI-G7.1."
            )

        if not is_timing_valid:
            return (
                ReportingRoute.HUMAN_REVIEW_REQUIRED,
                None,
                [],
                "Event onset timing is ambiguous, contradictory, or biologically implausible relative to treatment dates. Escalated under IPC-PVPI-G7.1."
            )

        # Check special SCAR + Hospitalization modifier (Critical Case 4.1)
        if is_serious and has_scar_symptoms and is_hospitalized:
            modifying_provisions.append("NDCTR-2019-R67(3) - Special Regulatory Modifier for Acute Hospitalization & SCAR")
            modifying_provisions.append("IPC-PVPI-G5.2.4 - Special Safety Override for Severe Cutaneous Adverse Reactions")
            return (
                ReportingRoute.EXPEDITED_REPORT,
                14,
                modifying_provisions,
                "Mandatory Expedited Safety Report within 14 calendar days. Although cutaneous reactions may be catalogued in the package insert, acute hospital admission with severe cutaneous manifestations (skin peeling / epidermal necrolysis) triggers emergency expedited reporting under NDCTR 2019 Rule 67(3) and IPC Guidance Clause 5.2.4."
            )

        # Standard Serious & Unexpected
        if is_serious and not is_expected:
            modifying_provisions.append("NDCTR-2019-R67(1) - Reporting of Serious Unexpected Adverse Events")
            modifying_provisions.append("IPC-PVPI-G5.1(a) - Expedited Reporting of Serious Unexpected ADRs")
            return (
                ReportingRoute.EXPEDITED_REPORT,
                14,
                modifying_provisions,
                "Expedited Report within 14 calendar days required. Adverse reaction is serious and unexpected (unlisted in approved product documentation), satisfying statutory criteria under NDCTR 2019 Rule 67(1) and IPC-PVPI-G5.1(a)."
            )

        # Serious & Expected without special modifier
        if is_serious and is_expected:
            modifying_provisions.append("NDCTR-2019-R68(4) - Routine Periodic Safety Reporting for Listed Serious Events")
            modifying_provisions.append("IPC-PVPI-G5.1(b) - Periodic Safety Update Reporting")
            return (
                ReportingRoute.PERIODIC_SAFETY_REPORT,
                None,
                modifying_provisions,
                "Periodic Safety Report (PSUR / PBRER) stream. Reaction is serious but catalogued in the approved package insert and does not trigger special emergency regulatory modifiers. Documented for routine periodic safety reporting under NDCTR 2019 Rule 68(4)."
            )

        # Non-serious
        modifying_provisions.append("NDCTR-2019-R68(4) - Non-Serious Adverse Event Handling")
        return (
            ReportingRoute.PERIODIC_SAFETY_REPORT,
            None,
            modifying_provisions,
            "Periodic Safety Report stream. Adverse event is non-serious; documented for routine pharmacovigilance surveillance per NDCTR 2019 Rule 68(4)."
        )
