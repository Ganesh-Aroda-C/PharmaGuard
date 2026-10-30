import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Star, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

export default function FeedbackPage() {
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await api.getFeedbackSummary();
      setFeedbackSummary(data);
    } catch (e) {
      console.error('Error fetching feedback:', e);
    } finally {
      setLoading(false);
    }
  };

  const satisfactionPct = feedbackSummary && feedbackSummary.total_feedbacks > 0
    ? (feedbackSummary.satisfaction_rate * 100).toFixed(1)
    : '100.0';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Reviewer Quality Assurance &amp; Feedback Audit</h2>
        <p className="text-xs text-slate-500 mt-1">
          Pharmacovigilance reviewers rate assessment accuracy, audit statutory routing, and submit clinical challenges.
        </p>
      </div>

      {/* Aggregate Feedback Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Feedback Submissions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{feedbackSummary?.total_feedbacks || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Satisfactory Assessments</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{feedbackSummary?.satisfactory_count || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Satisfaction Rate</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">{satisfactionPct}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Average Rating</div>
          <div className="text-2xl font-bold text-amber-500 mt-1 flex items-center">
            {feedbackSummary?.average_rating || 5.0}
            <Star className="w-4 h-4 ml-1 fill-current" />
          </div>
        </div>
      </div>

      {/* Recent Feedback Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Recent Pharmacovigilance Reviewer Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Rating</th>
                <th className="px-4 py-2.5 text-left">Reviewer Role</th>
                <th className="px-4 py-2.5 text-left">Audit Notes & Reason</th>
                <th className="px-4 py-2.5 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(feedbackSummary?.recent_feedbacks || []).map((fb) => (
                <tr key={fb.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      fb.satisfactory ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {fb.satisfactory ? <ThumbsUp className="w-3 h-3 mr-1" /> : <ThumbsDown className="w-3 h-3 mr-1" />}
                      {fb.satisfactory ? 'Satisfactory' : 'Challenged'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {fb.rating ? `${fb.rating}/5` : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{fb.reviewer_role}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={fb.reason}>
                    {fb.reason || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {fb.created_at ? fb.created_at.split('T')[0] : '-'}
                  </td>
                </tr>
              ))}
              {(!feedbackSummary?.recent_feedbacks || feedbackSummary.recent_feedbacks.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                    No reviewer feedback submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
