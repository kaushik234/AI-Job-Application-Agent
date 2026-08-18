/**
 * @file packages/types/src/index.ts
 * @description Shared TypeScript types for Sentinel AI Job Application Agent monorepo.
 */

/** Supported Target Countries for Job Applications */
export type CountryCode = 'AU' | 'CA' | 'DE';
export type TargetCountryCode = CountryCode | 'ALL' | 'WORLDWIDE';

/** Application Status Transitions */
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  FORM_ANALYZED = 'FORM_ANALYZED',
  READY_TO_AUTOFILL = 'READY_TO_AUTOFILL',
  AUTOFILLED = 'AUTOFILLED',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  AWAITING_USER_REVIEW = 'AWAITING_USER_REVIEW',
  AWAITING_HUMAN_SUBMISSION = 'AWAITING_HUMAN_SUBMISSION',
  USER_SUBMITTED = 'USER_SUBMITTED',
  SUBMISSION_UNVERIFIED = 'SUBMISSION_UNVERIFIED',
  EXTERNAL_SUBMISSION_CONFIRMED = 'EXTERNAL_SUBMISSION_CONFIRMED',
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  SUBMITTED = 'SUBMITTED',
  DISCOVERED = 'Discovered',
  MATCHED = 'Matched',
  TAILORED = 'Tailored',
  PENDING_APPROVAL = 'Pending Approval',
  APPLYING = 'Applying',
  CAPTCHA_PAUSED = 'CAPTCHA Paused',
  APPLIED = 'Applied',
  ASSESSMENT = 'Assessment',
  INTERVIEW = 'Interview',
  OFFER = 'Offer',
  REJECTED = 'Rejected',
  REJECTED_AFTER_INTERVIEW = 'Rejected After Interview'
}

/** Supported Job Board Scraper Platforms */
export type JobPlatform = 
  | 'Greenhouse'
  | 'Lever'
  | 'Ashby'
  | 'Workable'
  | 'LinkedIn'
  | 'Seek'
  | 'Indeed'
  | 'Job Bank Canada'
  | 'Company Career Page'
  | 'Apify';

/** Configurable Evaluation Scoring Weights */
export interface EvaluationWeights {
  skillMatch: number; // default 30
  experienceMatch: number; // default 20
  roleMatch: number; // default 15
  seniorityMatch: number; // default 10
  mandatoryRequirements: number; // default 10
  locationCompatibility: number; // default 5
  visaCompatibility: number; // default 5
  remoteCompatibility: number; // default 3
  educationMatch: number; // default 2
}

export type VisaStatus =
  | 'CONFIRMED_SPONSORSHIP'
  | 'LIKELY_SPONSORSHIP'
  | 'UNKNOWN'
  | 'NO_SPONSORSHIP'
  | 'NOT_ELIGIBLE'
  | 'CONFIRMED'
  | 'LIKELY'
  | 'NOT_SUPPORTED';

export type RecommendationLevel =
  | 'APPLY_NOW'
  | 'TAILOR_AND_APPLY'
  | 'CONSIDER'
  | 'SKIP'
  | 'APPLY';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type CompanySizeCategory =
  | 'MICRO'
  | 'SMALL'
  | 'MEDIUM'
  | 'SCALEUP'
  | 'LARGE'
  | 'ENTERPRISE'
  | 'UNKNOWN';

export type CompanyType =
  | 'SaaS'
  | 'Startup'
  | 'Agency'
  | 'Product'
  | 'Enterprise'
  | 'Consulting'
  | 'HealthTech'
  | 'FinTech'
  | 'ECommerce'
  | 'Local'
  | 'Remote'
  | 'Unknown';

export type RealisticPriorityCategory =
  | 'APPLY_NOW'
  | 'HIGH_PRIORITY'
  | 'GOOD_MATCH'
  | 'CONSIDER'
  | 'LOW_MATCH'
  | 'DO_NOT_APPLY';

