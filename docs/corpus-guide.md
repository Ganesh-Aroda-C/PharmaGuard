# Reference Corpus, Provenance, and Ingestion Guide

## 1. Document Provenance and Authenticity

The reference corpus consists of official, publicly accessible pharmaceutical safety documents:

| Document | Authority / Publisher | Source File | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| **New Drugs & Clinical Trials Rules, 2019** | Central Drugs Standard Control Organisation (CDSCO), MoHFW, India | `ndctr_2019_rules.pdf` | Recorded in `corpus/manifests/corpus_manifest.json` |
| **Pharmacovigilance Guidance for MAHs** | Indian Pharmacopoeia Commission (IPC), PvPI | `ipc_pvpi_guidance_mah.pdf` | Recorded in `corpus/manifests/corpus_manifest.json` |
| **Approved Package Insert: Carbamazepine** | CDSCO / Marketed Product Information (Tegretol) | `carbamazepine_package_insert.pdf` | Recorded in `corpus/manifests/corpus_manifest.json` |

---

## 2. Chunking & Indexing Strategy

1. **Preserving Regulatory Structure:**
   - Instead of naive fixed-character chunking (which cuts legal clauses in half), our ingestion pipeline uses **Regex Clause Segmentation** (`re.compile(r'(\[Clause\s+[^\]]+\]|BOXED WARNING:|CHAPTER|SECTION|RULE)', re.IGNORECASE)`).
   - This ensures that every clause (e.g. `[Clause NDCTR-2019-R67(3)]`, `[Clause IPC-PVPI-G4.1]`, `[Clause CBZ-PI-SEC6.1]`) remains intact with its full regulatory context.
2. **Metadata Attachment:**
   - Every chunk attaches: `chunk_id`, `document_title`, `filename`, `section_or_clause`, `page_number`, `document_type`, `version`, `source_url`.
3. **Local Embedding Generation:**
   - Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional embeddings).
   - Runs 100% locally on CPU without external API charges or network dependencies.
4. **Vector Retrieval:**
   - Stored in a FAISS Inner Product index (`faiss.IndexFlatIP`) with normalized embeddings for exact cosine similarity search.
   - Enhanced with keyword token overlap boosting for exact clause identifiers.

---

## 3. Idempotent CLI Commands

```bash
# Ingest and index reference documents
python -m backend.app.ingestion ingest

# Check index freshness, document versions, and chunk counts
python -m backend.app.ingestion status

# Force complete re-indexing
python -m backend.app.ingestion reindex
```
