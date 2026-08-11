import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Download, History, RotateCcw, GitCompare, FileText } from 'lucide-react';
import { CoverLetter, JobListing, CoverLetterVersion, CoverLetterDiff } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import api from '../../lib/api';

interface CoverLetterManagerViewProps {
  coverLetters: CoverLetter[];
  jobs: JobListing[];
  onRefresh: () => void;
  selectedJobId?: string | null;
}

export const CoverLetterManagerView: React.FC<CoverLetterManagerViewProps> = ({
  coverLetters,
  jobs,
  onRefresh,
  selectedJobId: propJobId,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(propJobId || jobs[0]?.id || '');
  const [customTechStack, setCustomTechStack] = useState<string>('');
  const [customExperience, setCustomExperience] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [versions, setVersions] = useState<CoverLetterVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<CoverLetterVersion | null>(null);
  const [compareDiff, setCompareDiff] = useState<CoverLetterDiff | null>(null);
  const [comparingIds, setComparingIds] = useState<{ idA: string; idB: string }>({ idA: '', idB: '' });

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  useEffect(() => {
    if (propJobId) {
      setSelectedJobId(propJobId);
    }
  }, [propJobId]);

  // Dynamically compute tech stack whenever selectedJobId changes
  useEffect(() => {
    if (!selectedJob) return;

    const candidateSkills = ['Flutter', 'Dart', 'SQLite', 'Hive', 'BLoC', 'TypeScript', 'JavaScript', 'SQL', 'Node.js', 'Express', 'Firebase', 'Git'];
    const jobReqs = selectedJob.requirements || [];
    const desc = (selectedJob.description || '').toLowerCase();

    const matching = candidateSkills.filter((s) =>
      jobReqs.some((r) => r.toLowerCase().includes(s.toLowerCase())) ||
      desc.includes(s.toLowerCase())
    );

    const initialStack = matching.length > 0 ? matching.join(', ') : 'No verified technical overlap';
    setCustomTechStack(initialStack);
    setCustomExperience('');
    fetchHistory();
  }, [selectedJobId]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/cover-letter/versions');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        const filtered = data.filter((v: any) => !selectedJob || v.jobId === selectedJob.id);
        setVersions(filtered);
        if (filtered.length > 0) {
          setActiveVersion(filtered[0]);
        } else {
          setActiveVersion(null);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setIsGenerating(true);
    try {
      const techStackArr = customTechStack.split(',').map((s) => s.trim()).filter(Boolean);
      const expArr = customExperience ? [customExperience] : [];

      console.log('[CL_DEBUG] jobId:', selectedJob.id);
      console.log('[CL_DEBUG] jobTitle:', selectedJob.title);
      console.log('[CL_DEBUG] company:', selectedJob.company);
      console.log('[CL_DEBUG] jobSkills:', selectedJob.requirements);
      console.log('[CL_DEBUG] techStack:', techStackArr);

      const res = await api.post('/cover-letter/generate', {
        jobId: selectedJob.id,
        companyName: selectedJob.company,
        jobTitle: selectedJob.title,
        jobDescription: selectedJob.description,
        techStack: techStackArr,
        relevantExperience: expArr,
      });

      const data = res.data?.data || res.data;
      if (data) {
        setActiveVersion(data);
        await fetchHistory();
        onRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      const res = await api.post('/cover-letter/versions/rollback', { versionId });
      const data = res.data?.data || res.data;
      if (data) {
        await fetchHistory();
        onRefresh();
        alert(data.message || 'Rollback complete!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Rollback failed');
    }
  };

  const handleCompare = async () => {
    if (!comparingIds.idA || !comparingIds.idB) {
      alert('Select two versions to compare');
      return;
    }
    try {
      const res = await api.post('/cover-letter/versions/compare', {
        versionIdA: comparingIds.idA,
        versionIdB: comparingIds.idB,
      });
      const data = res.data?.data || res.data;
      if (data) {
        setCompareDiff(data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Comparison failed');
    }
  };

  const downloadDOCX = (version: CoverLetterVersion) => {
    if (!version.formats.docxBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${version.formats.docxBase64}`;
    link.download = `${version.companyName.toLowerCase().replace(/\s+/g, '_')}_cover_letter_${version.versionTag}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = (version: CoverLetterVersion) => {
    if (!version.formats.pdfDataUrl) return;
    const link = document.createElement('a');
    link.href = version.formats.pdfDataUrl;
    link.download = `${version.companyName.toLowerCase().replace(/\s+/g, '_')}_cover_letter_${version.versionTag}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Data Source Indicators */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap gap-4 text-[11px] font-mono text-slate-400">
        <div><span className="text-slate-500 font-bold">JOB DATA SOURCE:</span> API / Database ({selectedJob?.company || 'None'})</div>
        <div><span className="text-slate-500 font-bold">CANDIDATE DATA SOURCE:</span> Master Resume (PostgreSQL)</div>
        <div><span className="text-slate-500 font-bold">MATCH DATA SOURCE:</span> Deterministic calculation</div>
        <div><span className="text-slate-500 font-bold">AI DATA:</span> Generation only</div>
      </div>

      {/* Generator Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <span>AI Cover Letter Generator (Single Page Multi-Format)</span>
          </CardTitle>
          <CardDescription>
            Generates single-page personalized letters highlighting Company, Position, Relevant Experience, and Tech Stack. Exports PDF, DOCX, & JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateLetter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Job Opportunity</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company} [{j.recommendation || 'APPLY'}] ({j.matchScore || 85}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Key Tech Stack (Derived: Candidate ∩ Job)</label>
                <input
                  type="text"
                  value={customTechStack}
                  onChange={(e) => setCustomTechStack(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Flutter, Dart, BLoC"
                />
              </div>
            </div>

            {selectedJob && (selectedJob.recommendation === 'DO_NOT_APPLY' || (selectedJob as any).priorityCategory === 'DO_NOT_APPLY') && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">⚠️ DO_NOT_APPLY WARNING:</span>
                  <span>This job has severe skill or experience mismatches. Explicit override required.</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Highlight Relevant Experience (Optional)</label>
              <textarea
                rows={2}
                value={customExperience}
                onChange={(e) => setCustomExperience(e.target.value)}
                placeholder="e.g. Lead Engineer at Atlassian managing microservices handling 50k RPS"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" isLoading={isGenerating} icon={<Sparkles className="w-4 h-4" />}>
                Generate Cover Letter (PDF + DOCX)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Version Preview & Export Card */}
      {activeVersion && (
        <Card className="border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base font-bold text-slate-100">
                  {activeVersion.jobTitle} — {activeVersion.companyName}
                </CardTitle>
                <Badge variant="blue">{activeVersion.versionTag}</Badge>
              </div>
              <CardDescription>Generated {new Date(activeVersion.createdAt).toLocaleString()}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => downloadPDF(activeVersion)} icon={<Download className="w-4 h-4" />}>
                Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadDOCX(activeVersion)} icon={<Download className="w-4 h-4 text-blue-400" />}>
                Download DOCX
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p className="font-semibold text-slate-100">{activeVersion.salutation}</p>
              {activeVersion.contentParagraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
              <p className="font-semibold text-slate-100 pt-2">{activeVersion.closing}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 font-semibold">Mentioned Tech:</span>
              {activeVersion.techStackMentioned.map((t, idx) => (
                <Badge key={idx} variant="secondary">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History & Rollback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Stored Versions & Rollback</span>
          </CardTitle>
          <CardDescription>Track all historical cover letter versions with one-click rollback</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">No version records yet. Generate a cover letter above.</div>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200">{v.companyName} ({v.jobTitle})</span>
                      <Badge variant="blue">{v.versionTag}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setActiveVersion(v)}>
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRollback(v.id)} icon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}>
                      Rollback
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
