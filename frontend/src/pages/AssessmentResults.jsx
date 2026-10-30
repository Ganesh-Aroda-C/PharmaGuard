import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, FileText, 
  ExternalLink, ShieldAlert, BookOpen, Clock, ChevronDown, 
  ChevronUp, Cpu, UserCheck, Star, ShieldCheck, ArrowRight, HelpCircle, XCircle 
} from 'lucide-react';
import { api } from '../api/client';

export default function AssessmentResults({ runData, onNavigateTrace }) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRole, setFeedbackRole] = useState('QPPV');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);

  if (!runData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 max-w-4xl mx-auto">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">No Assessment Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Submit a new report or select an evaluation run from the dashboard or reports list.</p>
      </div>
    );
  }

  const assessment = runData.assessment;
  const report = runData.report;

  if (!assessment) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 max-w-4xl mx-auto">
        <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-2" />
        <p className="text-sm font-bold text-slate-800">Assessment In Progress</p>
        <p className="text-xs text-slate-500 mt-1">Run status: <span className="font-mono">{runData.status}</span></p>
      </div>
    );
  }

  const isExpedited = assessment.recommended_route === 'expedited_report';
  const isPeriodic = assessment.recommended_route === 'periodic_safety_report';
  const isEscalated = assessment.escalation_required || assessment.recommended_route === 'human_review_required';

  const routeColor = isExpedited ? 'bg-rose-50 border-rose-200 text-rose-900' :
                     isPeriodic ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
                     'bg-amber-50 border-amber-200 text-amber-900';

  const routeBadgeColor = isExpedited ? 'bg-rose-600 text-white' :
                          isPeriodic ? 'bg-indigo-600 text-white' :
                          'bg-amber-600 text-white';

  const handleFeedbackSubmit = async (decisionType) => {
    setSubmittingFeedback(true);
    const isSatisfactory = decisionType === 'approve';
    const prefix = decisionType === 'approve' ? '[APPROVED] ' : decisionType === 'request_info' ? '[INFO REQUESTED] ' : '[REJECTED] ';

    try {
      await api.submitFeedback({
        run_id: runData.run_id,
        satisfactory: isSatisfactory,
        rating: feedbackRating,
        feedback_reason: `${prefix}${feedbackComment || (isSatisfactory ? 'Approved grounded citations and triage recommendation.' : 'Challenged determination.')}`,
        reviewer_role: feedbackRole
      });
      setFeedbackSent(true);
    } catch (err) {
      alert(`Error submitting review decision: ${err.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Trace Inspector Link */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clinical &amp; Regulatory Assessment</h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {report?.case_id || 'CASE-RECORD'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grounded multi-agent analysis under NDCTR 2019 Rule 67(3) and IPC PvPI guidelines
          </p>
        </div>

        <button
          onClick={() => onNavigateTrace(runData.run_id)}
          className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
        >
          <Cpu className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
          Inspect Technical Agent Trace &rarr;
        </button>
      </div>

      {/* SECTION E (PROMINENT BANNER): REGULATORY REPORTING RECOMMENDATION */}
      <div className={`p-6 rounded-2xl border-2 shadow-xs ${routeColor}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${routeBadgeColor}`}>
              SECTION E &bull; {assessment.recommended_route?.replace(/_/g, ' ')}
            </span>
            <h2 className="text-lg font-bold">
              {isExpedited && 'EXPEDITED ADVERSE EVENT REPORT (WITHIN 14 CALENDAR DAYS)'}
              {isPeriodic && 'PERIODIC SAFETY UPDATE REPORT (PSUR STREAM)'}
              {isEscalated && 'HUMAN PHARMACOVIGILANCE REVIEW MANDATORY'}
            </h2>
          </div>
          <div className="text-right flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/90 border border-current shadow-2xs">
              Confidence: <strong>{(assessment.confidence_score * 100).toFixed(0)}%</strong>
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm mt-3 opacity-90 leading-relaxed font-medium">
          {assessment.route_rationale}
        </p>

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

      {/* Collapsible: How Was This Assessment Generated? */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full px-5 py-3.5 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            <span>How was this assessment generated? (Multi-Agent Architecture)</span>
          </div>
          {showHowItWorks ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showHowItWorks && (
          <div className="p-5 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-3 bg-slate-50/50">
            <p className="leading-relaxed">
              PharmaGuard utilizes a stateful <strong>LangGraph multi-agent architecture</strong> with two specialized agents executing sequentially:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-sky-700 block mb-1">Agent A: Intake &amp; Evidence Research</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Extracts confirmed facts, missing variables, and patient demographics. Formulates semantic queries against the approved reference corpus (NDCTR 2019, IPC PvPI, and Drug Product Information) using FAISS dense vector retrieval.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-indigo-700 block mb-1">Agent B: Assessment &amp; Verification</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Evaluates seriousness criteria against statutory definitions, compares reported reactions with package insert terms for expectedness, checks modifying provisions, and enforces 100% citation grounding.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION A & SECTION B: CASE SUMMARY & SUSPECTED DRUG & REACTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION A – CASE SUMMARY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Section A – Case Summary</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Case Identifier:</span>
              <span className="font-mono font-bold text-slate-800">{report?.case_id || 'CASE-RECORD'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Intake Source Channel:</span>
              <span className="font-semibold text-slate-800 uppercase">{report?.source_type || 'Spontaneous'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Reporter Credential:</span>
              <span className="font-semibold text-slate-800 uppercase">{report?.reporter_type || 'Physician'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Processing Latency:</span>
              <span className="font-mono font-bold text-emerald-700">
                {runData.total_duration_ms ? `${(runData.total_duration_ms / 1000).toFixed(2)}s` : 'Real-time'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION B – SUSPECTED DRUG & REACTION */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Section B – Suspected Drug &amp; Reaction</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Suspect Drug:</span>
              <span className="font-bold text-slate-900">{report?.suspect_drug || 'Unknown'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Product / Brand:</span>
              <span className="font-medium text-slate-800">{report?.product_identifier || 'Standard Formulation'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Patient:</span>
              <span className="font-semibold text-slate-800">
                {report?.patient_age ? `${report.patient_age} yrs, ` : ''}{report?.patient_sex || 'Unknown'}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-slate-500 block mb-1">Reported Reaction Narrative:</span>
              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-serif italic text-[11px] leading-relaxed">
                "{report?.reaction_description}"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C & SECTION D: SERIOUSNESS & EXPECTEDNESS ASSESSMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION C – SERIOUSNESS ASSESSMENT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Section C – Seriousness Assessment</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              assessment.is_serious ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {assessment.is_serious ? 'SERIOUS' : 'NON-SERIOUS'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {assessment.seriousness_rationale}
          </p>
          {assessment.seriousness_criteria_met && assessment.seriousness_criteria_met.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700 block mb-1">Satisfied Criteria:</span>
              <div className="flex flex-wrap gap-1.5">
                {assessment.seriousness_criteria_met.map((crit, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md border border-rose-200 text-[11px] font-semibold">
                    {crit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION D – EXPECTEDNESS ASSESSMENT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Section D – Expectedness Assessment</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              assessment.is_expected ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {assessment.is_expected ? 'EXPECTED (LISTED)' : 'UNEXPECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {assessment.expectedness_rationale}
          </p>
          {assessment.matched_medical_terms && assessment.matched_medical_terms.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700 block mb-1">Matched MedDRA Medical Terms:</span>
              <div className="flex flex-wrap gap-1.5">
                {assessment.matched_medical_terms.map((term, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-md border border-indigo-200 text-[11px] font-semibold">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION F – SUPPORTING REGULATORY & PRODUCT EVIDENCE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-sky-600" />
              Section F – Supporting Regulatory &amp; Product Evidence
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified passages from indexed reference corpus (NDCTR 2019, IPC PvPI, and approved Product Information)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            {assessment.citations?.length || 0} Grounded Passages
          </span>
        </div>

        <div className="space-y-3">
          {(assessment.citations || []).map((cit) => (
            <div key={cit.citation_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-900">{cit.document_title}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                  {cit.citation_id} {cit.page_number ? `| Page ${cit.page_number}` : ''}
                </span>
              </div>
              <div className="font-semibold text-sky-800 text-[11px]">{cit.section_or_clause}</div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px] leading-relaxed italic">
                "{cit.quoted_text}"
              </div>
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">Evidentiary Relevance:</span> {cit.relevance_rationale}
              </div>
            </div>
          ))}

          {(!assessment.citations || assessment.citations.length === 0) && (
            <div className="text-xs text-slate-400 italic p-6 text-center">
              No citations ground this assessment. Human review required.
            </div>
          )}
        </div>
      </div>

      {/* Confirmed vs Missing Facts Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block pb-1 border-b border-slate-100">Confirmed Facts</span>
          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            {(assessment.confirmed_facts || []).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-amber-800 block pb-1 border-b border-amber-100">Missing Facts / Gaps</span>
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

      {/* SECTION G – REVIEWER ACTIONS & DECISION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
              <UserCheck className="w-4 h-4 mr-2 text-sky-600" />
              Section G – Reviewer Actions &amp; Decision
            </span>
            <p className="text-xs text-slate-500 mt-0.5">Authorizing Qualified Person Responsible for Pharmacovigilance (QPPV)</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
            Mandatory Human Review
          </span>
        </div>

        {feedbackSent ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-medium flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Pharmacovigilance decision successfully recorded and committed to the audit trail!</span>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidentiary Grounding Rating</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-lg p-0.5 ${star <= feedbackRating ? 'text-amber-500' : 'text-slate-300'}`}
                    >
                      &starf;
                    </button>
                  ))}
                  <span className="text-slate-500 ml-2 font-semibold">({feedbackRating} / 5)</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reviewer Role</label>
                <select
                  value={feedbackRole}
                  onChange={(e) => setFeedbackRole(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                >
                  <option value="QPPV">Authorized QPPV</option>
                  <option value="Senior Safety Officer">Senior Safety Officer</option>
                  <option value="Medical Assessor">Medical Regulatory Assessor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reviewer Rationale &amp; Audit Notes</label>
              <textarea
                rows="2"
                placeholder="Confirm concordance with package insert and regulatory timelines..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => handleFeedbackSubmit('reject')}
                className="inline-flex items-center px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold transition-colors"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Assessment
              </button>
              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => handleFeedbackSubmit('request_info')}
                className="inline-flex items-center px-4 py-2 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold transition-colors"
              >
                <HelpCircle className="w-4 h-4 mr-1.5" />
                Request More Info
              </button>
              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => handleFeedbackSubmit('approve')}
                className="inline-flex items-center px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
