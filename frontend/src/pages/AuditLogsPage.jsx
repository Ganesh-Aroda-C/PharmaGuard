import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Filter, RefreshCw, Clock, ShieldCheck, 
  UserCheck, AlertTriangle, FileText, CheckCircle2 
} from 'lucide-react';
import { api } from '../api/client';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      const data = await api.getAuditLogs(params);
      setLogs(data || []);
    } catch (err) {
      setError(err.message || 'Error fetching audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter]);

  const getEventBadge = (eventType) => {
    if (eventType.includes('LOGIN_SUCCESS')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (eventType.includes('LOGIN_FAILED')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (eventType.includes('CLINICAL_CASE')) {
      return 'bg-sky-100 text-sky-800 border-sky-200';
    }
    if (eventType.includes('QPPV_REVIEW')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (eventType.includes('DOCTOR_PROVISIONED')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clinical &amp; System Audit Trail</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              Immutable Governance Record
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive audit logging of physician access, ADR case submissions, and statutory QPPV authorizations
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
          title="Refresh audit log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
          >
            <option value="">All Audit Events</option>
            <option value="PHYSICIAN_LOGIN_SUCCESS">Physician Login Success</option>
            <option value="PHYSICIAN_LOGIN_FAILED">Login Failed Attempts</option>
            <option value="CLINICAL_CASE_SUBMISSION">Clinical Case Submissions</option>
            <option value="QPPV_REVIEW_RECORDED">QPPV Regulatory Sign-Offs</option>
            <option value="DOCTOR_PROVISIONED">Doctor Account Provisioning</option>
          </select>
        </div>
        <span className="text-slate-500">Showing {logs.length} logged events</span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-2" />
            Loading clinical audit records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 text-left">Timestamp</th>
                  <th className="px-5 py-3.5 text-left">Event Type</th>
                  <th className="px-5 py-3.5 text-left">Practitioner / Actor</th>
                  <th className="px-5 py-3.5 text-left">Role</th>
                  <th className="px-5 py-3.5 text-left">Resource ID</th>
                  <th className="px-5 py-3.5 text-left">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {logs.map((log) => {
                  const dateStr = log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : 'N/A';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded font-sans font-semibold text-[10px] border ${getEventBadge(log.event_type)}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-sans font-semibold text-slate-900">
                        {log.actor}
                      </td>
                      <td className="px-5 py-3 font-sans uppercase text-[10px] text-slate-600">
                        {log.actor_role || 'system'}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-semibold">
                        {log.resource_id || '-'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-sans max-w-sm truncate" title={JSON.stringify(log.details)}>
                        {Object.keys(log.details || {}).length > 0
                          ? JSON.stringify(log.details)
                          : '-'}
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
