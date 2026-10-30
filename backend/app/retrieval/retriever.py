import os
import re
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

from backend.app.config import settings


class CorpusRetriever:
    _instance = None

    def __init__(self):
        self.index_dir = Path(settings.FAISS_INDEX_DIR)
        self.index_file = self.index_dir / "faiss.index"
        self.chunks_file = self.index_dir / "chunks.pkl"
        
        self.chunks: List[Dict[str, Any]] = []
        self.faiss_index = None
        self.embeddings = None
        self._embedder = None
        
        self._load_index()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = CorpusRetriever()
        return cls._instance

    def _get_embedder(self):
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._embedder

    def _load_index(self):
        if not self.chunks_file.exists():
            return
        
        with open(self.chunks_file, "rb") as f:
            self.chunks = pickle.load(f)

        if self.index_file.exists() and faiss is not None:
            self.faiss_index = faiss.read_index(str(self.index_file))
        elif (self.index_dir / "embeddings.npy").exists():
            self.embeddings = np.load(str(self.index_dir / "embeddings.npy"))

    def reload(self):
        self._load_index()

    def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """Semantic + keyword hybrid search over indexed corpus with filtering"""
        if not self.chunks:
            self._load_index()
        if not self.chunks:
            return []

        # 1. Hybrid keyword scoring
        query_lower = query.lower()
        query_tokens = set(re.findall(r'\b[a-z0-9_-]+\b', query_lower))

        # 2. Dense semantic scoring
        embedder = self._get_embedder()
        q_vec = embedder.encode([query], convert_to_numpy=True, normalize_embeddings=True)

        if self.faiss_index is not None:
            scores, indices = self.faiss_index.search(q_vec, min(top_k * 3, len(self.chunks)))
            candidate_indices = indices[0]
            dense_scores = scores[0]
        elif self.embeddings is not None:
            sims = np.dot(self.embeddings, q_vec.T).flatten()
            candidate_indices = np.argsort(sims)[::-1][:min(top_k * 3, len(self.chunks))]
            dense_scores = sims[candidate_indices]
        else:
            candidate_indices = list(range(min(len(self.chunks), top_k * 3)))
            dense_scores = [0.5] * len(candidate_indices)

        results = []
        for rank, idx in enumerate(candidate_indices):
            if idx < 0 or idx >= len(self.chunks):
                continue
            chunk = self.chunks[idx]

            # Apply filters if provided
            if filters:
                doc_type = filters.get("document_type")
                if doc_type and chunk["metadata"].get("document_type") != doc_type:
                    continue
                drug_name = filters.get("drug_name")
                if drug_name and chunk["metadata"].get("drug_name") and chunk["metadata"].get("drug_name").lower() != drug_name.lower():
                    continue

            # Compute keyword overlap boost
            text_lower = chunk["text"].lower()
            overlap_count = sum(1 for tok in query_tokens if tok in text_lower)
            keyword_boost = min(overlap_count * 0.05, 0.25)
            combined_score = float(dense_scores[rank]) + keyword_boost

            results.append({
                "chunk_id": chunk["chunk_id"],
                "document_title": chunk["document_title"],
                "filename": chunk["filename"],
                "section_or_clause": chunk["section_or_clause"],
                "page_number": chunk["page_number"],
                "score": round(combined_score, 4),
                "text": chunk["text"],
                "metadata": chunk["metadata"]
            })

        # Sort by combined score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def lookup_clause(self, clause_identifier: str) -> Optional[Dict[str, Any]]:
        """Direct lookup of a specific regulatory provision or clause identifier"""
        if not self.chunks:
            self._load_index()

        cleaned_id = clause_identifier.strip().lower()
        # Look for clause in section_or_clause or text
        for chunk in self.chunks:
            sec_lower = chunk["section_or_clause"].lower()
            text_lower = chunk["text"].lower()
            if cleaned_id in sec_lower or f"[{cleaned_id}" in text_lower or f"clause {cleaned_id}" in text_lower:
                return {
                    "chunk_id": chunk["chunk_id"],
                    "document_title": chunk["document_title"],
                    "filename": chunk["filename"],
                    "section_or_clause": chunk["section_or_clause"],
                    "page_number": chunk["page_number"],
                    "score": 1.0,
                    "text": chunk["text"],
                    "metadata": chunk["metadata"]
                }
        return None
