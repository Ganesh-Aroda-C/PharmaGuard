import React from 'react';
import { Activity, ShieldAlert, FileText, CheckCircle2, Cpu, BarChart3, MessageSquare, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, circuitStatus, corpusStatus }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'submit', label: 'Submit Report', icon: FileText },
    { id: 'results', label: 'Assessment Results', icon: CheckCircle2 },
    { id: 'trace', label: 'Agent Trace', icon: Cpu },
    { id: 'evaluation', label: 'Evaluation & LLMOps', icon: BarChart3 },
    { id: 'observability', label: 'System & Observability', icon: ShieldAlert },
    { id: 'feedback', label: 'Reviewer Feedback', icon: MessageSquare },
  ];

  const breakerState = circuitStatus?.state || 'CLOSED';
  const breakerColor = breakerState === 'CLOSED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                       breakerState === 'HALF_OPEN' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                       'bg-rose-100 text-rose-800 border-rose-300';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-600 p-2 rounded-lg text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">PV Adverse Event Triage</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">NDCTR 2019 / IPC</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Circuit Breaker Pill */}
            <div className={`px-2.5 py-1 rounded-full border font-medium flex items-center space-x-1 ${breakerColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>Breaker: {breakerState}</span>
            </div>

            {/* Corpus Status Pill */}
            <div className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 font-medium flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Corpus: {corpusStatus?.total_chunks || 0} chunks</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 -mb-px overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-sky-600 text-sky-600 bg-sky-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
