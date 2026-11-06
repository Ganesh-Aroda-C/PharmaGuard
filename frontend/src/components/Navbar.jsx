import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, LayoutDashboard, FilePlus2, FileSpreadsheet, 
  Inbox, ChevronDown, Cpu, BarChart3, ShieldAlert, BookOpen, 
  Settings, Sparkles, UserCheck, ClipboardList, LogOut, Stethoscope 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  circuitStatus, 
  corpusStatus, 
  pendingCount = 0,
  currentDoctor,
  onOpenDemoModal,
  onLogout 
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
    { id: 'dashboard', label: 'Clinical Dashboard', icon: LayoutDashboard },
    { id: 'submit', label: 'New ADR Assessment', icon: FilePlus2 },
    { id: 'reports', label: 'Case Management', icon: FileSpreadsheet },
    { id: 'evidence', label: 'AI Evidence Research', icon: BookOpen },
    { id: 'results', label: 'Clinical Assessment', icon: ShieldCheck },
    { 
      id: 'queue', 
      label: 'Regulatory Reporting', 
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null 
    },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
    { id: 'profile', label: 'Doctor Profile & Settings', icon: UserCheck },
  ];

  const adminTabs = [
    { id: 'trace', label: 'Agent Trace', icon: Cpu, desc: 'Inspect LangGraph step-level execution' },
    { id: 'evaluation', label: 'Evaluation & Performance', icon: BarChart3, desc: '20-scenario golden benchmark & accuracy' },
    { id: 'observability', label: 'System Monitoring', icon: ShieldAlert, desc: 'Prometheus metrics & circuit breakers' },
  ];

  const isCurrentAdminTab = adminTabs.some(t => t.id === activeTab);
  const activeAdminLabel = isCurrentAdminTab ? adminTabs.find(t => t.id === activeTab)?.label : null;

  const breakerState = circuitStatus?.state || 'CLOSED';
  const breakerColor = breakerState === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       breakerState === 'HALF_OPEN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                       'bg-rose-50 text-rose-700 border-rose-200';

  const docInitials = currentDoctor?.full_name?.replace('Dr. ', '')?.charAt(0) || 'D';

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
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-sm group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">PharmaGuard</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  Physician CDS Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Pharmacovigilance Clinical Decision Support System</p>
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

            {/* Authenticated Physician Badge */}
            {currentDoctor && (
              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center font-bold text-xs">
                  {docInitials}
                </div>
                <div className="hidden lg:block text-left text-[11px]">
                  <div className="font-bold text-slate-900 leading-tight flex items-center">
                    <span>{currentDoctor.full_name}</span>
                    <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                      {currentDoctor.role}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px]">Reg: {currentDoctor.medical_license_number}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign out of Physician Portal"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
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
                  className={`flex items-center space-x-2 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
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
                className={`flex items-center space-x-1 py-2 px-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  isCurrentAdminTab
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{activeAdminLabel ? `Telemetry: ${activeAdminLabel}` : 'MLOps'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminMenuOpen && (
                <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-hidden z-50">
                  <div className="p-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Agent &amp; Observability Telemetry
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
          <div className="hidden xl:flex items-center space-x-1 text-[11px] text-slate-500 pr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Corpus: <strong>{corpusStatus?.total_chunks || 28}</strong> clauses</span>
          </div>
        </div>
      </div>
    </header>
  );
}
