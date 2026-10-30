const API_BASE = '/api/v1';

export async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
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
  getDashboardStats: () => fetchJson('/dashboard/stats'),
  getReportsList: (params) => fetchJson('/reports-list' + (params ? '?' + new URLSearchParams(params) : '')),
  getReviewQueue: (filterType = 'pending') => fetchJson(`/review-queue?filter_type=${filterType}`),
  submitReport: (report) => fetchJson('/reports', { method: 'POST', body: JSON.stringify(report) }),
  getRunStatus: (runId) => fetchJson(`/runs/${runId}`),
  getRunTrace: (runId) => fetchJson(`/runs/${runId}/trace`),
  getCorpusStatus: () => fetchJson('/corpus/status'),
  getEvaluations: () => fetchJson('/evaluations'),
  triggerEvaluation: (promptVersion = 'v1') => fetchJson(`/evaluations/run?prompt_version=${promptVersion}`, { method: 'POST' }),
  getFeedbackSummary: () => fetchJson('/feedback/summary'),
  submitFeedback: (feedback) => fetchJson('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  getCircuitBreakerStatus: () => fetchJson('/circuit-breaker/status'),
  resetCircuitBreaker: () => fetchJson('/circuit-breaker/reset', { method: 'POST' }),
  simulateCircuitBreakerFailure: () => fetchJson('/circuit-breaker/simulate-failure', { method: 'POST' }),
};
