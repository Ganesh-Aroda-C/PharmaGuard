import React, { useEffect, useState } from 'react';
import { Cpu, Clock, DollarSign, Database, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function TraceInspector({ runId }) {
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState(0);

  useEffect(() => {
    if (runId) {
      loadTrace(runId);
    }
  }, [runId]);

  const loadTrace = async (id) => {
    setLoading(true);
    try {
      const data = await api.getRunTrace(id);
      setTraceData(data);
    } catch (e) {
      console.error('Error loading trace:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!runId) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        <Cpu className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No Run Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select an active or completed run from the dashboard or results page to view its step-by-step trace.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-2" />
        <p className="text-xs font-semibold text-slate-700">Loading multi-agent execution trace...</p>
      </div>
    );
  }

  if (!traceData) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
        Trace not found for run ID: <span className="font-mono">{runId}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Trace Overview Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Execution Trace & Agent Hand-Off Timeline</h2>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 mt-1">
              <span>Run ID: {traceData.run_id}</span>
              <span>&bull;</span>
              <span>Correlation: {traceData.correlation_id}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              Prompt: {traceData.prompt_version}
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              Rules: {traceData.rule_version}
            </span>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block">Total Latency:</span>
            <span className="font-bold text-slate-800 font-mono">
              {traceData.total_duration_ms ? `${(traceData.total_duration_ms / 1000).toFixed(2)}s` : '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Tokens:</span>
            <span className="font-bold text-slate-800 font-mono">
              {(traceData.total_prompt_tokens || 0) + (traceData.total_completion_tokens || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Estimated Spend:</span>
            <span className="font-bold text-emerald-600 font-mono">
              ${(traceData.total_cost_usd || 0).toFixed(6)} USD
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Execution Steps:</span>
            <span className="font-bold text-sky-600 font-mono">{traceData.step_count}</span>
          </div>
        </div>
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-4">
        {(traceData.steps || []).map((step, idx) => {
          const isExpanded = expandedStep === idx;
          const isAgentA = step.agent_name.includes('Agent A');

          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : idx)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isAgentA ? 'bg-sky-100 text-sky-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {step.step_index}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{step.step_name}</div>
                    <div className="text-[11px] text-slate-500">{step.agent_name}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-mono text-slate-500">{step.duration_ms}ms</span>
                  {step.tool_calls && step.tool_calls.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                      {step.tool_calls.length} Tool Call{step.tool_calls.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                  {/* Tool Invocations */}
                  {step.tool_calls && step.tool_calls.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Dynamic Tool Calls:</span>
                      <div className="space-y-1.5">
                        {step.tool_calls.map((tc, tcIdx) => (
                          <div key={tcIdx} className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px]">
                            <div className="text-sky-700 font-bold">{tc.tool_name}()</div>
                            <div className="text-slate-600 mt-1">Args: {JSON.stringify(tc.arguments || {})}</div>
                            {tc.result_count !== undefined && (
                              <div className="text-slate-500 text-[10px]">Results: {tc.result_count} items ({tc.duration_ms}ms)</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Output Summary */}
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Output State / Intermediate Findings:</span>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(step.output_payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
