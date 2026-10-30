import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, LayoutDashboard, FilePlus2, FileSpreadsheet, 
  Inbox, ChevronDown, Cpu, BarChart3, ShieldAlert, MessageSquare, 
  Settings, Sparkles, UserCheck 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  circuitStatus, 
  corpusStatus, 
  pendingCount = 0,
  onOpenDemoModal 
}) {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'submit', label: 'New Report', icon: FilePlus2 },
    { id: 'reports', label: 'Reports & Assessments', icon: FileSpreadsheet },
    { 
      id: 'queue', 
      label: 'Review Queue', 
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null 
    },
  ];

  const adminTabs = [
    { id: 'trace', label: 'Agent Trace', icon: Cpu, desc: 'Inspect LangGraph step-level execution' },
    { id: 'evaluation', label: 'Evaluation & Performance', icon: BarChart3, desc: 'Golden benchmark run & accuracy' },
    { id: 'observability', label: 'System Monitoring', icon: ShieldAlert, desc: 'Prometheus metrics & circuit breakers' },
    { id: 'feedback', label: 'Reviewer Feedback', icon: MessageSquare, desc: 'QPPV audit history & approvals' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Model provider, rules & corpus' },
  ];

  const isCurrentAdminTab = adminTabs.some(t => t.id === activeTab);
  const activeAdminLabel = isCurrentAdminTab ? adminTabs.find(t => t.id === activeTab)?.label : null;

  const breakerState = circuitStatus?.state || 'CLOSED';
  const breakerColor = breakerState === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       breakerState === 'HALF_OPEN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                       'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Product Title */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2 rounded-xl text-white shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">PharmaGuard</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  PvPI / NDCTR 2019
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Pharmacovigilance Management System</p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Demo / Testing Scenarios Trigger */}
            <button
              onClick={onOpenDemoModal}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-all shadow-2xs"
              title="Open test scenarios for live demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>Demo Scenarios</span>
            </button>

            {/* Circuit Breaker Pill */}
            <div className={`hidden sm:flex px-2.5 py-1 rounded-full border text-[11px] font-semibold items-center space-x-1.5 ${breakerColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>Breaker: {breakerState}</span>
            </div>

            {/* QPPV Profile Badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 text-slate-700">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs">
                Q
              </div>
              <div className="hidden md:block text-left text-[11px]">
                <div className="font-semibold text-slate-900 leading-tight">Dr. S. Sharma</div>
                <div className="text-slate-500 text-[10px]">Authorized QPPV</div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary and Admin Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-slate-100">
          <nav className="flex space-x-1 -mb-px overflow-x-auto py-1">
            {/* Primary Navigation */}
            {primaryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2.5 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Advanced / Administration Menu Dropdown */}
            <div className="relative inline-block text-left" ref={menuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={`flex items-center space-x-1.5 py-2.5 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  isCurrentAdminTab
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{activeAdminLabel ? `Admin: ${activeAdminLabel}` : 'Advanced & Admin'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminMenuOpen && (
                <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-hidden z-50">
                  <div className="p-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      System Administration
                    </div>
                    {adminTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setAdminMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-start space-x-2.5 transition-colors ${
                            isActive ? 'bg-sky-50 text-sky-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                          <div>
                            <div className="font-medium">{tab.label}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{tab.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Corpus chunk count in corner */}
          <div className="hidden lg:flex items-center space-x-1 text-[11px] text-slate-500 pr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Corpus Index: <strong>{corpusStatus?.total_chunks || 28}</strong> clauses</span>
          </div>
        </div>
      </div>
    </header>
  );
}
