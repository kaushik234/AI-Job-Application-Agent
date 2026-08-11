import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileText,
  Save,
  Sparkles,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Award,
  Layers,
  FileCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { MasterResume, TailoredResume } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import api from '../../lib/api';

interface ResumeManagerViewProps {
  masterResume: MasterResume | null;
  tailoredResumes: TailoredResume[];
  onRefresh: () => void;
  initialTab?: 'master' | 'tailored' | 'history';
  selectedJobId?: string | null;
}

export const ResumeManagerView: React.FC<ResumeManagerViewProps> = ({
  masterResume,
  tailoredResumes,
  onRefresh,
  initialTab = 'master',
  selectedJobId,
}) => {
  const [activeTab, setActiveTab] = useState<'master' | 'tailored' | 'history'>(initialTab);
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [resumeHistory, setResumeHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/resume/versions');
      setResumeHistory(res.data || []);
    } catch (err) {
      console.error('Failed to fetch resume history versions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const defaultMaster: MasterResume = masterResume || {
    fullName: 'Kaushik Khandala',
    email: 'kaushikkhandalakaushik234@gmail.com',
    phone: '+91 8849170743',
    location: 'Ahmedabad, India',
    linkedIn: 'https://linkedin.com/in/kaushikkhandala',
    github: 'https://github.com/kaushikkhandala',
    portfolio: 'https://kaushikkhandala.dev',
    summary:
      'Flutter Developer with 3.8 years of experience building cross-platform mobile applications in Flutter and Dart.',
    skills: {
      languages: ['Dart'],
      frameworks: ['Flutter', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite', 'Hive'],
      tools: ['Git', 'VSCode', 'Android Studio'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Ahmedabad, India',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built cross-platform mobile apps with BLoC and Firebase.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      },
      {
        company: 'Potenz Technology',
        role: 'Flutter Developer',
        location: 'Ahmedabad, India',
        startDate: '01/2023',
        endDate: '11/2023',
        highlights: ['Developed mobile features using Flutter & Dart.'],
        technologiesUsed: ['Flutter', 'Dart', 'REST APIs'],
      },
      {
        company: 'Potenz Technology',
        role: 'Operations Manager',
        location: 'Ahmedabad, India',
        startDate: '07/2022',
        endDate: '01/2023',
        highlights: ['Managed tech team operations.'],
        technologiesUsed: ['Flutter', 'Dart', 'Operations'],
      },
    ],
    education: [
      {
        institution: 'Sal Engineering & Technical Institute',
        degree: 'B.E',
        fieldOfStudy: 'Information Technology',
        graduationYear: '2022',
      },
    ],
    certifications: [],
    projects: [],
  };

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<any>({
    defaultValues: defaultMaster,
  });

  // Handle Drag & Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadSuccess(false);
    setUploadError(null);

    // 1. File picker / type validation
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      setUploadError('Only .pdf or .docx files are supported.');
      return;
    }

    // 2. File size validation (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the maximum allowed limit of 5MB.');
      return;
    }

    setIsUploading(true);
    console.log(`[Uploader Audit] Dispatching multipart file upload for: ${file.name} (${file.size} bytes)`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[Uploader Audit] Upload request resolved. Parsed response payload:', res.data);
      setUploadSuccess(true);
      onRefresh();

      // Populate form fields dynamically
      if (res.data) {
        const parsed = res.data;
        setValue('fullName', parsed.fullName || '');
        setValue('email', parsed.email || '');
        setValue('phone', parsed.phone || '');
        setValue('location', parsed.location || '');
        setValue('linkedIn', parsed.linkedIn || '');
        setValue('github', parsed.github || '');
        setValue('portfolio', parsed.portfolio || '');
        setValue('summary', parsed.summary || '');
      }

      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to upload and parse resume file.';
      console.error('[Uploader Audit] File upload transaction failed:', errMsg);
      setUploadError(errMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMaster = async (data: any) => {
    setIsSavingMaster(true);
    setSaveSuccess(false);
    try {
      await api.put('/resume/master', {
        fullName: data.fullName,
        headline: data.headline || 'Software Engineer',
        summary: data.summary,
        skills: typeof data.skills === 'string' ? data.skills.split(',') : defaultMaster.skills.languages,
      });
      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update master resume');
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/resume/download/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume? This action is permanent.')) return;
    try {
      await api.delete(`/resume/${id}`);
      alert('Resume successfully deleted.');
      onRefresh();
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete resume');
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this historical version snapshot?')) return;
    try {
      await api.post('/resume/versions/rollback', { versionId });
      alert('Rollback successful. Master profile reverted to selected version!');
      onRefresh();
      fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to rollback resume');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 max-w-lg">
        <button
          onClick={() => setActiveTab('master')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'master' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Master Profile & Upload
        </button>
        <button
          onClick={() => setActiveTab('tailored')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'tailored' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tailored Versions ({tailoredResumes.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Resume Upload History
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs font-semibold animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Master resume successfully updated and saved in PostgreSQL database!</span>
        </div>
      )}

      {/* Master Resume Tab */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          {uploadSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resume successfully uploaded, parsed by Gemini, and stored in PostgreSQL database!</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center space-x-2 text-red-200 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* File Upload Drag & Drop Card */}
          <Card>
            <CardContent className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-300 font-semibold">Gemini AI parsing resume file, please wait...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">
                        Drag & Drop or Click to Upload Master Resume
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Supports PDF and DOCX formats (Max 5MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {masterResume && (
                <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-bold text-slate-200">Current Resume: Master Resume</p>
                      <p className="text-[10px] text-slate-500">Connected to PostgreSQL database</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload('master')} icon={<Download className="w-3.5 h-3.5" />}>
                      Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete('master')} icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}>
                      <span className="text-red-400">Delete</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Details Card */}
          <form onSubmit={handleSubmit(handleSaveMaster)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>AI Extracted Profile Details</span>
                </CardTitle>
                <CardDescription>Primary candidate profile fields parsed and synchronized in PostgreSQL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Full Name"
                    icon={<User className="w-4 h-4 text-slate-400" />}
                    {...register('fullName')}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    icon={<Mail className="w-4 h-4 text-slate-400" />}
                    {...register('email')}
                  />
                  <Input
                    label="Phone Number"
                    icon={<Phone className="w-4 h-4 text-slate-400" />}
                    {...register('phone')}
                  />
                  <Input
                    label="Location"
                    icon={<MapPin className="w-4 h-4 text-slate-400" />}
                    {...register('location')}
                  />
                  <Input
                    label="LinkedIn URL"
                    icon={<Linkedin className="w-4 h-4 text-slate-400" />}
                    {...register('linkedIn')}
                  />
                  <Input
                    label="GitHub URL"
                    icon={<Github className="w-4 h-4 text-slate-400" />}
                    {...register('github')}
                  />
                  <Input
                    label="Portfolio URL"
                    icon={<Globe className="w-4 h-4 text-slate-400" />}
                    {...register('portfolio')}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Professional Summary
                  </label>
                  <textarea
                    rows={4}
                    {...register('summary')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* Candidate Experience Details */}
                {defaultMaster.experience && defaultMaster.experience.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wide">Work Experience</span>
                    <div className="space-y-3">
                      {defaultMaster.experience.map((exp, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-200">{exp.role} at {exp.company}</span>
                            <span className="text-slate-500">{exp.startDate} - {exp.endDate} ({exp.location})</span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1">
                            {exp.highlights.map((h, hIdx) => (
                              <li key={hIdx} className="text-[11px] text-slate-400 leading-relaxed">{h}</li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {exp.technologiesUsed?.map((t, tIdx) => (
                              <span key={tIdx} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">{t}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate Skills categories */}
                {defaultMaster.skills && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wide">Parsed Skills Matrix</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(defaultMaster.skills).map(([category, list]) => (
                        <div key={category} className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                          <span className="text-[10px] font-extrabold text-slate-500 block uppercase mb-1.5 tracking-wide">{category}</span>
                          <div className="flex flex-wrap gap-1">
                            {(list as string[]).map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" isLoading={isSavingMaster} icon={<Save className="w-4 h-4" />}>
                    Save Master Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* Tailored Resumes History Tab */}
      {activeTab === 'tailored' && (
        <div className="space-y-4">
          {tailoredResumes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-slate-400 text-xs">
                No tailored resumes generated yet. Select a job in Target Jobs and click "Tailor Resume".
              </CardContent>
            </Card>
          ) : (
            tailoredResumes.map((res) => (
              <Card key={res.id} className="hover:border-blue-500/30 transition-all">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {res.jobTitle}
                    </CardTitle>
                    <CardDescription>{res.company}</CardDescription>
                  </div>
                  <Badge variant="green" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    AI Optimized
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg leading-relaxed italic">
                    "{res.customSummary}"
                  </p>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Keywords Optimized:</span>
                    <div className="flex flex-wrap gap-1">
                      {res.keywordsOptimized.map((kw, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Historic Versions list */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <span>Historical Upload Snapshots</span>
            </CardTitle>
            <CardDescription>View, rollback, or download previously parsed master resume snapshot files</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-xs text-slate-400">Loading historical versions...</div>
            ) : resumeHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No historic upload versions found in PostgreSQL database.
              </div>
            ) : (
              <div className="space-y-3">
                {resumeHistory.map((version) => (
                  <div key={version.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-200">{version.versionTag || 'Historical Snapshot'}</p>
                      <p className="text-slate-500 text-[10px]">Uploaded on {new Date(version.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(version.id)} icon={<Download className="w-3.5 h-3.5" />}>
                        Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRollback(version.id)}>
                        Rollback
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(version.id)} icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}>
                        <span className="text-red-400">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
