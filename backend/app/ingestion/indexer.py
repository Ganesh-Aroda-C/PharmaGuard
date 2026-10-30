import os
import re
import json
import time
import pickle
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

from backend.app.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.models import CorpusDocumentModel


class CorpusChunk:
    def __init__(
        self,
        chunk_id: str,
        document_title: str,
        filename: str,
        section_or_clause: str,
        page_number: int,
        text: str,
        metadata: Dict[str, Any]
    ):
        self.chunk_id = chunk_id
        self.document_title = document_title
        self.filename = filename
        self.section_or_clause = section_or_clause
        self.page_number = page_number
        self.text = text
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_title": self.document_title,
            "filename": self.filename,
            "section_or_clause": self.section_or_clause,
            "page_number": self.page_number,
            "text": self.text,
            "metadata": self.metadata
        }


class IngestionPipeline:
    def __init__(self):
        self.corpus_dir = Path(settings.CORPUS_DIR)
        self.manifest_dir = Path(settings.MANIFEST_DIR)
        self.index_dir = Path(settings.FAISS_INDEX_DIR)
        self.index_dir.mkdir(parents=True, exist_ok=True)
        
        self.index_file = self.index_dir / "faiss.index"
        self.chunks_file = self.index_dir / "chunks.pkl"
        
        self._embedder = None

    def _get_embedder(self):
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            print(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}...")
            self._embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._embedder

    def calculate_sha256(self, filepath: Path) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    def load_manifest(self) -> Dict[str, Dict[str, Any]]:
        manifest_file = self.manifest_dir / "corpus_manifest.json"
        if not manifest_file.exists():
            return {}
        with open(manifest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["filename"]: item for item in data}

    def extract_text_and_chunks(self, pdf_path: Path, doc_meta: Dict[str, Any]) -> List[CorpusChunk]:
        """Extracts text from PDF using PyMuPDF and creates structured semantic chunks preserving clauses"""
        doc = fitz.open(pdf_path)
        chunks: List[CorpusChunk] = []
        doc_title = doc_meta.get("title", pdf_path.stem)
        filename = pdf_path.name

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            text = page.get_text("text")

            # Fallback for scanned documents if page text is empty
            if not text.strip():
                print(f"Notice: Page {page_num} in {filename} appears empty; checking image layer...")
                text = f"[Scanned page {page_num} - Text extraction empty]"

            # Split by clauses or section headings
            # Matches patterns like [Clause NDCTR-2019-R67(1)], [Clause IPC-PVPI-G4.1], [Clause CBZ-PI-SEC6.1]
            clause_pattern = re.compile(r'(\[Clause\s+[^\]]+\]|BOXED WARNING:[^\n]+|CHAPTER\s+[^\n]+|SECTION\s+[^\n]+|RULE\s+[^\n]+)', re.IGNORECASE)
            
            parts = clause_pattern.split(text)
            current_section = f"General Content - Page {page_num}"
            
            i = 0
            while i < len(parts):
                part = parts[i].strip()
                if not part:
                    i += 1
                    continue
                
                if clause_pattern.match(part):
                    current_section = part
                    body = parts[i+1].strip() if i+1 < len(parts) else ""
                    i += 2
                else:
                    body = part
                    i += 1

                if body:
                    chunk_id = f"{filename}:p{page_num}:c{len(chunks)+1}"
                    chunk = CorpusChunk(
                        chunk_id=chunk_id,
                        document_title=doc_title,
                        filename=filename,
                        section_or_clause=current_section,
                        page_number=page_num,
                        text=f"{current_section}\n{body}",
                        metadata={
                            "document_type": doc_meta.get("document_type", "reference"),
                            "drug_name": doc_meta.get("drug_name"),
                            "publisher": doc_meta.get("publisher"),
                            "version": doc_meta.get("version", "1.0"),
                            "source_url": doc_meta.get("source_url")
                        }
                    )
                    chunks.append(chunk)

        doc.close()
        return chunks

    def ingest_all(self, force_reindex: bool = False) -> Dict[str, Any]:
        """Idempotently processes all documents in corpus/documents and builds vector index"""
        start_time = time.time()
        manifest = self.load_manifest()
        pdf_files = list(self.corpus_dir.glob("*.pdf"))

        if not pdf_files:
            return {
                "status": "error",
                "message": f"No PDF files found in {self.corpus_dir}. Please place reference PDFs there."
            }

        db = SessionLocal()
        all_chunks: List[CorpusChunk] = []
        files_indexed = []
        total_extracted_chunks = 0

        try:
            for pdf_path in pdf_files:
                filename = pdf_path.name
                checksum = self.calculate_sha256(pdf_path)
                meta = manifest.get(filename, {})
                
                # Check DB for existing document
                existing = db.query(CorpusDocumentModel).filter(CorpusDocumentModel.filename == filename).first()
                if existing and existing.sha256_checksum == checksum and not force_reindex:
                    print(f"Document {filename} unchanged (SHA-256 match).")
                else:
                    print(f"Processing and chunking document: {filename}...")

                chunks = self.extract_text_and_chunks(pdf_path, meta)
                all_chunks.extend(chunks)
                total_extracted_chunks += len(chunks)

                if existing:
                    existing.sha256_checksum = checksum
                    existing.chunk_count = len(chunks)
                    existing.metadata_json = meta
                else:
                    new_doc = CorpusDocumentModel(
                        filename=filename,
                        title=meta.get("title", filename),
                        source_url=meta.get("source_url"),
                        version=meta.get("version", "1.0"),
                        sha256_checksum=checksum,
                        chunk_count=len(chunks),
                        metadata_json=meta
                    )
                    db.add(new_doc)
                
                files_indexed.append(filename)

            db.commit()

            # Build FAISS vector index
            print(f"Generating embeddings for {len(all_chunks)} chunks...")
            embedder = self._get_embedder()
            texts = [c.text for c in all_chunks]
            embeddings = embedder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

            dimension = embeddings.shape[1]
            if faiss is not None:
                index = faiss.IndexFlatIP(dimension)  # Inner product for normalized embeddings = cosine similarity
                index.add(embeddings)
                faiss.write_index(index, str(self.index_file))
            else:
                # Numpy fallback if faiss not available
                np.save(str(self.index_dir / "embeddings.npy"), embeddings)

            with open(self.chunks_file, "wb") as f:
                pickle.dump([c.to_dict() for c in all_chunks], f)

            duration = time.time() - start_time
            throughput = len(all_chunks) / duration if duration > 0 else 0.0

            result = {
                "status": "success",
                "files_indexed": files_indexed,
                "total_chunks": len(all_chunks),
                "duration_seconds": round(duration, 3),
                "throughput_chunks_per_sec": round(throughput, 2),
                "index_path": str(self.index_file)
            }
            print(f"Ingestion complete: {result}")
            return result

        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def get_status(self) -> Dict[str, Any]:
        """Returns index freshness, chunk counts, document versions and index statistics"""
        db = SessionLocal()
        try:
            docs = db.query(CorpusDocumentModel).all()
            index_exists = self.index_file.exists() or (self.index_dir / "embeddings.npy").exists()
            chunk_data_exists = self.chunks_file.exists()

            total_chunks = 0
            if chunk_data_exists:
                with open(self.chunks_file, "rb") as f:
                    chunks = pickle.load(f)
                    total_chunks = len(chunks)

            return {
                "index_healthy": index_exists and chunk_data_exists,
                "total_documents": len(docs),
                "total_chunks": total_chunks,
                "embedding_model": settings.EMBEDDING_MODEL_NAME,
                "documents": [
                    {
                        "filename": d.filename,
                        "title": d.title,
                        "version": d.version,
                        "chunk_count": d.chunk_count,
                        "sha256": d.sha256_checksum[:12] + "...",
                        "indexed_at": d.indexed_at.isoformat() if d.indexed_at else None
                    }
                    for d in docs
                ]
            }
        finally:
            db.close()