export type VisaSponsorshipStatus =
  | 'CONFIRMED_SPONSORSHIP'
  | 'LIKELY_SPONSORSHIP'
  | 'UNKNOWN'
  | 'NO_SPONSORSHIP_FOUND'
  | 'NOT_APPLICABLE';

export interface CompanyOpportunityInfo {
  companySize: CompanySizeCategory;
  companyType: CompanyType;
  sourceQuality: string;
  opportunityFitScore: number;
  whyOpportunityFit: string;
}

export interface DecisionEngineResult {
  jobId: string;
  recommendation: RealisticPriorityCategory;
  confidenceScore: number;
  applicationPriorityScore: number;
  whyThisJob: string[];
  potentialRisks: string[];
  companyOpportunity: CompanyOpportunityInfo;
  evaluatedAt: string;
}

export interface RankingWeights {
  roleMatch: number;        // default 15
  skillsMatch: number;      // default 25
  experienceMatch: number;  // default 20
  visaMatch: number;        // default 10
  locationMatch: number;    // default 10
  seniorityMatch: number;   // default 5
  educationMatch: number;   // default 5
  remoteMatch: number;      // default 4
  salaryMatch: number;      // default 3
  jobRecencyMatch: number;  // default 3
}

export interface VerifiedCandidateProfile {
  name: string;
  totalExperienceYears: number;
  relevantExperienceYears: number;
  skills: string[];
  jobTitles: string[];
  education: string[];
  location: string;
  workAuthorization: string;
  preferredLocations: string[];
}

export interface StructuredJobProfile {
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperienceYears: number | null;
  educationRequirements: string[];
  location: string;
  remote: boolean | null;
  visaSponsorship: VisaStatus;
  salary: string | null;
  seniority: string | null;
  employmentType: string | null;
  source: string;
  postedDate: string;
}

export interface MatchEvidenceBreakdown {
  roleEvidence: string[];
  requiredSkillEvidence: { skill: string; matched: boolean; candidateEvidence?: string }[];
  preferredSkillEvidence: { skill: string; matched: boolean; candidateEvidence?: string }[];
  experienceEvidence: string[];
  locationEvidence: string[];
  visaEvidence: string[];
}

export interface MatchAuditMetadata {
  candidateProfileVersion: string;
  jobId: string;
  jobSource: string;
  jobDescriptionHash: string;
  analyzedAt: string;
  model: string;
  promptVersion: string;
  roleScore: number;
  skillsScore: number;
  experienceScore: number;
  locationScore: number;
  visaScore: number;
  overallScore: number;
  recommendation: RecommendationLevel;
}

export interface JobRankingResult {
  jobId: string;
  matchScore: number;
  recommendation: RecommendationLevel;
  confidence: number;

  roleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  visaMatch: number;

  strengths: string[];
  missingSkills: string[];
  experienceGap: number | null;

  visaStatus: VisaStatus;

  applicationPriority: PriorityLevel;

  reasonsToApply: string[];
  reasonsToSkip: string[];

  recommendedAction: RecommendationLevel;
  evaluatedAt: string;

  candidateProfile?: VerifiedCandidateProfile;
  structuredJob?: StructuredJobProfile;
  evidence?: MatchEvidenceBreakdown;
  audit?: MatchAuditMetadata;
}

/** Comprehensive AI Job Evaluation & Application Priority Result */
export interface JobEvaluationResult {
  jobId: string;
  matchScore: number;
  applicationPriority: number;
  recommendation: 'APPLY' | 'CONSIDER' | 'SKIP' | RecommendationLevel;
  qualificationLevel: 'CLEARLY_QUALIFIES' | 'PROBABLY_QUALIFIES' | 'MAY_QUALIFY' | 'DOES_NOT_QUALIFY';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | number;

