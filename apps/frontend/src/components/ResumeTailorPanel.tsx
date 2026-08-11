/**
 * @file src/components/ResumeTailorPanel.tsx
 * @description Candidate Master Resume editor and AI ATS Resume & Cover Letter PDF Generator view.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { MasterResume, TailoredResume, CoverLetter } from '@sentinel/types';
import { Sparkles, Save, FileText, Download, Check, Shield, Eye, Edit3 } from 'lucide-react';

interface ResumeTailorPanelProps {
  masterResume: MasterResume;
  onSaveMasterResume: (updated: MasterResume) => Promise<void>;
  tailoredResumes: TailoredResume[];
  coverLetters: CoverLetter[];
}

export const ResumeTailorPanel: React.FC<ResumeTailorPanelProps> = ({
  masterResume,
  onSaveMasterResume,
  tailoredResumes,
  coverLetters,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'master' | 'tailored'>('master');
  const [resumeData, setResumeData] = useState<MasterResume>(masterResume);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Selected PDF viewer target
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(
    tailoredResumes[0]?.pdfDataUrl || coverLetters[0]?.pdfDataUrl || null
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveMasterResume(resumeData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('master')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'master'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Master Profile & Experience</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tailored')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'tailored'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generated ATS Resumes & Cover Letters ({tailoredResumes.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Strict Zero Fabrication Rule Enforced</span>
        </div>
      </div>

      {/* MASTER RESUME TAB */}
      {activeSubTab === 'master' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Candidate Master Profile</h3>
              <p className="text-xs text-slate-400">
                Primary factual source for AI tailoring. The agent reorganizes these details for specific applications.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved Master' : 'Save Changes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Full Name</label>
              <input
                type="text"
                value={resumeData.fullName}
                onChange={(e) => setResumeData({ ...resumeData, fullName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Email</label>
              <input
                type="text"
                value={resumeData.email}
                onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Phone</label>
              <input
                type="text"
                value={resumeData.phone}
                onChange={(e) => setResumeData({ ...resumeData, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Location & Visa Eligibility</label>
              <input
                type="text"
                value={resumeData.location}
                onChange={(e) => setResumeData({ ...resumeData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Professional Summary */}
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-300 font-semibold">Core Professional Summary</label>
            <textarea
              rows={3}
              value={resumeData.summary}
              onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Technical Skills Categories */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-indigo-400">Technical Skills Repository</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-300">Languages & Core:</span>
                <p className="text-slate-200">{resumeData.skills.languages.join(', ')}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-300">Frameworks & Web:</span>
                <p className="text-slate-200">{resumeData.skills.frameworks.join(', ')}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-300">Cloud & DevOps:</span>
                <p className="text-slate-200">{resumeData.skills.cloudAndDevOps.join(', ')}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-300">Databases & ORM:</span>
                <p className="text-slate-200">{resumeData.skills.databases.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAILORED RESUMES & COVER LETTERS TAB */}
      {activeSubTab === 'tailored' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of generated PDF versions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Generated PDF Artifacts
            </h3>

            {tailoredResumes.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
                No tailored resumes generated yet. Search jobs and click <strong>"Tailor & Apply"</strong> to automatically generate ATS PDFs.
              </div>
            ) : (
              tailoredResumes.map((res) => {
                const associatedCover = coverLetters.find((c) => c.jobId === res.jobId);
                return (
                  <div
                    key={res.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{res.company}</div>
                      <div className="text-indigo-400 font-medium">{res.jobTitle}</div>
                      <div className="text-[10px] text-slate-500">Generated: {res.generatedAt.split('T')[0]}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800">
                      {res.pdfDataUrl && (
                        <button
                          onClick={() => setPreviewPdfUrl(res.pdfDataUrl!)}
                          className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-indigo-600/30"
                        >
                          <Eye className="w-3 h-3" /> View Resume PDF
                        </button>
                      )}

                      {associatedCover?.pdfDataUrl && (
                        <button
                          onClick={() => setPreviewPdfUrl(associatedCover.pdfDataUrl!)}
                          className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-cyan-600/30"
                        >
                          <Eye className="w-3 h-3" /> View Cover Letter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Embedded PDF Previewer */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> ATS-Friendly PDF Viewer
              </span>
              {previewPdfUrl && (
                <a
                  href={previewPdfUrl}
                  download="Tailored_Document.pdf"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
              )}
            </div>

            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                className="w-full h-[600px] rounded-lg border border-slate-800"
                title="PDF Resume Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs gap-2 py-12">
                <FileText className="w-8 h-8 text-slate-600" />
                <span>Select a generated resume or cover letter from the left list to view PDF</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
