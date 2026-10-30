import React, { useState, useEffect } from 'react';
import { 
  FileText, Send, Sparkles, AlertCircle, CheckCircle2, Clock, 
  ShieldAlert, User, Pill, Stethoscope, AlertTriangle, Check, X
} from 'lucide-react';
import { api } from '../api/client';

export default function ReportSubmission({ onRunStarted, initialPreset, onOpenDemoModal, onClearPreset }) {
  const [formData, setFormData] = useState({
    suspect_drug: '',
    product_identifier: '',
    batch_number: '',
    reaction_description: '',
    patient_age: '',
    patient_sex: 'unknown',
    medical_history: '',
    onset_relative_days: '',
    drug_start_date: '',
    drug_stop_date: '',
    outcome: 'unknown',
    is_death: false,
    is_life_threatening: false,
    is_hospitalized: false,
    is_disability: false,
    is_congenital_anomaly: false,
    is_other_medically_important: false,
    reporter_type: 'physician',
    source_type: 'spontaneous',
    concomitant_medications_raw: '',
    idempotency_key: `case-${Date.now()}`
  });

  const [presetBanner, setPresetBanner] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [activePollRunId, setActivePollRunId] = useState(null);
  const [pollStatus, setPollStatus] = useState(null);

  // Apply initialPreset if passed from DemoModal
  useEffect(() => {
    if (initialPreset && initialPreset.data) {
      setFormData(prev => ({
        ...prev,
        ...initialPreset.data,
        is_other_medically_important: initialPreset.data.is_medically_important || initialPreset.data.is_other_medically_important || false,
        medical_history: initialPreset.data.patient_medical_history || initialPreset.data.medical_history || '',
        idempotency_key: initialPreset.data.idempotency_key || `case-${Date.now()}`
      }));
      setPresetBanner(initialPreset.title);
    }
  }, [initialPreset]);

  // Handle Form Change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Pre-submission validation
  const validate = () => {
    if (!formData.suspect_drug.trim()) {
      return 'Suspected medicinal product name is required.';
    }
    if (!formData.reaction_description.trim()) {
      return 'Reported reaction description in reporter’s own words is required.';
    }
    if (formData.reaction_description.trim().length < 5) {
      return 'Reported reaction description must be at least 5 characters long.';
    }
    if (formData.patient_age !== '' && (Number(formData.patient_age) < 0 || Number(formData.patient_age) > 130)) {
      return 'Patient age must be between 0 and 130 years.';
    }
    return null;
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setSubmissionError(err);
      return;
    }
    setSubmissionError(null);
    setShowConfirmModal(true);
  };

  const executeSubmission = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setSubmissionError(null);

    // Map fields cleanly to AdverseEventReportCreate schema
    const payload = {
      suspect_drug: formData.suspect_drug.trim(),
      product_identifier: formData.product_identifier.trim() ? (
        formData.batch_number.trim() 
          ? `${formData.product_identifier.trim()} (Batch: ${formData.batch_number.trim()})`
          : formData.product_identifier.trim()
      ) : null,
      reaction_description: formData.reaction_description.trim(),
      patient_age: formData.patient_age !== '' ? parseInt(formData.patient_age, 10) : null,
      patient_sex: formData.patient_sex,
      medical_history: formData.medical_history.trim() || null,
      onset_relative_days: formData.onset_relative_days !== '' ? parseInt(formData.onset_relative_days, 10) : null,
      drug_start_date: formData.drug_start_date || null,
      drug_stop_date: formData.drug_stop_date || null,
      outcome: formData.outcome,
      is_death: !!formData.is_death,
      is_life_threatening: !!formData.is_life_threatening,
      is_hospitalized: !!formData.is_hospitalized,
      is_disability: !!formData.is_disability,
      is_congenital_anomaly: !!formData.is_congenital_anomaly,
      is_other_medically_important: !!formData.is_other_medically_important,
      reporter_type: formData.reporter_type,
      source_type: formData.source_type,
      concomitant_medications: formData.concomitant_medications_raw
        ? formData.concomitant_medications_raw.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      idempotency_key: formData.idempotency_key || `case-${Date.now()}`
    };

    try {
      const response = await api.submitReport(payload);
      setActivePollRunId(response.run_id);
      setPollStatus('Validating boundary schema & guardrails...');
      
      // Start honest polling for multi-agent completion
      pollRunCompletion(response.run_id);
    } catch (err) {
      setSubmitting(false);
      setSubmissionError(err.message || 'Error submitting adverse event report.');
    }
  };

  const pollRunCompletion = (runId) => {
    const pollInterval = setInterval(async () => {
      try {
        const runData = await api.getRunStatus(runId);
        
        // Multi-stage realistic progress indicator based on actual agent run state
        if (runData.status === 'queued') {
          setPollStatus('Report accepted. Queuing multi-agent execution pipeline...');
        } else if (runData.status === 'running') {
          setPollStatus('Agent A researching regulatory corpus & Agent B assessing seriousness criteria...');
        } else if (runData.status === 'completed' || runData.status === 'escalated') {
          clearInterval(pollInterval);
          setPollStatus('Assessment complete. Grounding verified against approved reference corpus.');
          setTimeout(() => {
            setSubmitting(false);
            if (onRunStarted) {
              onRunStarted(runId);
            }
          }, 800);
        } else if (runData.status === 'failed') {
          clearInterval(pollInterval);
          setSubmitting(false);
          setSubmissionError(`Assessment pipeline error: ${runData.escalation_reason || 'Agent execution failed'}`);
        }
      } catch (e) {
        clearInterval(pollInterval);
        setSubmitting(false);
        setSubmissionError(`Polling error: ${e.message}`);
      }
    }, 1000);
  };

  const resetForm = () => {
    setFormData({
      suspect_drug: '',
      product_identifier: '',
      batch_number: '',
      reaction_description: '',
      patient_age: '',
      patient_sex: 'unknown',
      medical_history: '',
      onset_relative_days: '',
      drug_start_date: '',
      drug_stop_date: '',
      outcome: 'unknown',
      is_death: false,
      is_life_threatening: false,
      is_hospitalized: false,
      is_disability: false,
      is_congenital_anomaly: false,
      is_other_medically_important: false,
      reporter_type: 'physician',
      source_type: 'spontaneous',
      concomitant_medications_raw: '',
      idempotency_key: `case-${Date.now()}`
    });
    setPresetBanner(null);
    setSubmissionError(null);
    if (onClearPreset) onClearPreset();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Submit Adverse Event Report</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter the details of the suspected medicine and reported reaction.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenDemoModal}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Demo / Testing Scenarios
          </button>
        </div>
      </div>

      {/* Preset Loaded Alert Banner */}
      {presetBanner && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>Demo Scenario Loaded:</strong> {presetBanner}
            </span>
          </div>
          <button
            onClick={resetForm}
            className="text-indigo-600 hover:text-indigo-800 font-semibold underline ml-3"
          >
            Clear / Reset Form
          </button>
        </div>
      )}

      {/* Error Banner */}
      {submissionError && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold">Validation or Ingestion Error:</strong>
            <p className="mt-0.5 leading-relaxed">{submissionError}</p>
          </div>
          <button onClick={() => setSubmissionError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Processing State Overlay */}
      {submitting && (
        <div className="bg-white p-8 rounded-2xl border border-sky-200 shadow-md text-center space-y-4">
          <Clock className="w-10 h-10 animate-spin text-sky-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Multi-Agent Assessment In Progress</h3>
            <p className="text-xs text-sky-700 font-medium mt-1">{pollStatus || 'Processing report...'}</p>
          </div>
          <div className="max-w-md mx-auto bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-600 h-full w-2/3 animate-pulse rounded-full"></div>
          </div>
          <p className="text-[11px] text-slate-500">
            Agent A (Evidence Research) and Agent B (Seriousness &amp; Expectedness) are evaluating regulatory provisions...
          </p>
        </div>
      )}

      {/* Main 5-Section Form */}
      {!submitting && (
        <form onSubmit={handleOpenConfirm} className="space-y-6">
          {/* SECTION A – MEDICINAL PRODUCT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Section A – Medicinal Product</h2>
                <p className="text-xs text-slate-500">Specify the suspect drug and identification details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Suspected Medicinal Product <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carbamazepine"
                  value={formData.suspect_drug}
                  onChange={(e) => handleChange('suspect_drug', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Generic or INN name required for corpus matching</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brand / Product Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tegretol 200mg Tablets"
                  value={formData.product_identifier}
                  onChange={(e) => handleChange('product_identifier', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Commercial trade name or strength</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Batch Number (if available)
                </label>
                <input
                  type="text"
                  placeholder="e.g. B2026-CBZ01"
                  value={formData.batch_number}
                  onChange={(e) => handleChange('batch_number', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Manufacturing lot number</p>
              </div>
            </div>
          </div>

          {/* SECTION B – PATIENT INFORMATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Section B – Patient Information</h2>
                <p className="text-xs text-slate-500">Demographic and relevant clinical background</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Age (years)</label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  placeholder="e.g. 34"
                  value={formData.patient_age}
                  onChange={(e) => handleChange('patient_age', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Sex</label>
                <select
                  value={formData.patient_sex}
                  onChange={(e) => handleChange('patient_sex', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relevant Medical History</label>
                <input
                  type="text"
                  placeholder="e.g. Epilepsy, hypertension"
                  value={formData.medical_history}
                  onChange={(e) => handleChange('medical_history', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION C – ADVERSE REACTION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Section C – Adverse Reaction</h2>
                <p className="text-xs text-slate-500">Detailed narrative and timeline of the reported event</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reported Reaction in Reporter's Own Words <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital with blistering lesions."
                  value={formData.reaction_description}
                  onChange={(e) => handleChange('reaction_description', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Provide verbatim clinical or patient description</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relative Onset (Days)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 7"
                    value={formData.onset_relative_days}
                    onChange={(e) => handleChange('onset_relative_days', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Days between drug start and reaction</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Outcome</label>
                  <select
                    value={formData.outcome}
                    onChange={(e) => handleChange('outcome', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  >
                    <option value="recovered">Recovered / Resolved</option>
                    <option value="recovering">Recovering / Resolving</option>
                    <option value="not_recovered">Not Recovered / Ongoing</option>
                    <option value="fatal">Fatal</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Concomitant Medications</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol, Clobazam"
                    value={formData.concomitant_medications_raw}
                    onChange={(e) => handleChange('concomitant_medications_raw', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Comma-separated list of other drugs</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D – SERIOUSNESS INDICATORS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Section D – Seriousness Indicators (ICH E2A / NDCTR 2019)</h2>
                <p className="text-xs text-slate-500">Select any regulatory seriousness criteria that apply to this event</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_hospitalized ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_hospitalized}
                  onChange={(e) => handleChange('is_hospitalized', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Inpatient Hospitalization</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_life_threatening ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_life_threatening}
                  onChange={(e) => handleChange('is_life_threatening', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Life-Threatening</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_death ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_death}
                  onChange={(e) => handleChange('is_death', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Resulted in Death</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_disability ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_disability}
                  onChange={(e) => handleChange('is_disability', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Persistent Disability / Incapacity</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_congenital_anomaly ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_congenital_anomaly}
                  onChange={(e) => handleChange('is_congenital_anomaly', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Congenital Anomaly / Birth Defect</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                formData.is_other_medically_important ? 'bg-rose-50/50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.is_other_medically_important}
                  onChange={(e) => handleChange('is_other_medically_important', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium">Other Medically Important Event</span>
              </label>
            </div>
          </div>

          {/* SECTION E – REPORTER INFORMATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Section E – Reporter Information</h2>
                <p className="text-xs text-slate-500">Source credentials and qualification</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reporter Type</label>
                <select
                  value={formData.reporter_type}
                  onChange={(e) => handleChange('reporter_type', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                >
                  <option value="physician">Physician / Medical Specialist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="other_hcp">Other Healthcare Professional</option>
                  <option value="consumer">Consumer / Patient / Relative</option>
                  <option value="literature">Scientific Literature</option>
                  <option value="regulator">Regulatory Authority</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intake Source Channel</label>
                <select
                  value={formData.source_type}
                  onChange={(e) => handleChange('source_type', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                >
                  <option value="spontaneous">Spontaneous Notification</option>
                  <option value="clinical_trial">Clinical Trial Protocol</option>
                  <option value="post_marketing_study">Post-Marketing Surveillance Study</option>
                  <option value="literature">Literature Search</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all"
            >
              <Send className="w-4 h-4 mr-2" />
              Review &amp; Submit Case
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Report Submission</h3>
                <p className="text-xs text-slate-500">Initiate automated multi-agent assessment</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Suspect Drug:</span>
                <span className="font-semibold text-slate-800">{formData.suspect_drug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">
                  {formData.patient_age ? `${formData.patient_age} yrs, ` : ''}{formData.patient_sex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seriousness:</span>
                <span className={`font-semibold ${
                  formData.is_hospitalized || formData.is_death || formData.is_life_threatening || formData.is_disability
                    ? 'text-rose-600'
                    : 'text-slate-700'
                }`}>
                  {formData.is_hospitalized || formData.is_death || formData.is_life_threatening || formData.is_disability
                    ? 'Serious Criteria Flagged'
                    : 'Non-Serious'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Submitting this case will trigger boundary validation, corpus retrieval across NDCTR 2019 / IPC PvPI provisions, and generate an evidence-grounded recommendation.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSubmission}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm"
              >
                Confirm &amp; Triage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