  skillMatch: {
    score: number;
    matched: string[];
    missing: string[];
  };
  experienceMatch: {
    score: number;
    candidateYears: number;
    requiredYears: number;
  };
  roleMatch: {
    score: number;
  };
  seniorityMatch: {
    score: number;
  };
  mandatoryRequirements: {
    score: number;
    met: string[];
    missing: string[];
  };
  visaCompatibility: {
    status: 'CONFIRMED' | 'LIKELY' | 'UNKNOWN' | 'NOT_SUPPORTED' | VisaStatus;
    score: number;
    evidence: string;
  };
  locationCompatibility: {
    status: 'COMPATIBLE' | 'LOCATION_MISMATCH' | 'REMOTE_ONLY' | 'UNKNOWN';
    score: number;
  };
  educationMatch: {
    score: number;
    institutionMatch: boolean;
  };
  strengths: string[];
  risks: string[];
  reasoning: string;
  evaluatedAt: string;

  // Rich AI Job Ranking output fields
  ranking?: JobRankingResult;
}

export enum JobLifecycleStatus {
  DISCOVERED = 'DISCOVERED',
  VERIFYING = 'VERIFYING',
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  EXPIRED = 'EXPIRED',
  REMOVED = 'REMOVED',
  INVALID_URL = 'INVALID_URL',
  SOURCE_MISMATCH = 'SOURCE_MISMATCH',
  SEARCH_QUERY_MISMATCH = 'SEARCH_QUERY_MISMATCH',
  COUNTRY_MISMATCH = 'COUNTRY_MISMATCH',
  DEMO_ONLY = 'DEMO_ONLY'
}

export interface FieldSourceEvidence {
  value?: any;
  source: string;
  verified: boolean;
}

export interface JobSourceEvidenceMap {
  title?: FieldSourceEvidence;
  company?: FieldSourceEvidence;
  location?: FieldSourceEvidence;
  salary?: FieldSourceEvidence;
  visaSponsorship?: FieldSourceEvidence;
  postedDate?: FieldSourceEvidence;
  application?: FieldSourceEvidence;
}

export interface SearchQueryRelevanceResult {
  searchRelevanceVerified: boolean;
  searchRelevanceScore: number;
  searchRelevanceReason: string;
  searchQuery: string;
}

export interface ExternalJobVerificationResult {
  verified: boolean;
  status: JobLifecycleStatus;
  reason: string;
  httpStatus?: number;
  finalUrl?: string;
  detectedTitle?: string;
  detectedCompany?: string;
  detectedLocation?: string;
  verifiedCountry?: string;
  countryVerified?: boolean;
  countrySource?: string;
  countryMismatch?: boolean;
  jobIdentityVerified?: boolean;
  titleMatchScore?: number;
  companyMatchScore?: number;
  locationMatchScore?: number;
  contentMatchScore?: number;
  jobIdentityReason?: string;
  sourceEvidence?: JobSourceEvidenceMap;
  searchRelevance?: SearchQueryRelevanceResult;
  hasApplicationForm?: boolean;
  hasApplyButton?: boolean;
  verifiedAt: string;
}

