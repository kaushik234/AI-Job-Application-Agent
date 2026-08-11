'use client';

/**
 * @file src/app/demo-job-application/page.tsx
 * @description SENTINEL AI - DEMO / VERIFICATION MODE
 * Interactive local application website demonstrating form field classification, safe autofill, Cover Letter evidence verification audit, and strict manual submission guardrails.
 */

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function DemoJobApplicationPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    experienceYears: '',
    workAuth: '',
    visaSponsorship: '',
    salaryExpectation: '',
    education: '',
    coverLetter: '',
    areYouEligible: '',
    authorization: '',
    otherInformation: '',
  });

  const [formStatus, setFormStatus] = useState<'Loaded' | 'Analyzed' | 'Autofilled' | 'Awaiting Review' | 'Submitted'>('Loaded');
  const [submissionStatus, setSubmissionStatus] = useState<
    'NOT SUBMITTED' | 'SUBMITTED BY USER (Unverified)' | 'SUBMITTED BY USER' | 'SUBMISSION_UNVERIFIED' | 'EXTERNAL_SUBMISSION_CONFIRMED'
  >('NOT SUBMITTED');

  const [auditEvents, setAuditEvents] = useState<{ timestamp: string; action: string; result: string; source: string; details?: string }[]>([]);
  const [autofilledCount, setAutofilledCount] = useState(0);
  const [blockedSensitiveCount, setBlockedSensitiveCount] = useState(0);
  const [blockedUnknownCount, setBlockedUnknownCount] = useState(0);

  const [evidenceAudit, setEvidenceAudit] = useState<{
    claims: { claim: string; evidence: string; status: 'VERIFIED' | 'UNSUPPORTED'; sourceField?: string }[];
    verifiedCount: number;
    unsupportedCount: number;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    // Log initial FORM_LOADED event
    const loadTime = new Date().toLocaleTimeString();
    setAuditEvents([
      {
        timestamp: loadTime,
        action: 'FORM_LOADED',
        result: 'SUCCESS',
        source: 'DEMO_SITE',
        details: 'Portal loaded for Senior Flutter Developer at Demo Technologies (Sydney, AU)',
      },
    ]);

    // Fetch initial Cover Letter Evidence Audit
    api
      .get('/applications/demo-senior-flutter-dev/evidence-audit')
      .then((res) => {
        if (res.data?.data) {
          setEvidenceAudit(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo evidence data
        setEvidenceAudit({
          verifiedCount: 4,
          unsupportedCount: 1,
          claims: [
            {
              claim: '3.8 years of Flutter & mobile development experience',
              evidence: 'Master Profile → explicitExperienceYears = 3.8',
              status: 'VERIFIED',
            },
            {
              claim: 'Local database state management with SQLite and Hive',
              evidence: 'Safal Infosoft → Work Experience & Tech Stack',
              status: 'VERIFIED',
            },
            {
              claim: 'Architecture & state management using BLoC pattern',
              evidence: 'Master Profile → Frameworks (BLoC)',
              status: 'VERIFIED',
            },
            {
              claim: 'Cross-platform mobile application development',
              evidence: 'Safal Infosoft → Flutter Developer role (12/2023 - Present)',
              status: 'VERIFIED',
            },
            {
              claim: 'Led 50-person enterprise microservices optimization',
              evidence: 'No candidate evidence found in Master Resume',
              status: 'UNSUPPORTED',
            },
          ],
        });
      });
  }, []);

  const addAuditEvent = (action: string, result: string, source: string, details?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuditEvents((prev) => [{ timestamp, action, result, source, details }, ...prev]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 1. ANALYZE FORM
  const handleAnalyzeForm = async () => {
    setIsProcessing(true);
    try {
      addAuditEvent('FORM_ANALYZED', 'SUCCESS', 'SENTINEL_AI', 'Scanned 16 form fields. 9 SAFE, 4 SENSITIVE, 3 UNKNOWN detected.');
      setFormStatus('Analyzed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. SAFE AUTOFILL
  const handleSafeAutofill = async () => {
    setIsProcessing(true);
    try {
      // Map safe verified candidate facts ONLY
      setFormData((prev) => ({
        ...prev,
        firstName: 'Kaushik',
        lastName: 'Khandala',
        email: 'kaushik.khandala@example.com',
        phone: '+61 412 345 678',
        location: 'Sydney, Australia',
        linkedin: 'https://linkedin.com/in/kaushikkhandala',
        github: 'https://github.com/kaushikkhandala',
        portfolio: 'https://kaushikkhandala.dev',
        experienceYears: '3.8',
        education: 'Bachelor of Engineering in Computer Engineering (GTU, 2023)',
        coverLetter: `Dear Hiring Team at Demo Technologies,\n\nI am writing to express my strong interest in the Senior Flutter Developer position in Sydney. With 3.8 years of verified experience building high-performance mobile applications using Flutter, Dart, BLoC, SQLite, and Hive, I bring proven cross-platform engineering expertise to your team.\n\nAt Safal Infosoft, I developed scalable mobile solutions and state-managed features. I look forward to contributing to Demo Technologies.\n\nSincerely,\nKaushik Khandala`,
      }));

      setAutofilledCount(9);
      setBlockedSensitiveCount(4);
      setBlockedUnknownCount(3);

      addAuditEvent('FIELD_CLASSIFIED', 'SUCCESS', 'SYSTEM', 'Classified 9 fields as SAFE (confidence 1.0)');
      addAuditEvent('FIELD_AUTOFILLED', 'SUCCESS', 'MASTER_RESUME', 'Autofilled 9 safe candidate fields (Name, Email, Phone, Experience, Profiles)');
      addAuditEvent('SENSITIVE_FIELD_BLOCKED', 'BLOCKED', 'SECURITY_POLICY', 'Blocked Work Auth, Visa, Salary from auto-filling');
      addAuditEvent('UNKNOWN_FIELD_BLOCKED', 'BLOCKED', 'SECURITY_POLICY', 'Blocked ambiguous fields ("Are you eligible?", "Authorization")');

      setFormStatus('Autofilled');
      // Autofill MUST NEVER change submission status
      expectSubmissionUnchanged();
    } finally {
      setIsProcessing(false);
    }
  };

  const expectSubmissionUnchanged = () => {
    if (submissionStatus !== 'NOT SUBMITTED') {
      alert('CRITICAL SAFETY ALERT: Submission status was illegally mutated by autofill!');
    }
  };

  // 3. HUMAN REVIEW CHECKPOINT
  const handleOpenReview = () => {
    addAuditEvent('REVIEW_OPENED', 'SUCCESS', 'USER', 'Candidate opened Human Safety Checkpoint review modal');
    setFormStatus('Awaiting Review');
    setShowReviewModal(true);
  };

  // 4. MANUAL SUBMIT BY USER ONLY
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    try {
      await api.post('/applications/demo-senior-flutter-dev/submit-manual', { userConfirmed: true }).catch(() => {});

      setSubmissionStatus('SUBMITTED BY USER (Unverified)');
      setFormStatus('Submitted');
      setShowReviewModal(false);

      addAuditEvent('USER_SUBMITTED', 'SUCCESS', 'HUMAN_CANDIDATE', 'Explicit manual button click by candidate. Status set to USER_SUBMITTED / SUBMISSION_UNVERIFIED');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. SIMULATE EXTERNAL CONFIRMATION MATCH
  const handleSimulateExternalConfirmation = async () => {
    setIsProcessing(true);
    try {
      await api.post('/applications/demo-senior-flutter-dev/verify-external', {
        confirmationUrl: 'https://demo-technologies.com/applications/success/CONF-998241',
        confirmationNumber: 'CONF-998241',
      }).catch(() => {});

      setSubmissionStatus('EXTERNAL_SUBMISSION_CONFIRMED');
      addAuditEvent('EXTERNAL_VERIFICATION_STARTED', 'SUCCESS', 'SYSTEM', 'Scanned external portal for confirmation page URL & reference number');
      addAuditEvent('EXTERNAL_SUBMISSION_CONFIRMED', 'SUCCESS', 'SYSTEM', '🟢 External Submission Confirmed. Reference # CONF-998241 matched company Demo Technologies & Senior Flutter Developer role');
      alert('🟢 External Submission Confirmed! Sentinel verified reference # CONF-998241 on Demo Technologies portal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. SIMULATE EXTERNAL PLATFORM MISMATCH
  const handleSimulateMismatch = async () => {
    setIsProcessing(true);
    try {
      await api.post('/applications/demo-senior-flutter-dev/verify-external', {
        platformActivity: {
          company: 'App Big Dog',
          jobTitle: 'Founding Mobile Engineer (Flutter)',
          platform: 'SEEK',
        },
      }).catch(() => {});

      setSubmissionStatus('SUBMISSION_UNVERIFIED');
      addAuditEvent('EXTERNAL_VERIFICATION_STARTED', 'SUCCESS', 'SYSTEM', 'Scanning external platform activity...');
      addAuditEvent('EXTERNAL_VERIFICATION_FAILED', 'WARNING', 'SECURITY_POLICY', '🟡 Submission Recorded. External activity "Founding Mobile Engineer" at "App Big Dog" does not match target job "Senior Flutter Developer" at "Demo Technologies"');
      alert('🟡 Submission Unverified! External history shows different job ("App Big Dog - Founding Mobile Engineer"). Sentinel will NOT mark this as confirmed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-mono font-bold">
              SENTINEL AI — DEMO / VERIFICATION MODE
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono">
              Zero-AutoSubmit Environment
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">
            Demo Portal: Senior Flutter Developer
          </h1>
          <p className="text-xs text-slate-400">
            Demo Technologies • Sydney, Australia (Open to AU relocations)
          </p>
        </div>

        {/* Sentinel AI Control Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyzeForm}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition border border-slate-700"
          >
            1. Analyze Form
          </button>
          <button
            onClick={handleSafeAutofill}
            disabled={isProcessing}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-lg"
          >
            2. Safe Auto-Fill
          </button>
          <button
            onClick={handleOpenReview}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-lg"
          >
            3. Review Checkpoint
          </button>
          <button
            onClick={handleSimulateExternalConfirmation}
            disabled={isProcessing}
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-lg text-xs transition shadow-lg border border-teal-500/40"
          >
            🟢 Verify External Success
          </button>
          <button
            onClick={handleSimulateMismatch}
            disabled={isProcessing}
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-100 font-bold rounded-lg text-xs transition shadow-lg border border-amber-600/40"
          >
            🟡 Test History Mismatch
          </button>
        </div>
      </div>

      {/* Grid: Left = Application Form | Right = Realtime Sentinel AI Monitor Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Demo Application Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleManualSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
            
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200">Candidate Information (SAFE / VERIFIED)</h2>
              <span className="text-[10px] text-emerald-400 font-mono">Autofill Allowed ✓</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Verified Experience Years *</label>
                <input
                  type="text"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">GitHub Profile</label>
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Cover Letter Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Letter Text</label>
              <textarea
                name="coverLetter"
                value={formData.coverLetter}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* SENSITIVE QUESTIONS */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400">Sensitive Questions (REQUIRES CANDIDATE CONFIRMATION)</h3>
                <span className="text-[10px] text-amber-400 font-mono">🔒 Auto-Fill Blocked</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-amber-200 font-semibold mb-1">Work Authorization *</label>
                  <select
                    name="workAuth"
                    value={formData.workAuth}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-amber-900/60 rounded-lg px-3 py-1.5 text-amber-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">-- Candidate Select Option --</option>
                    <option value="Citizen">Citizen / PR</option>
                    <option value="Work Permit">Valid Work Permit</option>
                    <option value="Sponsorship Required">Requires Sponsorship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-amber-200 font-semibold mb-1">Visa Sponsorship *</label>
                  <select
                    name="visaSponsorship"
                    value={formData.visaSponsorship}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-amber-900/60 rounded-lg px-3 py-1.5 text-amber-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">-- Candidate Select Option --</option>
                    <option value="No">No, sponsorship not required</option>
                    <option value="Yes">Yes, sponsorship required</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-amber-200 font-semibold mb-1">Salary Expectation</label>
                  <input
                    type="text"
                    name="salaryExpectation"
                    placeholder="e.g. $130,000 AUD / Competitive Market Rate"
                    value={formData.salaryExpectation}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-amber-900/60 rounded-lg px-3 py-1.5 text-amber-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* AMBIGUOUS UNKNOWN QUESTIONS */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-red-400">Ambiguous Questions (UNKNOWN MEANING)</h3>
                <span className="text-[10px] text-red-400 font-mono">🔒 Never Auto-Invented</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-red-200 font-semibold mb-1">Are you eligible?</label>
                  <input
                    type="text"
                    name="areYouEligible"
                    value={formData.areYouEligible}
                    onChange={handleInputChange}
                    placeholder="Candidate manual input..."
                    className="w-full bg-slate-950 border border-red-900/50 rounded-lg px-3 py-1.5 text-red-100 focus:border-red-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-red-200 font-semibold mb-1">Authorization</label>
                  <input
                    type="text"
                    name="authorization"
                    value={formData.authorization}
                    onChange={handleInputChange}
                    placeholder="Candidate manual input..."
                    className="w-full bg-slate-950 border border-red-900/50 rounded-lg px-3 py-1.5 text-red-100 focus:border-red-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                🔒 Final submission is 100% under candidate control.
              </span>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg"
              >
                Submit Application Manually
              </button>
            </div>
          </form>

          {/* COVER LETTER DEMO WITH EVIDENCE AUDIT SECTION */}
          {evidenceAudit && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-slate-200 text-xs">AI Generated Cover Letter & Evidence Audit</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono">
                  {evidenceAudit.verifiedCount} Claims Verified • {evidenceAudit.unsupportedCount} Unsupported Excluded
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 text-[11px]">Why this letter was generated:</h4>
                <div className="space-y-1.5">
                  {evidenceAudit.claims.map((claim, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        claim.status === 'VERIFIED'
                          ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                          : 'bg-amber-950/30 border-amber-900/50 text-amber-200'
                      }`}
                    >
                      <div>
                        <span className="font-semibold block">{claim.claim}</span>
                        <span className="text-[10px] text-slate-400">Evidence: {claim.evidence}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          claim.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {claim.status === 'VERIFIED' ? '✓ VERIFIED' : '⚠ UNSUPPORTED CLAIM'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Realtime Sentinel AI Monitor Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Status Monitor Display Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-slate-200 text-xs flex items-center justify-between">
              <span>Sentinel AI Monitor Panel</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">FORM STATUS</span>
                <span className="font-bold text-sky-400 text-sm font-mono">{formStatus}</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">SUBMISSION STATUS</span>
                <span
                  className={`font-bold text-sm font-mono ${
                    submissionStatus === 'SUBMITTED BY USER' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {submissionStatus}
                </span>
              </div>
            </div>

            {/* Field Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-300">
                <span className="font-mono text-base font-bold block">{autofilledCount}</span>
                <span>Safe Filled</span>
              </div>
              <div className="p-2 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-300">
                <span className="font-mono text-base font-bold block">{blockedSensitiveCount}</span>
                <span>Sensitive Blocked</span>
              </div>
              <div className="p-2 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300">
                <span className="font-mono text-base font-bold block">{blockedUnknownCount}</span>
                <span>Unknown Blocked</span>
              </div>
            </div>
          </div>

          {/* Realtime Event Audit Log Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="font-bold text-slate-200 text-xs flex items-center justify-between">
              <span>Network & Event Audit Feed</span>
              <span className="text-[10px] text-slate-400 font-mono">{auditEvents.length} events logged</span>
            </h3>

            <div className="max-h-[380px] overflow-y-auto space-y-2 font-mono text-[10px]">
              {auditEvents.map((evt, idx) => (
                <div key={idx} className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{evt.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        evt.result === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {evt.action}
                    </span>
                  </div>
                  <div className="text-slate-300 font-sans truncate">{evt.details}</div>
                  <div className="text-slate-500 text-[9px]">Source: {evt.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Human Review Safety Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 text-xs text-slate-200">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Human Safety Checkpoint</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 text-[10px] font-mono">
                Manual Control
              </span>
            </h3>

            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-1">
              <p className="text-blue-200">
                Sentinel AI can analyze the application and safely autofill verified candidate fields.
              </p>
              <p className="text-blue-300 font-bold">
                Sentinel AI NEVER automatically submits an application. Final submit remains 100% under human control.
              </p>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span>✓ Candidate Verification</span>
                <span className="text-emerald-400 font-bold">Passed</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span>✓ Document Ownership</span>
                <span className="text-emerald-400 font-bold">Verified (Senior Flutter Dev)</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span>✓ Readiness Score</span>
                <span className="text-emerald-400 font-bold">100%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span>✓ Form Analysis</span>
                <span className="text-emerald-400 font-bold">9 Safe Filled, 7 Protected</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
              >
                Close Checkpoint
              </button>
              <button
                onClick={() => handleManualSubmit()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Submit Application Manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
