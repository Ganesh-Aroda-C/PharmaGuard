import React, { useState, useEffect } from 'react';
import { 
  Inbox, CheckCircle2, XCircle, AlertTriangle, HelpCircle, 
  Clock, ArrowRight, UserCheck, Star, ShieldCheck, FileText, RefreshCw 
} from 'lucide-react';
import { api } from '../api/client';

export default function ReviewQueue({ onSelectRun, onRefreshStats }) {
  const [filterType, setFilterType] = useState('pending'); // 'pending' | 'reviewed' | 'all'
  const [queueItems, setQueueItems] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'request_info' | 'reject'
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [reviewerRole, setReviewerRole] = useState('QPPV');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getReviewQueue(filterType);
      setQueueItems(data || []);
      if (data && data.length > 0) {
        // Keep selected case or select first
        setSelectedCase(prev => {
          if (prev) {
            const found = data.find(d => d.run_id === prev.run_id);
            return found || data[0];
          }
          return data[0];
        });
      } else {
        setSelectedCase(null);
      }
    } catch (e) {
      console.error('Error fetching review queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterType]);

  const handleSubmitDecision = async () => {
    if (!selectedCase) return;
    setSubmittingDecision(true);
    setFeedbackSuccess(null);

    const isSatisfactory = actionType === 'approve';
    const reasonPrefix = actionType === 'approve' 
      ? '[APPROVED BY QPPV] ' 
      : actionType === 'request_info' 
      ? '[ADDITIONAL INFO REQUESTED] ' 
      : '[REJECTED BY QPPV] ';

    const feedbackPayload = {
      run_id: selectedCase.run_id,
      satisfactory: isSatisfactory,
      rating: rating,
      feedback_reason: `${reasonPrefix}${notes.trim() || 'Reviewed and authorized under NDCTR 2019 / IPC PvPI protocols.'}`,
      reviewer_role: reviewerRole
    };

    try {
      await api.submitFeedback(feedbackPayload);
      setFeedbackSuccess(`Case ${selectedCase.case_id} decision recorded successfully.`);
      setNotes('');
      if (onRefreshStats) onRefreshStats();
      fetchQueue();
    } catch (err) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">QPPV Review &amp; Authorization Queue</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
              Human Sign-off Mandatory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical decision workspace for Qualified Persons Responsible for Pharmacovigilance (QPPV)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-semibold">
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Review
            </button>
            <button
              onClick={() => setFilterType('reviewed')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'reviewed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reviewed Cases
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cases
            </button>
          </div>

          <button
            onClick={fetchQueue}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button onClick={() => setFeedbackSuccess(null)} className="text-emerald-700 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Review Workspace Layout: Left List + Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List: Cases in Queue */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[750px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              {filterType === 'pending' ? 'Cases Awaiting Review' : filterType === 'reviewed' ? 'Completed Audits' : 'All Triage Cases'} ({queueItems.length})
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                Loading review queue...
              </div>
            ) : queueItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No cases found in this view.
              </div>
            ) : (
              queueItems.map((c) => {
                const isSelected = selectedCase?.run_id === c.run_id;
                const isExpedited = c.recommended_route === 'expedited_report';
                const isPeriodic = c.recommended_route === 'periodic_safety_report';

                return (
                  <div
                    key={c.run_id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900">{c.case_id}</span>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">{c.suspect_drug}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.is_serious ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.is_serious ? 'SERIOUS' : 'NON-SERIOUS'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {c.reaction_description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        isExpedited ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        isPeriodic ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                        'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {c.recommended_route ? c.recommended_route.replace(/_/g, ' ').toUpperCase() : 'PENDING'}
                      </span>

                      {c.is_reviewed ? (
                        <span className="inline-flex items-center text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Reviewed
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold">Needs QPPV</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Decision Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCase ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-900">{selectedCase.case_id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      selectedCase.is_reviewed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedCase.is_reviewed ? 'Review Completed' : 'Pending Review'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Suspect: <strong>{selectedCase.suspect_drug}</strong> {selectedCase.product_identifier ? `(${selectedCase.product_identifier})` : ''}
                  </p>
                </div>

                <button
                  onClick={() => onSelectRun(selectedCase.run_id)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  View Full Assessment &amp; Citations &rarr;
                </button>
              </div>

              {/* Case Summary Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.patient_age ? `${selectedCase.patient_age} yrs, ` : ''}{selectedCase.patient_sex || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Seriousness</span>
                  <span className={`font-bold ${selectedCase.is_serious ? 'text-rose-600' : 'text-slate-700'}`}>
                    {selectedCase.is_serious ? 'Serious' : 'Non-Serious'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Expectedness</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.is_expected === null ? 'Not verified' : selectedCase.is_expected ? 'Expected' : 'Unexpected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Confidence</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.confidence_score ? `${(selectedCase.confidence_score * 100).toFixed(0)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Reaction Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Reported Reaction Narrative
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-serif">
                  "{selectedCase.reaction_description}"
                </div>
              </div>

              {/* AI Triage Recommendation Summary */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wide">
                    AI Triage Determination
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-800">
                    {selectedCase.recommended_route?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-sky-900/90 leading-relaxed">
                  Based on retrieved provisions from <em>NDCTR 2019 Rule 67(3)</em> and <em>IPC PvPI Guidance</em>, 
                  this adverse event meets criteria for <strong>{selectedCase.recommended_route?.replace(/_/g, ' ')}</strong>.
                </p>
                {selectedCase.escalation_required && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Escalation Flagged:</strong> {selectedCase.escalation_reason || 'Manual review mandatory due to evidentiary ambiguity.'}</span>
                  </div>
                )}
              </div>

              {/* Existing Review or Review Decision Form */}
              {selectedCase.is_reviewed && selectedCase.review ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-900">
                    <span className="font-bold flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-700" />
                      QPPV Review Decision Recorded
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {new Date(selectedCase.review.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-900 mt-1">
                    <strong>Reviewer Role:</strong> {selectedCase.review.reviewer_role} &bull; <strong>Status:</strong> {selectedCase.review.satisfactory ? 'Approved' : 'Challenged / Rejected'} &bull; <strong>Rating:</strong> {selectedCase.review.rating}/5 &starf;
                  </div>
                  <div className="text-xs text-emerald-800 italic mt-1 bg-white/60 p-2.5 rounded-lg border border-emerald-100">
                    "{selectedCase.review.reason}"
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
                      <UserCheck className="w-4 h-4 mr-1.5 text-sky-600" />
                      Record Pharmacovigilance Decision
                    </h4>
                    <span className="text-[11px] text-slate-500">Statutory Sign-Off</span>
                  </div>

                  {/* 3 Review Action Buttons */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActionType('approve')}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        actionType === 'approve'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mb-1" />
                      Approve Assessment
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('request_info')}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        actionType === 'request_info'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 mb-1" />
                      Request More Info
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('reject')}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        actionType === 'reject'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle className="w-4 h-4 mb-1" />
                      Reject Assessment
                    </button>
                  </div>

                  {/* Star Rating and Role Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Evidentiary Quality Rating</label>
                      <div className="flex items-center space-x-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`p-1 text-base ${star <= rating ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            &starf;
                          </button>
                        ))}
                        <span className="text-slate-500 ml-2 font-semibold">({rating} / 5)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Reviewer Role</label>
                      <select
                        value={reviewerRole}
                        onChange={(e) => setReviewerRole(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                      >
                        <option value="QPPV">Qualified Person Responsible for PV (QPPV)</option>
                        <option value="Senior Safety Officer">Senior Drug Safety Officer</option>
                        <option value="Medical Assessor">Medical Regulatory Assessor</option>
                      </select>
                    </div>
                  </div>

                  {/* Review Notes */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">
                      Clinical &amp; Regulatory Review Notes
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Add justifications, additional follow-up queries, or confirmation of package insert grounding..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-xs text-slate-800"
                    />
                  </div>

                  {/* Submit Review Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={handleSubmitDecision}
                      className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      {submittingDecision ? 'Recording Decision...' : 'Authorize Review Decision'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Case Selected</h3>
              <p className="text-xs text-slate-500 mt-1">Select a case from the queue on the left to review its assessment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
