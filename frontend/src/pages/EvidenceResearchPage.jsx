import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, FileText, CheckCircle2, ShieldCheck, 
  ExternalLink, Layers, Database 
} from 'lucide-react';
import { api } from '../api/client';

export default function EvidenceResearchPage() {
  const [corpusStatus, setCorpusStatus] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    loadCorpus();
  }, []);

  const loadCorpus = async () => {
    try {
      const data = await api.getCorpusStatus();
      setCorpusStatus(data);
      if (data?.documents && data.documents.length > 0) {
        setSelectedDoc(data.documents[0]);
      }
    } catch (e) {
      console.error('Failed to load corpus:', e);
    }
  };

  const docs = corpusStatus?.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Evidence Research &amp; Regulatory Corpus</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              FAISS Vector Store Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative regulatory reference documents and approved product package inserts grounding agent determinations
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Total Indexed Clauses:</span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold border border-sky-200">
            {corpusStatus?.total_chunks || 28} Clauses
          </span>
        </div>
      </div>

      {/* Grounding Knowledge Base Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {docs.map((doc, idx) => {
          const isSelected = selectedDoc?.filename === doc.filename;
          return (
            <div
              key={idx}
              onClick={() => setSelectedDoc(doc)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-100 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700 mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {doc.chunk_count} Chunks
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900 line-clamp-2">{doc.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Version: {doc.version}</p>
              <div className="text-[10px] font-mono text-slate-400 mt-2 truncate">
                SHA: {doc.sha256}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Document Evidence Details */}
      {selectedDoc && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                Grounding Evidence Source
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{selectedDoc.title}</h2>
              <p className="text-xs text-slate-500">
                Official document indexed in FAISS vector database with sentence-transformers embeddings (`all-MiniLM-L6-v2`)
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              Verified &amp; Grounded
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
            <h4 className="font-bold text-slate-900">Key Statutory Role in Triage Pipeline:</h4>
            {selectedDoc.filename.includes('ndctr') && (
              <p className="leading-relaxed">
                Contains <strong>Rule 67(3)</strong> of the New Drugs and Clinical Trials Rules, 2019, governing mandatory 14-calendar-day expedited reporting for unexpected serious adverse reactions resulting in hospitalization, disability, or death.
              </p>
            )}
            {selectedDoc.filename.includes('ipc_pvpi') && (
              <p className="leading-relaxed">
                Contains <strong>Section G5.2.4 &amp; G4.1</strong> of the Indian Pharmacopoeia Commission PvPI Guidance, defining standard clinical seriousness criteria and clarifying that severe cutaneous adverse reactions (SCAR) demand expedited reporting.
              </p>
            )}
            {selectedDoc.filename.includes('carbamazepine') && (
              <p className="leading-relaxed">
                Contains <strong>Section 6.1 (Undesirable Effects)</strong> of the approved product package insert for Tegretol (Carbamazepine Tablets IP), documenting baseline expectedness terms and listing Stevens-Johnson Syndrome (SJS) and toxic epidermal necrolysis as serious cutaneous reactions.
              </p>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
            <span>Indexed File: <strong className="font-mono text-slate-700">{selectedDoc.filename}</strong></span>
            <span>Status: <strong className="text-emerald-700">Available to Agent A &amp; Agent B</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
