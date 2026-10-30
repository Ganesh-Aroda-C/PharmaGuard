import React from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, XOctagon, Clock, 
  Cpu, Database, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function DashboardOverview({ stats, onSelectRun, onNavigateTab }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Clock className="w-6 h-6 animate-spin mr-2 text-sky-600" />
        Loading dashboard metrics...
      </div>
    );
  }

  const routeBreakdown = stats.route_breakdown || {};
  const expeditedCount = routeBreakdown['expedited_report'] || 0;
  const periodicCount = routeBreakdown['periodic_safety_report'] || 0;
  const humanReviewCount = stats.escalated_runs || 0;

  return (
    <div className="space-y-6">
      {/* Statutory Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-xs sm:text-sm text-amber-900 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Statutory Governance Mode:</span> This multi-agent pharmacovigilance triage service operates as an automated clinical decision support system under the <em>New Drugs and Clinical Trials Rules, 2019</em> and <em>IPC PvPI</em> guidelines. <strong>The service NEVER submits reports to regulatory authorities automatically.</strong> All recommendations must be authorized by a qualified pharmacovigilance professional.
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Reports</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total_reports}</div>
          <div className="text-xs text-slate-500 mt-1">Submitted at boundary</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.completed_runs}</div>
          <div className="text-xs text-emerald-700 mt-1">Grounded & verified</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Expedited (14d)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{expeditedCount}</div>
          <div className="text-xs text-rose-700 mt-1">Serious / SCAR modifier</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Periodic (PSUR)</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{periodicCount}</div>
          <div className="text-xs text-indigo-700 mt-1">Non-expedited stream</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Human Escalations</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{humanReviewCount}</div>
          <div className="text-xs text-amber-700 mt-1">Ambiguous / ungrounded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Quarantined</span>
            <XOctagon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{stats.quarantined_count || 0}</div>
          <div className="text-xs text-purple-700 mt-1">Rejected at boundary</div>
        </div>
      </div>

      {/* Latency & SLO Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Latency & Declared SLO (D6)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Declared p95 Target SLO:</span>
              <span className="font-semibold text-slate-800">&le; {stats.declared_slo_p95_sec}s</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Observed p50 Latency:</span>
              <span className="font-semibold text-emerald-700">
                {stats.p50_latency_ms ? `${(stats.p50_latency_ms / 1000).toFixed(2)}s` : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500">Observed p95 Latency:</span>
              <span className="font-semibold text-sky-700">
                {stats.p95_latency_ms ? `${(stats.p95_latency_ms / 1000).toFixed(2)}s` : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Corpus Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Reference Corpus & Vector Store (FAISS)</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">Index Fresh</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(stats.corpus_status?.documents || []).map((doc, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800 truncate" title={doc.title}>{doc.title}</div>
                <div className="text-slate-500 mt-1">Version: {doc.version}</div>
                <div className="text-slate-500">Chunks: <span className="font-mono text-slate-700">{doc.chunk_count}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Assessment Runs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Adverse Event Assessment Runs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any run to inspect the verified citations and agent reasoning trace</p>
          </div>
          <button
            onClick={() => onNavigateTab('submit')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700"
          >
            Submit New Case
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-left">Case ID</th>
                <th className="px-4 py-3 text-left">Suspect Drug</th>
                <th className="px-4 py-3 text-left">Triage Status</th>
                <th className="px-4 py-3 text-left">Recommended Route</th>
                <th className="px-4 py-3 text-left">Latency</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(stats.recent_runs || []).map((run) => {
                const isExpedited = run.route === 'expedited_report';
                const isPeriodic = run.route === 'periodic_safety_report';
                const isEscalated = run.status === 'escalated';

                return (
                  <tr key={run.run_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">{run.case_id || 'N/A'}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{run.suspect_drug || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        run.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        run.status === 'escalated' ? 'bg-amber-100 text-amber-800' :
                        run.status === 'queued' ? 'bg-sky-100 text-sky-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {run.route ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isExpedited ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          isPeriodic ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {run.route.replace('_', ' ').toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Processing...</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectRun(run.run_id)}
                        className="text-sky-600 hover:text-sky-800 font-semibold"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!stats.recent_runs || stats.recent_runs.length === 0) && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                    No reports evaluated yet. Click "Submit New Case" to test the pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