export type FreshnessCategory = 'VERY_RECENT' | 'RECENT' | 'FRESH' | 'STALE' | 'UNKNOWN';
export type ApplyabilityStatus = 'APPLY_NOW' | 'VIEW_ONLY' | 'UNVERIFIED' | 'EXPIRED';
export type SourceConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Job Listing Data Model */
export interface JobListing {
  id: string;
  internalJobId?: string;
  sourceJobId?: string;
  platform: JobPlatform;
  company: string;
  title: string;
  location: string;
  city?: string;
  country: CountryCode;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryText?: string;
  visaSponsorship: boolean;
  isRemote: boolean;
  isHybrid?: boolean;
  url: string;
  canonicalUrl?: string;
  originalUrl?: string;
  finalUrl?: string;
  description?: string;
  requirements?: string[];
  postedDate: string;
  postedAt?: string | null;
  freshnessCategory?: FreshnessCategory;
  createdAt: string;
  scrapedAt?: string;
  discoveredAt?: string;
  firstDiscoveredAt?: string;
  lastSeenAt?: string;
  lastVerifiedAt?: string;
  revalidatedAt?: string;
  jobStatus?: JobLifecycleStatus | string;
  verificationStatus?: JobLifecycleStatus | string;
  sourceVerified?: boolean;
  verificationReason?: string;
  verificationNotes?: string;
  jobIdentityVerified?: boolean;
  titleMatchScore?: number;
  companyMatchScore?: number;
  locationMatchScore?: number;
  contentMatchScore?: number;
  jobIdentityReason?: string;
  sourceEvidence?: JobSourceEvidenceMap;
  detectedTitle?: string;
  detectedCompany?: string;
  verifiedCountry?: string;
  countryVerified?: boolean;
  countrySource?: string;
  countryMismatch?: boolean;
  searchRelevance?: SearchQueryRelevanceResult;
  hasApplicationForm?: boolean;
  hasApplyButton?: boolean;
  isDemoJob?: boolean;
  matchScore?: number;
  applicationPriority?: PriorityLevel | number;
  recommendation?: RecommendationLevel | string;
  applicationDecision?: 'APPLY' | 'CONSIDER' | 'DO_NOT_APPLY' | 'REJECTED' | string;
  visaStatus?: VisaStatus;
  ranking?: JobRankingResult;
  evaluation?: JobEvaluationResult;
  source?: string;
  sources?: string[];
  sourcePlatforms?: string[];
  sourceConfidence?: SourceConfidenceLevel;
  applyabilityStatus?: ApplyabilityStatus;
  companySize?: CompanySizeCategory;
  companyType?: CompanyType;
  opportunityFitScore?: number;
  applicationPriorityScore?: number;
  priorityCategory?: RealisticPriorityCategory;
  decisionEngine?: DecisionEngineResult;
}

/** AI Job Match Evaluation Result */
export interface JobMatchResult {
  jobId: string;
  matchPercentage: number;
  recommendation: 'STRONG_MATCH' | 'MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH' | 'NO_MATCH' | 'MODERATE_MATCH' | 'SKIP';
  
  candidate: {
    name: string;
    experienceYears: number | null;
    experienceSource: 'MASTER_RESUME';
    relevantSkills: string[];
  };

  job: {
    title: string;
    company: string;
    requiredExperienceYears: number | null;
    requiredSkills: string[];
  };

  experienceAnalysis: {
    candidateYears: number | null;
    requiredYears: number | null;
    gapYears: number | null;
    status: 'MEETS_REQUIREMENT' | 'BELOW_REQUIREMENT' | 'OVERQUALIFIED' | 'UNKNOWN';
  };

  skillsAnalysis: {
    matched: string[];
    missing: string[];
    additional: string[];
  };

  reasons: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  reasoning: string;
  keywordAnalysis?: {
    matchedKeywords: string[];
    missingKeywords: string[];
    keywordDensityScore: number;
  };
  resumeImprovements?: string[];
  evaluatedAt: string;
  promptVersion?: string;
  costUsd?: number;
  errorState?: 'RESUME_DATA_INVALID' | null;
}

/** Master Candidate Profile & Resume Structure */
export interface MasterResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  skills: {
    languages: string[];
    frameworks: string[];
    cloudAndDevOps: string[];
    databases: string[];
    tools: string[];
  };
  experience: {
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    highlights: string[];
    technologiesUsed: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: string;
  }[];
  certifications: string[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    url?: string;
  }[];
  explicitExperienceYears?: number;
  experienceSource?: 'RESUME_EXPLICIT' | 'DERIVED' | 'DEFAULT';
  parserUsed?: 'gemini' | 'local';
}

