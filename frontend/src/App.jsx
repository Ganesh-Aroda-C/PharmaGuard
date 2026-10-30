import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DemoModal from './components/DemoModal';
import DashboardOverview from './pages/DashboardOverview';
import ReportSubmission from './pages/ReportSubmission';
import ReportsList from './pages/ReportsList';
import ReviewQueue from './pages/ReviewQueue';
import AssessmentResults from './pages/AssessmentResults';
import TraceInspector from './pages/TraceInspector';
import EvaluationPage from './pages/EvaluationPage';
import ObservabilityPage from './pages/ObservabilityPage';
import FeedbackPage from './pages/FeedbackPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [circuitStatus, setCircuitStatus] = useState(null);
  const [corpusStatus, setCorpusStatus] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunData, setSelectedRunData] = useState(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [loadedPreset, setLoadedPreset] = useState(null);

  // Poll status & telemetry every 5 seconds
  useEffect(() => {
    refreshAllStatus();
    const interval = setInterval(refreshAllStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        circuitStatus={circuitStatus}
        corpusStatus={corpusStatus}
        pendingCount={dashboardStats?.pending_reviews || 0}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={dashboardStats}
            onSelectRun={handleSelectRun}
            onNavigateTab={setActiveTab}
            onOpenDemoModal={() => setIsDemoModalOpen(true)}
          />
        )}

        {activeTab === 'submit' && (
          <ReportSubmission
            onRunStarted={handleRunStarted}
            initialPreset={loadedPreset}
            onOpenDemoModal={() => setIsDemoModalOpen(true)}
            onClearPreset={() => setLoadedPreset(null)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            onSelectRun={handleSelectRun}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'queue' && (
          <ReviewQueue
            onSelectRun={handleSelectRun}
            onRefreshStats={refreshAllStatus}
          />
        )}

        {activeTab === 'results' && (
          <AssessmentResults
            runData={selectedRunData}
            onNavigateTrace={handleNavigateTrace}
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

        {activeTab === 'feedback' && (
          <FeedbackPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            circuitStatus={circuitStatus}
            corpusStatus={corpusStatus}
            onRefreshStatus={refreshAllStatus}
          />
        )}
      </main>

      {/* Demo / Testing Scenarios Modal */}
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
