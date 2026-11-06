import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DemoModal from './components/DemoModal';
import DoctorLoginModal from './components/DoctorLoginModal';
import DashboardOverview from './pages/DashboardOverview';
import ReportSubmission from './pages/ReportSubmission';
import ReportsList from './pages/ReportsList';
import ReviewQueue from './pages/ReviewQueue';
import AssessmentResults from './pages/AssessmentResults';
import EvidenceResearchPage from './pages/EvidenceResearchPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DoctorProfileSettings from './pages/DoctorProfileSettings';
import TraceInspector from './pages/TraceInspector';
import EvaluationPage from './pages/EvaluationPage';
import ObservabilityPage from './pages/ObservabilityPage';
import { api } from './api/client';

export default function App() {
  const [currentDoctor, setCurrentDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmaguard_doctor_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [circuitStatus, setCircuitStatus] = useState(null);
  const [corpusStatus, setCorpusStatus] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunData, setSelectedRunData] = useState(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [loadedPreset, setLoadedPreset] = useState(null);

  // Check and sync doctor authentication on mount
  useEffect(() => {
    const handleAuthExpired = () => setCurrentDoctor(null);
    window.addEventListener('pharmaguard_auth_expired', handleAuthExpired);

    const verifyAuth = async () => {
      const token = localStorage.getItem('pharmaguard_doctor_token');
      if (token) {
        try {
          const profile = await api.getCurrentDoctor();
          setCurrentDoctor(profile);
          localStorage.setItem('pharmaguard_doctor_profile', JSON.stringify(profile));
        } catch {
          setCurrentDoctor(null);
          localStorage.removeItem('pharmaguard_doctor_token');
          localStorage.removeItem('pharmaguard_doctor_profile');
        }
      }
    };
    verifyAuth();

    return () => window.removeEventListener('pharmaguard_auth_expired', handleAuthExpired);
  }, []);

  // Poll status & telemetry every 5 seconds
  useEffect(() => {
    if (currentDoctor) {
      refreshAllStatus();
      const interval = setInterval(refreshAllStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [currentDoctor]);

  const refreshAllStatus = async () => {
    try {
      const [stats, circuit, corpus] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getCircuitBreakerStatus().catch(() => null),
        api.getCorpusStatus().catch(() => null),
      ]);
      if (stats) setDashboardStats(stats);
      if (circuit) setCircuitStatus(circuit);
      if (corpus) setCorpusStatus(corpus);
    } catch (e) {
      console.error('Error refreshing status:', e);
    }
  };

  const handleLoginSuccess = (doctor) => {
    setCurrentDoctor(doctor);
    setActiveTab('dashboard');
    refreshAllStatus();
  };

  const handleLogout = async () => {
    try {
      await api.logoutDoctor();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('pharmaguard_doctor_token');
    localStorage.removeItem('pharmaguard_doctor_profile');
    setCurrentDoctor(null);
  };

  const handleSelectRun = async (runId) => {
    setSelectedRunId(runId);
    try {
      const data = await api.getRunStatus(runId);
      setSelectedRunData(data);
      setActiveTab('results');
    } catch (e) {
      console.error('Error fetching run details:', e);
    }
  };

  const handleRunStarted = async (runId) => {
    setSelectedRunId(runId);
    try {
      const data = await api.getRunStatus(runId);
      setSelectedRunData(data);
      setActiveTab('results');
      refreshAllStatus();
    } catch (e) {
      console.error('Error loading newly started run:', e);
    }
  };

  const handleNavigateTrace = (runId) => {
    setSelectedRunId(runId);
    setActiveTab('trace');
  };

  const handleLoadPreset = (presetData, presetTitle) => {
    setLoadedPreset({ data: presetData, title: presetTitle });
    setActiveTab('submit');
  };

  // If not authenticated as doctor, show DoctorLoginModal
  if (!currentDoctor) {
    return <DoctorLoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        circuitStatus={circuitStatus}
        corpusStatus={corpusStatus}
        pendingCount={dashboardStats?.pending_reviews || 0}
        currentDoctor={currentDoctor}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={dashboardStats}
            onSelectRun={handleSelectRun}
            onNavigateTab={setActiveTab}
            onOpenDemoModal={() => setIsDemoModalOpen(true)}
            currentDoctor={currentDoctor}
          />
        )}

        {activeTab === 'submit' && (
          <ReportSubmission
            onRunStarted={handleRunStarted}
            initialPreset={loadedPreset}
            onOpenDemoModal={() => setIsDemoModalOpen(true)}
            onClearPreset={() => setLoadedPreset(null)}
            currentDoctor={currentDoctor}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            onSelectRun={handleSelectRun}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceResearchPage />
        )}

        {activeTab === 'results' && (
          <AssessmentResults
            runData={selectedRunData}
            onNavigateTrace={handleNavigateTrace}
          />
        )}

        {activeTab === 'queue' && (
          <ReviewQueue
            onSelectRun={handleSelectRun}
            onRefreshStats={refreshAllStatus}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogsPage />
        )}

        {activeTab === 'profile' && (
          <DoctorProfileSettings
            currentDoctor={currentDoctor}
            circuitStatus={circuitStatus}
            corpusStatus={corpusStatus}
            onRefreshStatus={refreshAllStatus}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'trace' && (
          <TraceInspector runId={selectedRunId} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationPage />
        )}

        {activeTab === 'observability' && (
          <ObservabilityPage
            circuitStatus={circuitStatus}
            onRefreshStatus={refreshAllStatus}
            stats={dashboardStats}
          />
        )}
      </main>

      {/* Clinical Test Scenarios Modal */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

      {/* Application Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>PharmaGuard | Pharmacovigilance Management System</p>
      </footer>
    </div>
  );
}
