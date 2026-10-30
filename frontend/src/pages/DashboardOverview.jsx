import React from 'react';
import { 
  FileText, Clock, AlertTriangle, CheckCircle2, ArrowRight, 
  PlusCircle, ShieldCheck, FileSearch, ArrowRightCircle, Sparkles, Inbox
} from 'lucide-react';

export default function DashboardOverview({ stats, onSelectRun, onNavigateTab, onOpenDemoModal }) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <Clock className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium text-slate-700">Connecting to PharmaGuard API...</p>
        <p className="text-xs text-slate-400 mt-1">Retrieving system telemetry and live case records</p>
      </div>
    );
  }

  const totalReports = stats.total_reports || 0;
  const pendingReviews = stats.pending_reviews || 0;
  const seriousCases = stats.serious_cases || 0;
  const completedAssessments = stats.completed_runs || 0;
  const recentRuns = stats.recent_runs || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacovigilance Triage Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical decision support for adverse drug event intake, seriousness assessment, and regulatory triage
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigateTab('submit')}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create New Report
          </button>
          <button
            onClick={onOpenDemoModal}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
            Demo Scenarios
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Exact 4 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{totalReports}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            <span>Validated intake records</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Reviews</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">{pendingReviews}</div>
          <div className="text-xs text-amber-700 mt-1 flex items-center">
            <span>Awaiting QPPV sign-off</span>
          </div>
        </div>

        {/* Serious Cases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Serious Cases</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 mt-2">{seriousCases}</div>
          <div className="text-xs text-rose-700 mt-1 flex items-center">
            <span>Hospitalization / Death / Disability</span>
          </div>
        </div>

        {/* Completed Assessments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Assessments</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">{completedAssessments}</div>
          <div className="text-xs text-emerald-700 mt-1 flex items-center">
            <span>Evidence grounded &amp; triaged</span>
          </div>
        </div>
      </div>

      {/* Simple Workflow Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-sky-600" />
            Pharmacovigilance Triage Lifecycle
          </h2>
          <span className="text-[11px] text-slate-500">Autonomous Multi-Agent Loop with Human Authorization</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Step 1 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mb-2">1</div>
            <div className="text-xs font-bold text-slate-800">Report Received</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Boundary schema &amp; chronology validation</div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mb-2">2</div>
            <div className="text-xs font-bold text-slate-800">Assessment Processing</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Agent A extracts facts &amp; queries corpus</div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mb-2">3</div>
            <div className="text-xs font-bold text-slate-800">Evidence Verification</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Agent B checks seriousness &amp; citations</div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs mb-2">4</div>
            <div className="text-xs font-bold text-slate-800">Human Review</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Authorized QPPV clinical sign-off</div>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">5</div>
            <div className="text-xs font-bold text-slate-800">Completed</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Audited case record ready for submission</div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Adverse Event Reports</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live case intake and assessment history</p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center"
          >
            View All Reports &rarr;
          </button>
        </div>

        {recentRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 text-left">Case ID</th>
                  <th className="px-5 py-3.5 text-left">Suspected Drug</th>
                  <th className="px-5 py-3.5 text-left">Reported Reaction</th>
                  <th className="px-5 py-3.5 text-left">Seriousness</th>
                  <th className="px-5 py-3.5 text-left">Assessment Status</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentRuns.map((run) => {
                  const dateStr = run.started_at 
                    ? new Date(run.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  const isSerious = run.is_serious;
                  const status = run.status;

                  return (
                    <tr key={run.run_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                        {run.case_id || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {run.suspect_drug || 'Unknown'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate" title={run.reaction_description}>
                        {run.reaction_description || 'No description recorded'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                          isSerious 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isSerious ? 'SERIOUS' : 'NON-SERIOUS'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                          status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          status === 'escalated' ? 'bg-amber-100 text-amber-800' :
                          status === 'queued' ? 'bg-sky-100 text-sky-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {status ? status.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onSelectRun(run.run_id)}
                          className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <FileSearch className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Reports Available Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by submitting your first adverse event report or loading an authoritative test scenario.
            </p>
            <div className="mt-4 flex items-center justify-center space-x-3">
              <button
                onClick={() => onNavigateTab('submit')}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Submit First Report
              </button>
              <button
                onClick={onOpenDemoModal}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Load Scenario 4.1
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
