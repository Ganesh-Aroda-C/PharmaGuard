import React, { useState } from 'react';
import { 
  UserCheck, ShieldCheck, Stethoscope, Building2, Award, 
  UserPlus, CheckCircle2, AlertCircle, RefreshCw, Cpu, Database, 
  ShieldAlert, ExternalLink, Activity, FileCode 
} from 'lucide-react';
import { api } from '../api/client';

export default function DoctorProfileSettings({ 
  currentDoctor, 
  circuitStatus, 
  corpusStatus, 
  onRefreshStatus,
  onLogout 
}) {
  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    full_name: '',
    medical_license_number: '',
    specialty: '',
    institution: '',
    role: 'physician'
  });
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(null);
  const [provisionError, setProvisionError] = useState(null);

  const [resettingBreaker, setResettingBreaker] = useState(false);
  const [triggeringEval, setTriggeringEval] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const canProvision = currentDoctor?.role === 'admin' || currentDoctor?.role === 'qppv';

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    setProvisionSuccess(null);
    setProvisionError(null);

    try {
      const newDoc = await api.provisionDoctor(provisionForm);
      setProvisionSuccess(`Authorized doctor account created successfully for ${newDoc.full_name} (${newDoc.medical_license_number}).`);
      setProvisionForm({
        email: '',
        password: '',
        full_name: '',
        medical_license_number: '',
        specialty: '',
        institution: '',
        role: 'physician'
      });
    } catch (err) {
      setProvisionError(err.message || 'Error provisioning doctor account.');
    } finally {
      setProvisioning(false);
    }
  };

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
      {/* Doctor Profile Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            {currentDoctor?.full_name?.replace('Dr. ', '')?.charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">{currentDoctor?.full_name || 'Authorized Physician'}</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 uppercase">
                {currentDoctor?.role || 'Physician'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registration No: <strong className="text-slate-800">{currentDoctor?.medical_license_number || 'MCI-VERIFIED'}</strong> &bull; {currentDoctor?.specialty}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {currentDoctor?.institution || 'Medical Healthcare Center'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
        >
          Sign Out of Portal
        </button>
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

      {/* Provisioning Section (Admin / QPPV only) */}
      {canProvision && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Provision Authorized Physician Account
              </h2>
              <p className="text-xs text-slate-500">
                Grant clinical decision support access to verified medical doctors and QPPV assessors
              </p>
            </div>
          </div>

          {provisionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{provisionSuccess}</span>
            </div>
          )}

          {provisionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{provisionError}</span>
            </div>
          )}

          <form onSubmit={handleProvisionSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doctor Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. K. Verma, MD"
                value={provisionForm.full_name}
                onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institutional Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. dr.verma@hospital.org"
                value={provisionForm.email}
                onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medical Registration No. *</label>
              <input
                type="text"
                required
                placeholder="e.g. MCI-82914"
                value={provisionForm.medical_license_number}
                onChange={(e) => setProvisionForm({ ...provisionForm, medical_license_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Specialty *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cardiology"
                value={provisionForm.specialty}
                onChange={(e) => setProvisionForm({ ...provisionForm, specialty: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hospital / Medical College *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apollo Hospitals"
                value={provisionForm.institution}
                onChange={(e) => setProvisionForm({ ...provisionForm, institution: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                minLength="8"
                placeholder="Min 8 characters"
                value={provisionForm.password}
                onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Designated Role *</label>
              <select
                value={provisionForm.role}
                onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white"
              >
                <option value="physician">Attending Physician (Intake &amp; Case Review)</option>
                <option value="qppv">Qualified Person for Pharmacovigilance (Statutory Authorization)</option>
                <option value="admin">System &amp; Medical Administrator</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={provisioning}
                className="w-full py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {provisioning ? 'Provisioning...' : 'Provision Doctor Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Architecture & Operational Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Architecture Specs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Multi-Agent Architecture</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Agent Framework:</span>
              <span className="font-semibold text-slate-800">LangGraph StateGraph Loop</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Retrieval Vector Store:</span>
              <span className="font-semibold text-slate-800">FAISS IndexFlatIP (Local CPU)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Dense Embedding Model:</span>
              <span className="font-mono text-slate-800">all-MiniLM-L6-v2 (384-dim)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Statutory Governance:</span>
              <span className="font-semibold text-emerald-700">NDCTR 2019 Rule 67(3) &bull; IPC PvPI</span>
            </div>
          </div>
        </div>

        {/* Administrative Controls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Circuit Breaker &amp; Diagnostics</h3>
          </div>

          <div className="space-y-3 text-xs">
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

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-800">Golden Dataset Evaluation</span>
                <div className="text-[10px] text-slate-500">Run benchmark across 20 clinical test cases</div>
              </div>
              <button
                onClick={handleTriggerEval}
                disabled={triggeringEval}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold"
              >
                {triggeringEval ? 'Evaluating...' : 'Run Benchmark'}
              </button>
            </div>

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
                href="/api/v1/metrics"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-semibold"
              >
                <Activity className="w-3.5 h-3.5 mr-1" />
                Prometheus Telemetry
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
