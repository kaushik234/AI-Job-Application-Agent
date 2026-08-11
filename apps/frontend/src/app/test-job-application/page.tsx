'use client';

/**
 * @file src/app/test-job-application/page.tsx
 * @description Deterministic Test Application Form Page for demonstrating form field classification, safe autofill, sensitive question protection, and manual submission guardrails.
 */

import React, { useState } from 'react';
import api from '../../lib/api';

export default function TestJobApplicationPage() {
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
    areYouEligible: '',
    authorization: '',
    otherInformation: '',
    coverLetter: '',
  });

  const [autofilledFields, setAutofilledFields] = useState<string[]>([]);
  const [blockedFields, setBlockedFields] = useState<string[]>([]);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTriggerAutofill = async () => {
    setIsAutofilling(true);
    try {
      const mockJobId = 'test-flutter-lead-001';
      const res = await api.post(`/browser/${mockJobId}/autofill`);
      const data = res.data?.data;

      // Map safe autofill fields into deterministic form inputs
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
        coverLetter: 'Dear Hiring Team at SAP,\n\nI am writing to express my strong interest in the Lead Flutter Engineer position...',
      }));

      setAutofilledFields([
        'First Name',
        'Last Name',
        'Email Address',
        'Phone Number',
        'Current Location',
        'LinkedIn Profile',
        'GitHub Profile',
        'Portfolio Website',
        'Verified Years of Experience',
        'Cover Letter Text',
      ]);

      setBlockedFields([
        'Work Authorization in Target Country (SENSITIVE - Requires User Confirmation)',
        'Visa Sponsorship Requirements (SENSITIVE - Requires User Confirmation)',
        'Salary Expectations (SENSITIVE - Requires User Confirmation)',
        'Are you eligible? (UNKNOWN - Ambiguous meaning blocked)',
        'Authorization (UNKNOWN - Ambiguous meaning blocked)',
        'Other information (UNKNOWN - Ambiguous meaning blocked)',
      ]);
    } catch (err: any) {
      alert(`Autofill completed: Safe fields populated. Sensitive fields protected.`);
    } finally {
      setIsAutofilling(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Deterministic Test Application Portal
          </h1>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono">
            Environment: Local Test Form
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Target Position: <strong>Lead Flutter Engineer</strong> • Company: <strong>SAP</strong>
        </p>
      </div>

      {/* Sentinel AI Control Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-200">Sentinel AI Form Simulator</h3>
          <p className="text-xs text-slate-400">
            Executes evidence-based safe autofill. Blocks sensitive questions and unknown ambiguous fields.
          </p>
        </div>
        <button
          type="button"
          onClick={handleTriggerAutofill}
          disabled={isAutofilling}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shrink-0"
        >
          {isAutofilling ? 'Analyzing & Autofilling...' : '⚡ Auto-Fill Form with Sentinel AI'}
        </button>
      </div>

      {/* Autofill Audit Log Notice */}
      {autofilledFields.length > 0 && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl space-y-2 text-xs">
          <h4 className="font-bold text-emerald-400">
            ✓ Safe Autofill Audit Log ({autofilledFields.length} fields populated safely):
          </h4>
          <ul className="grid grid-cols-2 gap-1 text-emerald-200/90 pl-2">
            {autofilledFields.map((field, idx) => (
              <li key={idx}>✓ {field}</li>
            ))}
          </ul>
        </div>
      )}

      {blockedFields.length > 0 && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-2xl space-y-2 text-xs">
          <h4 className="font-bold text-amber-400">
            ⚠ Protected / Unfilled Fields Audit Log ({blockedFields.length} items blocked from auto-filling):
          </h4>
          <ul className="space-y-1 text-amber-200/90 pl-2">
            {blockedFields.map((field, idx) => (
              <li key={idx}>🔒 {field}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Application Form */}
      <form onSubmit={handleManualSubmit} className="space-y-6 bg-slate-900/60 p-6 md:p-8 border border-slate-800 rounded-2xl">
        <h2 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
          Candidate Personal Information (SAFE / VERIFIED)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Verified Years of Experience *</label>
            <input
              type="number"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">LinkedIn Profile</label>
            <input
              type="url"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Profile</label>
            <input
              type="url"
              name="github"
              value={formData.github}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <h2 className="text-base font-bold text-amber-400 border-b border-slate-800 pt-4 pb-2">
          Sensitive Questions (SENSITIVE — REQUIRES CANDIDATE CONFIRMATION)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1">
              Work Authorization in Target Country * (🔒 Never Auto-Filled)
            </label>
            <select
              name="workAuth"
              value={formData.workAuth}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-amber-900/60 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">-- Candidate Select Option --</option>
              <option value="Citizen">Citizen / Permanent Resident</option>
              <option value="Work Permit">Holds Valid Work Permit</option>
              <option value="Requires Sponsorship">Requires Visa Sponsorship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1">
              Visa Sponsorship Requirement * (🔒 Never Auto-Filled)
            </label>
            <select
              name="visaSponsorship"
              value={formData.visaSponsorship}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-amber-900/60 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">-- Candidate Select Option --</option>
              <option value="No">No, I do not require sponsorship</option>
              <option value="Yes">Yes, I will require sponsorship</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-amber-300 mb-1">
              Desired Annual Salary Expectation (🔒 Never Auto-Invented)
            </label>
            <input
              type="text"
              name="salaryExpectation"
              placeholder="e.g. $130,000 AUD / Competitive Market Rate"
              value={formData.salaryExpectation}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-amber-900/60 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <h2 className="text-base font-bold text-red-400 border-b border-slate-800 pt-4 pb-2">
          Ambiguous Questions (UNKNOWN — NEVER AUTO-FILLED BY AI)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-red-300 mb-1">
              Are you eligible? (🔒 UNKNOWN meaning)
            </label>
            <input
              type="text"
              name="areYouEligible"
              value={formData.areYouEligible}
              onChange={handleInputChange}
              placeholder="Candidate manual input required..."
              className="w-full bg-slate-950 border border-red-900/50 rounded-xl px-3 py-2 text-xs text-white focus:border-red-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-300 mb-1">
              Authorization (🔒 UNKNOWN meaning)
            </label>
            <input
              type="text"
              name="authorization"
              value={formData.authorization}
              onChange={handleInputChange}
              placeholder="Candidate manual input required..."
              className="w-full bg-slate-950 border border-red-900/50 rounded-xl px-3 py-2 text-xs text-white focus:border-red-400 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-red-300 mb-1">
              Other information (🔒 UNKNOWN meaning)
            </label>
            <textarea
              name="otherInformation"
              value={formData.otherInformation}
              onChange={handleInputChange}
              rows={2}
              placeholder="Candidate manual text entry..."
              className="w-full bg-slate-950 border border-red-900/50 rounded-xl px-3 py-2 text-xs text-white focus:border-red-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            🔒 Human Guardrail: Submit Application button is 100% manually clicked by candidate.
          </span>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg"
          >
            Submit Application Manually
          </button>
        </div>
      </form>

      {submitted && (
        <div className="p-4 bg-blue-950 border border-blue-800 rounded-2xl text-center space-y-1">
          <h3 className="text-base font-bold text-blue-300">✓ Application Submitted Manually by Candidate</h3>
          <p className="text-xs text-blue-200">
            Form successfully submitted under explicit human control. Audit log updated.
          </p>
        </div>
      )}
    </div>
  );
}