/** Structured Job-Specific Tailored Resume Output (No Fabrication) */
export interface StructuredTailoredResume {
  id: string;
  jobId: string;
  sourceMasterResumeId: string;
  version: number;
  company: string;
  jobTitle: string;
  candidate: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  summary: string;
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  skills: string[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: string;
  }[];
  certifications: string[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    url?: string;
  }[];
  changes: {
    section: string;
    reason: string;
  }[];
  model: string;
  promptVersion: string;
  createdAt: string;
}

/** Tailored Resume Version generated by AI without fabrication */
export interface TailoredResume {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyName?: string;
  customSummary: string;
  prioritizedSkills: string[];
  skillsAdded?: string[];
  reorganizedExperience: {
    company: string;
    role: string;
    period: string;
    tailoredHighlights: string[];
  }[];
  keywordsOptimized: string[];
  pdfStoragePath: string;
  pdfDataUrl?: string;
  generatedAt: string;
  structuredData?: StructuredTailoredResume;
  version?: number;
  sourceMasterResumeId?: string;
  model?: string;
  promptVersion?: string;
}

/** Application Readiness Verification Result */
export interface ApplicationReadinessResult {
  jobId: string;
  isReady: boolean;
  readinessScore: number; // 0 - 100
  missingItems: string[];
  checks: {
    masterResumeExists: boolean;
    tailoredResumeExists: boolean;
    candidateNameExists: boolean;
    emailExists: boolean;
    phoneExists: boolean;
    workHistoryExists: boolean;
    educationExists: boolean;
    jobUrlExists: boolean;
    jobTitleExists: boolean;
    companyExists: boolean;
    jobDescriptionExists: boolean;
    coverLetterAvailable: boolean;
    appropriateResumeSelected: boolean;
    matchAnalysisAvailable: boolean;
  };
  evaluatedAt: string;
}

/** Safe Browser Autofill Field Analysis */
export interface AutofillFieldAnalysis {
  fieldName: string;
  fieldSelector: string;
  fieldType: 'text' | 'email' | 'tel' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea';
  detectedCategory: string;
  mappedValue: string | null;
  requiresUserInput: boolean;
  userPromptReason?: string;
}

/** Cover Letter Model */
export interface CoverLetter {
  id: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
  salutation: string;
  contentParagraphs: string[];
  closing: string;
  pdfStoragePath: string;
  pdfDataUrl?: string;
  generatedAt: string;
  version?: number;
  auditMetadata?: Record<string, any>;
}

/** Job Application Record in Database Tracker */
export interface ApplicationRecord {
  id: string;
  applicationId?: string;
  jobId: string;
  candidateId?: string;
  jobTitle: string;
  company: string;
  country: CountryCode;
  url: string;
  platform?: JobPlatform;
  status: ApplicationStatus;
  matchScore: number;
  readinessScore?: number;
  readinessChecks?: Record<string, boolean>;
  tailoredResumeId?: string;
  coverLetterId?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUpdatedAt: string;
  notes?: string;
  captchaAlert?: boolean;
  submissionCategory?: 'DEMO' | 'USER_SUBMITTED' | 'SEEDED_TEST_DATA';
  externalVerification?: ExternalSubmissionVerification;
}

export interface ExternalSubmissionVerification {
  isVerified: boolean;
  status: ApplicationStatus;
  evidenceType?: 'CONFIRMATION_URL' | 'CONFIRMATION_NUMBER' | 'PLATFORM_ACTIVITY' | 'DOM_SUCCESS_MESSAGE';
  confirmationNumber?: string;
  confirmationUrl?: string;
  verificationTimestamp?: string;
  matchedCompany?: string;
  matchedJobTitle?: string;
  platform?: string;
  jobId?: string;
  verificationNotes: string;
}

export interface CoverLetterEvidenceClaim {
  claim: string;
  evidence: string;
  status: 'VERIFIED' | 'UNSUPPORTED';
  sourceField?: string;
}

export type FieldSafetyCategory = 'SAFE' | 'SENSITIVE' | 'UNKNOWN';

