const API_BASE = '/api/v1';

export async function fetchJson(endpoint, options = {}) {
  const token = localStorage.getItem('pharmaguard_doctor_token');
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      // Clear token on 401
      localStorage.removeItem('pharmaguard_doctor_token');
      localStorage.removeItem('pharmaguard_doctor_profile');
      window.dispatchEvent(new Event('pharmaguard_auth_expired'));
    }

    let errorDetail = `HTTP ${res.status}`;
    try {
      if (contentType.includes('application/json')) {
        const errJson = await res.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } else {
        errorDetail = await res.text();
      }
    } catch (e) {}
    throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  // Doctor Auth & Identity
  loginDoctor: (credentials) => fetchJson('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getCurrentDoctor: () => fetchJson('/auth/me'),
  logoutDoctor: () => fetchJson('/auth/logout', { method: 'POST' }),
  provisionDoctor: (docData) => fetchJson('/auth/provision-doctor', { method: 'POST', body: JSON.stringify(docData) }),
  getAuditLogs: (params) => fetchJson('/audit-logs' + (params ? '?' + new URLSearchParams(params) : '')),

  // Clinical Dashboard & Case Management
  getDashboardStats: () => fetchJson('/dashboard/stats'),
  getReportsList: (params) => fetchJson('/reports-list' + (params ? '?' + new URLSearchParams(params) : '')),
  getReviewQueue: (filterType = 'pending') => fetchJson(`/review-queue?filter_type=${filterType}`),
  submitReport: (report) => fetchJson('/reports', { method: 'POST', body: JSON.stringify(report) }),
  getRunStatus: (runId) => fetchJson(`/runs/${runId}`),
  getRunTrace: (runId) => fetchJson(`/runs/${runId}/trace`),

  // Reference Corpus & Evidence RAG
  getCorpusStatus: () => fetchJson('/corpus/status'),

  // Evaluation & LLMOps
  getEvaluations: () => fetchJson('/evaluations'),
  triggerEvaluation: (promptVersion = 'v1') => fetchJson(`/evaluations/run?prompt_version=${promptVersion}`, { method: 'POST' }),

  // Quality & Feedback
  getFeedbackSummary: () => fetchJson('/feedback/summary'),
  submitFeedback: (feedback) => fetchJson('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),

  // Circuit Breaker & Resilience
  getCircuitBreakerStatus: () => fetchJson('/circuit-breaker/status'),
  resetCircuitBreaker: () => fetchJson('/circuit-breaker/reset', { method: 'POST' }),
  simulateCircuitBreakerFailure: () => fetchJson('/circuit-breaker/simulate-failure', { method: 'POST' }),
};
