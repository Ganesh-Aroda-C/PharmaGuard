import React, { useState } from 'react';
import { ShieldCheck, Stethoscope, Lock, UserCheck, AlertCircle, Sparkles, Building2, Award } from 'lucide-react';
import { api } from '../api/client';

export default function DoctorLoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState('dr.sharma@pharmaguard.med');
  const [password, setPassword] = useState('PhysicianSecret2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const presetDoctors = [
    {
      name: 'Dr. S. Sharma, MD',
      email: 'dr.sharma@pharmaguard.med',
      password: 'PhysicianSecret2026!',
      role: 'QPPV & Clinical Pharmacologist',
      badge: 'Authorized QPPV',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      reg: 'MCI-48291',
      inst: 'AIIMS, New Delhi'
    },
    {
      name: 'Dr. R. Patel, MBBS, MD',
      email: 'dr.patel@pharmaguard.med',
      password: 'PhysicianSecret2026!',
      role: 'Attending Physician',
      badge: 'Internal Medicine',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      reg: 'MCI-61024',
      inst: 'PGIMER, Chandigarh'
    },
    {
      name: 'Dr. Ananya Iyer, MD',
      email: 'dr.iyer@pharmaguard.med',
      password: 'PhysicianSecret2026!',
      role: 'Consultant Neurologist',
      badge: 'Epilepsy Specialist',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      reg: 'MCI-77319',
      inst: 'NIMHANS, Bengaluru'
    },
    {
      name: 'Admin Medical Directorate',
      email: 'admin@pharmaguard.med',
      password: 'AdminClinical2026!',
      role: 'System Administrator',
      badge: 'Medical Admin',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      reg: 'MCI-ADMIN-01',
      inst: 'Central Regulatory Directorate'
    }
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.loginDoctor({ email, password });
      localStorage.setItem('pharmaguard_doctor_token', response.access_token);
      localStorage.setItem('pharmaguard_doctor_profile', JSON.stringify(response.doctor));
      onLoginSuccess(response.doctor);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (doc) => {
    setEmail(doc.email);
    setPassword(doc.password);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-600/30 border border-sky-400/40 flex items-center justify-center mb-3">
            <Stethoscope className="w-7 h-7 text-sky-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">PharmaGuard Clinical Portal</h2>
          <p className="text-xs text-sky-200/80 mt-1">
            Restricted Clinical Decision Support System &bull; Physician Authentication
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/30">
            <Lock className="w-3 h-3 mr-1.5" />
            Authorized Medical &amp; Pharmacovigilance Personnel Only
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Statutory Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Medical Governance Notice:</strong> Patient self-registration and public access are disabled. Only licensed medical practitioners registered with state or national medical councils may authenticate.
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doctor Email / Institutional ID</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Secure Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{loading ? 'Verifying Medical Credentials...' : 'Authenticate & Enter Clinical Portal'}</span>
            </button>
          </form>

          {/* Quick Doctor Preset Switcher */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Select Authorized Physician Profile for Demonstration:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {presetDoctors.map((doc) => (
                <div
                  key={doc.email}
                  onClick={() => handleSelectPreset(doc)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    email === doc.email
                      ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900">{doc.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${doc.badgeColor}`}>
                      {doc.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{doc.role} &bull; Reg: {doc.reg}</div>
                  <div className="text-[10px] text-slate-400">{doc.inst}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