export interface FormFieldClassification {
  field: string;
  label: string;
  type: string;
  required: boolean;
  detectedMeaning: string;
  confidence: number;
  autofillAllowed: boolean;
  verificationRequired: boolean;
  category: FieldSafetyCategory;
  suggestedValue?: string | null;
  reason?: string;
}

export interface ApplicationAuditLog {
  id: string;
  applicationId: string;
  action: string;
  result: 'SUCCESS' | 'BLOCKED' | 'WARNING' | 'FAILED';
  source: string;
  userControlled: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

/** Recruiter Email Category Classification */
export enum EmailCategory {
  INTERVIEW = 'Interview',
  ASSESSMENT = 'Assessment',
  OFFER = 'Offer',
  REJECTION = 'Rejection',
  SPAM = 'Spam',
  GENERAL = 'General Query'
}

/** Email Monitor Record */
export interface EmailRecord {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  fullBody: string;
  receivedAt: string;
  classifiedCategory: EmailCategory;
  confidenceScore: number;
  matchedCompany?: string;
  matchedJobTitle?: string;
  applicationId?: string;
}

/** System Settings Model */
export interface AgentSettings {
  countryFilter: CountryCode[];
  minimumSalary: number;
  remoteOnly: boolean;
  visaRequired: boolean;
  targetKeywords: string[];
  blacklistedCompanies: string[];
  whitelistedCompanies: string[];
  dailyApplicationLimit: number;
  automationMode: 'MANUAL_APPROVAL' | 'FULLY_AUTOMATIC';
  schedulerFrequencyHours: number;
  enableEmailMonitor: boolean;
}

/** System Log Entry for Activity, Browser, AI & Errors */
export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'SEARCH' | 'AI_PROMPT' | 'RESUME_GEN' | 'BROWSER' | 'EMAIL' | 'SCHEDULER' | 'ERROR' | 'STORAGE' | 'QUEUE' | 'SYSTEM';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  details?: Record<string, unknown>;
}

export interface AutomationStepEvent {
  stepNumber: number;
  totalSteps: number;
  actionName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'CAPTCHA_PAUSED' | 'APPROVAL_PAUSED' | 'FAILED';
  logs: string[];
  captchaDetected: boolean;
  screenshotUrl?: string;
  completedAt?: string;
}

/** Search History Entry */
export interface SearchHistoryItem {
  id: string;
  query: string;
  countries: CountryCode[];
  resultsCount: number;
  timestamp: string;
}

/** Overview Statistics for Dashboard */
export interface DashboardStats {
  applicationsToday: number;
  dailyLimit: number;
  totalApplications: number;
  successRate: number;
  pendingApprovalCount: number;
  interviewsCount: number;
  resumeVersionsCount: number;
  countryBreakdown: Record<CountryCode, number>;
  statusBreakdown: Record<string, number>;
}

/** ATS Keyword Optimization Analysis */
export interface KeywordOptimizationResult {
  jobId: string;
  keywordMatchScore: number;
  presentKeywords: string[];
  missingKeywords: string[];
  optimizationTips: string[];
  relevanceScores: Record<string, number>;
}

/** Predicted Technical & Behavioral Interview Preparation */
export interface InterviewPredictionResult {
  jobId: string;
  company: string;
  jobTitle: string;
  technicalQuestions: {
    question: string;
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    sampleAnswerOutline: string;
    keyTalkingPoints: string[];
  }[];
  behavioralQuestions: {
    question: string;
    competency: string;
    suggestedStarResponse: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
  }[];
  overallPreparationFocus: string[];
}

/** Company Intelligence & Research Profile */
export interface CompanyResearchResult {
  company: string;
  industry: string;
  headquarters: string;
  techStack: string[];
  engineeringCultureHighlights: string[];
  visaSponsorshipTrackRecord: string;
  recentCompanyInsights: string[];
  interviewPreparationTips: string[];
}

