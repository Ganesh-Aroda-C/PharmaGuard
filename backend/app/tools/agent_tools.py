import re
from typing import List, Dict, Any, Optional
from backend.app.retrieval.retriever import CorpusRetriever
from backend.app.retrieval.synonyms import search_alternative_medical_terms
from backend.app.database.session import SessionLocal
from backend.app.database.models import AdverseEventReportModel, AgentRunModel


def tool_search_corpus(query: str, filters: Optional[Dict[str, Any]] = None, top_k: int = 4) -> List[Dict[str, Any]]:
    """Tool: semantic and keyword search over indexed reference corpus"""
    retriever = CorpusRetriever.get_instance()
    results = retriever.search(query=query, filters=filters, top_k=top_k)
    return results


def tool_lookup_clause(clause_id: str) -> Optional[Dict[str, Any]]:
    """Tool: retrieve specific regulatory provision or indexed reference section by clause ID"""
    retriever = CorpusRetriever.get_instance()
    result = retriever.lookup_clause(clause_identifier=clause_id)
    return result


def tool_get_report_fields(run_id_or_case_id: str) -> Dict[str, Any]:
    """Tool: retrieve original validated report fields from database"""
    db = SessionLocal()
    try:
        # Try finding by run_id first
        run = db.query(AgentRunModel).filter(AgentRunModel.id == run_id_or_case_id).first()
        if run and run.report:
            rep = run.report
        else:
            rep = db.query(AdverseEventReportModel).filter(
                (AdverseEventReportModel.case_id == run_id_or_case_id) |
                (AdverseEventReportModel.id == run_id_or_case_id)
            ).first()

        if not rep:
            return {"error": f"Report not found for identifier: {run_id_or_case_id}"}

        return {
            "case_id": rep.case_id,
            "suspect_drug": rep.suspect_drug,
            "product_identifier": rep.product_identifier,
            "reaction_description": rep.reaction_description,
            "patient_age": rep.patient_age,
            "patient_sex": rep.patient_sex,
            "drug_start_date": rep.drug_start_date,
            "drug_stop_date": rep.drug_stop_date,
            "event_onset_date": rep.event_onset_date,
            "onset_relative_days": rep.onset_relative_days,
            "is_death": rep.is_death,
            "is_hospitalized": rep.is_hospitalized,
            "is_life_threatening": rep.is_life_threatening,
            "is_disability": rep.is_disability,
            "is_congenital_anomaly": rep.is_congenital_anomaly,
            "is_other_medically_important": rep.is_other_medically_important,
            "outcome": rep.outcome,
            "reporter_type": rep.reporter_type,
            "source_type": rep.source_type,
            "medical_history": rep.medical_history,
            "concomitant_medications": rep.concomitant_medications
        }
    finally:
        db.close()


def tool_search_alternative_terms(terms: str) -> List[Dict[str, Any]]:
    """Tool: search synonyms, lay terminology, and standardized medical terminology"""
    return search_alternative_medical_terms(terms)


def tool_verify_citations(
    claims: List[Dict[str, Any]],
    retrieved_chunks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Tool: Verify every claim and citation against retrieved corpus passages.
    Every citation must resolve to real text from an indexed chunk.
    Rejects unsupported conclusions.
    """
    chunk_map = {c["chunk_id"]: c for c in retrieved_chunks}
    verified_citations = []
    unverified_claims = []

    for claim in claims:
        chunk_id = claim.get("chunk_id")
        quoted_text = claim.get("quoted_text", "").strip()
        claim_statement = claim.get("claim", "")

        if not chunk_id or chunk_id not in chunk_map:
            unverified_claims.append({
                "claim": claim_statement,
                "reason": f"Chunk ID '{chunk_id}' not found in retrieved evidence set."
            })
            continue

        chunk = chunk_map[chunk_id]
        chunk_text = chunk["text"]

        # Check if quoted text or core words actually exist in chunk
        if quoted_text:
            # Normalize whitespace
            norm_quote = re.sub(r'\s+', ' ', quoted_text.lower())
            norm_chunk = re.sub(r'\s+', ' ', chunk_text.lower())
            
            # Substring match or high overlap check
            if norm_quote in norm_chunk or any(phrase in norm_chunk for phrase in norm_quote.split(". ") if len(phrase) > 15):
                verified_citations.append({
                    "citation_id": f"CIT-{len(verified_citations)+1:03d}",
                    "chunk_id": chunk_id,
                    "document_title": chunk["document_title"],
                    "section_or_clause": chunk["section_or_clause"],
                    "page_number": chunk.get("page_number"),
                    "quoted_text": quoted_text,
                    "relevance_rationale": claim.get("rationale", "Direct regulatory or clinical support"),
                    "verified": True
                })
            else:
                unverified_claims.append({
                    "claim": claim_statement,
                    "reason": f"Quoted text not found verbatim or near-verbatim in chunk {chunk_id}."
                })
        else:
            # No quote provided
            unverified_claims.append({
                "claim": claim_statement,
                "reason": "Citation missing required supporting quote."
            })

    all_verified = len(unverified_claims) == 0 and len(verified_citations) > 0

    return {
        "all_verified": all_verified,
        "verified_citations": verified_citations,
        "unverified_claims": unverified_claims,
        "total_claims": len(claims),
        "verified_count": len(verified_citations)
    }
