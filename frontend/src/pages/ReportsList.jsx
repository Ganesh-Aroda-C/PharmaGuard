import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Search, Filter, RefreshCw, ArrowRight, 
  AlertTriangle, CheckCircle2, Clock, Inbox, PlusCircle, Stethoscope 
} from 'lucide-react';
import { api } from '../api/client';

export default function ReportsList({ onSelectRun, onNavigateTab }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (routeFilter) params.route = routeFilter;
      const data = await api.getReportsList(params);
      setReports(data || []);
    } catch (err) {
      setError(err.message || 'Error fetching clinical cases list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [routeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ADR Case Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              Clinical Database
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete database of adverse event cases, clinical dosage timelines, AI triage determinations, and review statuses
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigateTab('submit')}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            New ADR Case
          </button>
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search drug, case ID, or reaction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Route Filter:</span>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
          >
            <option value="">All Triage Routes</option>
            <option value="expedited_report">Expedited Report (14 Calendar Days)</option>
            <option value="periodic_safety_report">Periodic Safety Update Report (PSUR)</option>
            <option value="human_review_required">Human PV Review Required</option>
            <option value="non_reportable">Non-Reportable</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-2" />
            <p className="text-xs">Loading adverse drug reaction cases...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No adverse event cases found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 text-left">Case ID</th>
                  <th className="px-5 py-3.5 text-left">Suspected Drug &amp; Regimen</th>
                  <th className="px-5 py-3.5 text-left">Clinical Reaction</th>
                  <th className="px-5 py-3.5 text-left">Attending Doctor</th>
                  <th className="px-5 py-3.5 text-left">Seriousness</th>
                  <th className="px-5 py-3.5 text-left">Recommended Route</th>
                  <th className="px-5 py-3.5 text-left">Confidence</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((item) => {
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'N/A';

                  const isExpedited = item.recommended_route === 'expedited_report';
                  const isPeriodic = item.recommended_route === 'periodic_safety_report';

                  return (
                    <tr key={item.report_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                        {item.case_id}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{item.suspect_drug}</div>
                        {(item.dosage || item.frequency) && (
                          <div className="text-[11px] text-sky-700 font-medium">
                            {item.dosage} {item.frequency ? `&bull; ${item.frequency}` : ''}
                          </div>
                        )}
                        {item.product_identifier && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.product_identifier}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate" title={item.reaction_description}>
                        {item.reaction_description}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        <span className="font-medium">{item.attending_physician || 'Attending Physician'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                          item.is_serious 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.is_serious ? 'SERIOUS' : 'NON-SERIOUS'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.recommended_route ? (
                          <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] border ${
                            isExpedited ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            isPeriodic ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {item.recommended_route.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Processing...</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {item.confidence_score !== null && item.confidence_score !== undefined
                          ? `${(item.confidence_score * 100).toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {item.run_id ? (
                          <button
                            onClick={() => onSelectRun(item.run_id)}
                            className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-800"
                          >
                            Assessment
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No run</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
