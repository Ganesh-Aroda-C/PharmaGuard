import React, { useState } from 'react';
import { 
  Settings, Database, Cpu, ShieldAlert, CheckCircle2, 
  RefreshCw, ExternalLink, Activity, AlertTriangle, FileCode 
} from 'lucide-react';
import { api } from '../api/client';

export default function SettingsPage({ circuitStatus, corpusStatus, onRefreshStatus }) {
  const [resettingBreaker, setResettingBreaker] = useState(false);
  const [triggeringEval, setTriggeringEval] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleResetBreaker = async () => {
    setResettingBreaker(true);
    try {
      await api.resetCircuitBreaker();
      setActionMessage({ type: 'success', text: 'Circuit breaker has been reset to CLOSED state.' });
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to reset breaker: ${err.message}` });
    } finally {
      setResettingBreaker(false);
    }
  };

  const handleSimulateFailure = async () => {
    try {
      await api.simulateCircuitBreakerFailure();
      setActionMessage({ type: 'warning', text: 'Simulated failure recorded. Threshold checks triggered.' });
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to simulate failure: ${err.message}` });
    }
  };

  const handleTriggerEval = async () => {
    setTriggeringEval(true);
    try {
      const res = await api.triggerEvaluation('v1');
      setActionMessage({ 
        type: 'success', 
        text: `Benchmark run completed! Accuracy: ${(res.accuracy_score * 100).toFixed(1)}% (${res.total_cases} golden cases evaluated).` 
      });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Evaluation run error: ${err.message}` });
    } finally {
      setTriggeringEval(false);
    }
  };

  const breakerState = circuitStatus?.state || 'CLOSED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings &amp; Configuration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Architectural parameters, regulatory rule engine versions, vector indices, and operational controls
        </p>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          actionMessage.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-semibold underline ml-3">Dismiss</button>
        </div>
      )}

      {/* Grid of Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Information */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Settings className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">System Information</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Service Version:</span>
              <span className="font-semibold text-slate-800">PharmaGuard v2.4 (Enterprise)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Backend Framework:</span>
              <span className="font-semibold text-slate-800">FastAPI 0.115 (Python 3.13)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Agent Framework:</span>
              <span className="font-semibold text-slate-800">LangGraph 0.2 Multi-Agent StateGraph</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Declared Target SLO:</span>
              <span className="font-semibold text-emerald-700">&le; 30.0s (p95)</span>
            </div>
          </div>
        </div>

        {/* Model Provider & Vector Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Model &amp; Retrieval Engine</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Decision Engine:</span>
              <span className="font-semibold text-slate-800">Deterministic Clinical Engine</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Dense Embedding Model:</span>
              <span className="font-mono text-slate-800">all-MiniLM-L6-v2 (384-dim)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Vector Store Provider:</span>
              <span className="font-semibold text-slate-800">FAISS IndexFlatIP (Local CPU)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Index Status:</span>
              <span className="font-semibold text-emerald-700">Healthy &amp; Grounded</span>
            </div>
          </div>
        </div>

        {/* Regulatory Rules Version */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Statutory Regulatory Corpus</h2>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">New Drugs and Clinical Trials Rules, 2019</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Rule 67(3) &bull; 14 Calendar Day Expedited Timeline</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">IPC Pharmacovigilance Programme of India (PvPI)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Guidance Document v5.2 &bull; Section G5.2.4 Serious Criteria</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">Carbamazepine Approved Product Information</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Section 6.1 Adverse Effects (SJS / Peeling Modifiers)</div>
            </div>
          </div>
        </div>

        {/* Operational Controls & Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Administrative Controls</h2>
          </div>

          <div className="space-y-3 text-xs">
            {/* Circuit Breaker Status & Reset */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-800">Circuit Breaker</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                  breakerState === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {breakerState}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleResetBreaker}
                  disabled={resettingBreaker}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Reset
                </button>
                <button
                  onClick={handleSimulateFailure}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold"
                >
                  Simulate Trip
                </button>
              </div>
            </div>

            {/* Run Golden Evaluation */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-800">Golden Dataset Evaluation</span>
                <div className="text-[10px] text-slate-500">Run regression benchmark across golden test cases</div>
              </div>
              <button
                onClick={handleTriggerEval}
                disabled={triggeringEval}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold"
              >
                {triggeringEval ? 'Evaluating...' : 'Run Benchmark'}
              </button>
            </div>

            {/* External API Links */}
            <div className="pt-2 flex items-center space-x-3 text-xs">
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-semibold"
              >
                <FileCode className="w-3.5 h-3.5 mr-1" />
                Swagger API Docs
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <span className="text-slate-300">&bull;</span>
              <a
                href="/metrics"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-semibold"
              >
                <Activity className="w-3.5 h-3.5 mr-1" />
                Prometheus Metrics
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