/** Prompt Versioning Template Contract */
export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  templateText: string;
  updatedAt: string;
}

/** Cost & Token Tracking Metrics */
export interface AICostMetrics {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  cacheHitCount: number;
  cacheMissCount: number;
  lastCallTimestamp?: string;
}

/** Stored Resume Engine Version Record */
export interface ResumeVersion {
  id: string;
  versionTag: string;
  resumeId?: string;
  versionName?: string;
  tailoredForJobId?: string;
  atsScore?: number;
  content?: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  changeDescription: string;
  masterSnapshot: MasterResume;
  tailoredPayload?: TailoredResume;
  formats: {
    pdfDataUrl: string;
    docxBase64: string;
    jsonRepresentation: any;
  };
  createdAt: string;
}

/** Comparison Diff between two Resume Versions */
export interface ResumeDiff {
  versionIdA: string;
  versionTagA: string;
  versionIdB: string;
  versionTagB: string;
  summaryDiff: {
    versionA: string;
    versionB: string;
    changed: boolean;
  };
  skillsDiff: {
    addedInB: string[];
    removedInB: string[];
    retained: string[];
  };
  experienceDiff: {
    company: string;
    role: string;
    addedHighlights: string[];
    removedHighlights: string[];
    retainedHighlights: string[];
  }[];
  keywordsDiff: {
    addedInB: string[];
    removedInB: string[];
  };
}

/** Resume Rollback Execution Result */
export interface ResumeRollbackResult {
  success: boolean;
  restoredVersionId: string;
  currentVersionTag: string;
  masterResume: MasterResume;
  message: string;
}

/** Stored Cover Letter Version Record */
export interface CoverLetterVersion {
  id: string;
  versionTag: string;
  jobId?: string;
  jobTitle: string;
  companyName: string;
  salutation: string;
  relevantExperienceMentioned: string[];
  techStackMentioned: string[];
  contentParagraphs: string[];
  closing: string;
  content?: string;
  formats: {
    pdfDataUrl: string;
    docxBase64: string;
    jsonRepresentation: any;
  };
  createdAt: string;
}

/** Cover Letter Version Comparison Diff */
export interface CoverLetterDiff {
  versionIdA: string;
  versionTagA: string;
  versionIdB: string;
  versionTagB: string;
  companyNameA: string;
  companyNameB: string;
  jobTitleA: string;
  jobTitleB: string;
  paragraphDiffs: {
    index: number;
    paragraphA: string;
    paragraphB: string;
    changed: boolean;
  }[];
  techStackDiff: {
    addedInB: string[];
    removedInB: string[];
    retained: string[];
  };
  experienceDiff: {
    addedInB: string[];
    removedInB: string[];
    retained: string[];
  };
}

/** Cover Letter Rollback Execution Result */
export interface CoverLetterRollbackResult {
  success: boolean;
  restoredVersionId: string;
  currentVersionTag: string;
  coverLetter: CoverLetter;
  message: string;
}

export type ProviderOutcomeStatus =
  | 'SUCCESS_WITH_RESULTS'
  | 'SUCCESS_ZERO_RESULTS'
  | 'PARTIAL_RESULTS'
  | 'AUTH_REQUIRED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'HTTP_ERROR'
  | 'PARSER_FAILED'
  | 'UNSUPPORTED'
  | 'PROVIDER_ERROR';

export interface ProviderDiagnostics {
  query?: string;
  boardsAttempted?: number;
  boardsSucceeded?: number;
  boardsFailed?: number;
  boardsTimedOut?: number;
  boardsRateLimited?: number;
  rawJobsBeforeQueryFilter?: number;
  rawJobsAfterQueryFilter?: number;
  message?: string;
  [key: string]: any;
}

export interface JobPlatformBreakdown {
  scraped: number;
  status: ProviderOutcomeStatus | string;
  message?: string;
  diagnostics?: ProviderDiagnostics;
}
