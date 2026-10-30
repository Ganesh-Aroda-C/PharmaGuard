import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, FileText, 
  ExternalLink, ShieldAlert, BookOpen, Clock, ThumbsUp, ThumbsDown 
} from 'lucide-react';
import { api } from '../api/client';

export default function AssessmentResults({ runData, onNavigateTrace }) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  if (!runData) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No Assessment Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Submit a new report or select an evaluation run from the dashboard.</p>
      </div>
    );
  }

  const assessment = runData.assessment;
  if (!assessment) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-2" />
        <p className="text-sm font-semibold text-slate-800">Assessment In Progress</p>
        <p className="text-xs text-slate-500 mt-1">Current status: {runData.status}</p>
      </div>
    );
  }

  const isExpedited = assessment.recommended_route === 'expedited_report';
  const isPeriodic = assessment.recommended_route === 'periodic_safety_report';
  const isEscalated = assessment.escalation_required || assessment.recommended_route === 'human_review_required';

  const routeColor = isExpedited ? 'bg-rose-50 border-rose-300 text-rose-900' :
                     isPeriodic ? 'bg-indigo-50 border-indigo-300 text-indigo-900' :
                     'bg-amber-50 border-amber-300 text-amber-900';

  const routeBadgeColor = isExpedited ? 'bg-rose-600 text-white' :
                          isPeriodic ? 'bg-indigo-600 text-white' :
                          'bg-amber-600 text-white';

  const handleFeedback = async (satisfactory) => {
    setSubmittingFeedback(true);
    try {
      await api.submitFeedback({
        run_id: runData.run_id,
        satisfactory,
        rating: feedbackRating,
        feedback_reason: feedbackComment || (satisfactory ? 'Approved grounded citations and routing' : 'Challenged determination')
      });
      setFeedbackSent(true);
    } catch (err) {
      alert(`Error submitting feedback: ${err.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Primary Regulatory Routing Banner */}
      <div className={`p-6 rounded-xl border-2 shadow-xs ${routeColor}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${routeBadgeColor}`}>
              {assessment.recommended_route.replace(/_/g, ' ')}
            </span>
            <h2 className="text-lg font-bold">
              {isExpedited && 'EXPEDITED ADVERSE EVENT REPORT (WITHIN 14 CALENDAR DAYS)'}
              {isPeriodic && 'PERIODIC SAFETY UPDATE REPORT (PSUR STREAM)'}
              {isEscalated && 'HUMAN PHARMACOVIGILANCE REVIEW MANDATORY'}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/80 border border-current">
              Confidence: {(assessment.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm mt-3 opacity-90 leading-relaxed">
          {assessment.route_rationale}
        </p>

        {/* Modifying Provisions Applied */}
        {assessment.modifying_provisions_applied && assessment.modifying_provisions_applied.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20 text-xs">
            <span className="font-bold">Modifying Provisions Applied:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {assessment.modifying_provisions_applied.map((p, idx) => (
                <li key={idx} className="font-mono">{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Two-Column Clinical Core Evaluation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seriousness Evaluation Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Seriousness Assessment (G4.1)</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              assessment.is_serious ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {assessment.is_serious ? 'SERIOUS' : 'NON-SERIOUS'}
            </span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            {assessment.seriousness_rationale}
          </div>
          {assessment.seriousness_criteria_met && assessment.seriousness_criteria_met.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Statutory Criteria Satisfied:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {assessment.seriousness_criteria_met.map((crit, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px]">
                    {crit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expectedness Evaluation Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Expectedness Assessment</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              assessment.is_expected ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {assessment.is_expected ? 'EXPECTED (LISTED)' : 'UNEXPECTED'}
            </span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            {assessment.expectedness_rationale}
          </div>
          {assessment.matched_medical_terms && assessment.matched_medical_terms.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Mapped MedDRA Terms:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {assessment.matched_medical_terms.slice(0, 4).map((term, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px]">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verified Statutory Citations & Corpus Evidence */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Verified Corpus Citations & Evidence Passages</span>
            </h3>
            <p className="text-xs text-slate-500">Every claim is cross-verified against indexed official documents.</p>
          </div>
          <button
            onClick={() => onNavigateTrace(runData.run_id)}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center"
          >
            Inspect Step Trace &rarr;
          </button>
        </div>

        <div className="space-y-3">
          {(assessment.citations || []).map((cit) => (
            <div key={cit.citation_id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-800">{cit.document_title}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                  {cit.citation_id} {cit.page_number ? `| Page ${cit.page_number}` : ''}
                </span>
              </div>
              <div className="font-medium text-slate-700">{cit.section_or_clause}</div>
              <div className="p-2.5 bg-white rounded border border-slate-200 text-slate-600 font-mono text-[11px] leading-relaxed italic">
                "{cit.quoted_text}"
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Relevance:</span> {cit.relevance_rationale}
              </div>
            </div>
          ))}
          {(!assessment.citations || assessment.citations.length === 0) && (
            <div className="text-xs text-slate-400 italic p-4 text-center">
              No citations generated or verified.
            </div>
          )}
        </div>
      </div>

      {/* Clinical Facts Breakdown: Confirmed vs Missing vs Inferred */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block pb-1 border-b border-slate-100">Confirmed Facts</span>
          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            {(assessment.confirmed_facts || []).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block pb-1 border-b border-slate-100">Missing / Unreported Facts</span>
          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            {(assessment.missing_facts || []).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block pb-1 border-b border-slate-100">Inferred Interpretations</span>
          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            {(assessment.inferred_interpretations || []).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Reviewer Feedback Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
        <h4 className="font-bold text-slate-900">Reviewer Quality Assurance (Qualified Person)</h4>
        {feedbackSent ? (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Reviewer assessment feedback recorded in persistent database!</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-700">Assessment Decision:</span>
              <button
                type="button"
                onClick={() => handleFeedback(true)}
                disabled={submittingFeedback}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
              >
                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                Satisfactory (Approve Triage)
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(false)}
                disabled={submittingFeedback}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
              >
                <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                Unsatisfactory (Escalate)
              </button>
            </div>
            <input
              type="text"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Add clinical or regulatory audit notes..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Statutory Governance Disclaimer Box */}
      <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
          <ShieldAlert className="w-4 h-4 text-slate-600" />
          <span>STATUTORY GOVERNANCE & REGULATORY CITATION DISCLAIMER</span>
        </div>
        <p className="leading-relaxed">
          {assessment.regulatory_disclaimer}
        </p>
        <div className="font-mono text-[11px] text-slate-400 pt-1">
          Prompt Version: {assessment.prompt_version} | Decision Engine Rule Version: {assessment.rule_version}
        </div>
      </div>
    </div>
  );
}
