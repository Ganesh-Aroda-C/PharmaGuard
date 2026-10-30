import React, { useState } from 'react';
import { Activity, ShieldAlert, Cpu, AlertTriangle, RefreshCw, ExternalLink, Zap } from 'lucide-react';
import { api } from '../api/client';

export default function ObservabilityPage({ circuitStatus, onRefreshStatus, stats }) {
  const [acting, setActing] = useState(false);

  const handleSimulateFailure = async () => {
    setActing(true);
    try {
      await api.simulateCircuitBreakerFailure();
      await onRefreshStatus();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setActing(false);
    }
  };

  const handleReset = async () => {
    setActing(true);
    try {
      await api.resetCircuitBreaker();
      await onRefreshStatus();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setActing(false);
    }
  };

  const breakerState = circuitStatus?.state || 'CLOSED';
  const breakerColor = breakerState === 'CLOSED' ? 'text-emerald-700 bg-emerald-50 border-emerald-300' :
                       breakerState === 'HALF_OPEN' ? 'text-amber-700 bg-amber-50 border-amber-300' :
                       'text-rose-700 bg-rose-50 border-rose-300';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">System Observability & Reliability Control Panel</h2>
        <p className="text-xs text-slate-500 mt-1">
          Real-time metrics, circuit breaker controls, OpenTelemetry tracing links, and Prometheus scrape target.
        </p>
      </div>

      {/* Circuit Breaker Live Control Card (Requirement 12 & A5) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-sky-600" />
              <span>LLM Provider Circuit Breaker (Resilience Architecture)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Protects system against upstream model failure, fast-failing requests to avoid cascading queue exhaustion.
            </p>
          </div>

          <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${breakerColor}`}>
            State: {breakerState}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-100">
          <div>
            <span className="text-slate-500 block">Failure Count:</span>
            <span className="font-bold font-mono text-slate-800">{circuitStatus?.failure_count || 0}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Trip Threshold:</span>
            <span className="font-bold font-mono text-slate-800">{circuitStatus?.failure_threshold || 3}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Trips:</span>
            <span className="font-bold font-mono text-slate-800">{circuitStatus?.total_trips || 0}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Recovery Countdown:</span>
            <span className="font-bold font-mono text-slate-800">{circuitStatus?.recovery_timeout_sec || 30}s</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSimulateFailure}
            disabled={acting}
            className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold"
          >
            Simulate Provider Failure (+1 Fail)
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={acting}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Reset Circuit Breaker (CLOSED)
          </button>
        </div>
      </div>

      {/* Latency & SLO Performance Monitoring */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Service Level Objective (SLO) Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Target p95 SLO:</span>
            <span className="text-base font-bold text-slate-900">&le; {stats?.declared_slo_p95_sec || 10.0}s</span>
            <p className="text-[10px] text-slate-400 mt-1">Multi-step asynchronous lifecycle</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Observed p50 Latency:</span>
            <span className="text-base font-bold text-emerald-600">
              {stats?.p50_latency_ms ? `${(stats.p50_latency_ms / 1000).toFixed(2)}s` : 'Pending'}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Median completion duration</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Observed p95 Latency:</span>
            <span className="text-base font-bold text-sky-600">
              {stats?.p95_latency_ms ? `${(stats.p95_latency_ms / 1000).toFixed(2)}s` : 'Pending'}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">95th percentile latency</p>
          </div>
        </div>
      </div>

      {/* Prometheus & Distributed Tracing Endpoints */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900">Observability Exporters & Telemetry</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800">Prometheus Metrics Endpoint</span>
              <p className="text-[11px] text-slate-500">Exposes request counts, latency histograms, tool invocations, and token spend.</p>
            </div>
            <a
              href="/api/v1/metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sky-600 hover:text-sky-800 font-semibold"
            >
              /api/v1/metrics <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800">Jaeger Trace Collector & UI</span>
              <p className="text-[11px] text-slate-500">OpenTelemetry traces with end-to-end correlation ID across API and workers.</p>
            </div>
            <a
              href="http://localhost:16686"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sky-600 hover:text-sky-800 font-semibold"
            >
              Open Jaeger UI <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
