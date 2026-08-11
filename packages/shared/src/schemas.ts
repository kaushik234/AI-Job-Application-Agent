import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['USER', 'ADMIN']),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const JobSearchSchema = z.object({
  query: z.string().optional(),
  countries: z.array(z.string()).optional(),
  visaOnly: z.boolean().optional(),
  remoteOnly: z.boolean().optional(),
});

export const MasterResumeSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone number is required'),
  location: z.string().min(1, 'Location is required'),
  linkedIn: z.string().url().or(z.string().length(0)),
  github: z.string().url().or(z.string().length(0)),
  portfolio: z.string().url().or(z.string().length(0)),
  summary: z.string().min(10, 'Summary should be at least 10 characters'),
  skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    cloudAndDevOps: z.array(z.string()),
    databases: z.array(z.string()),
    tools: z.array(z.string()),
  }),
});

export const CoverLetterSchema = z.object({
  jobId: z.string().min(1, 'Please select a job target'),
  tone: z.enum(['Professional', 'Confident', 'Dynamic', 'Minimalist']).default('Professional'),
  additionalNotes: z.string().optional(),
});

export const SettingsSchema = z.object({
  dailyApplicationLimit: z.number().min(1).max(100).default(15),
  targetCountries: z.array(z.string()).default(['AU', 'CA', 'DE']),
  jobTitles: z.array(z.string()).default(['Senior Software Engineer']),
  minimumSalary: z.number().min(0).default(120000),
  visaRequired: z.boolean().default(false),
  remote: z.boolean().default(false),
  hybrid: z.boolean().default(false),
  keywords: z.array(z.string()).default(['TypeScript', 'NestJS']),
  requireHumanApproval: z.boolean().default(true),
  remoteOnly: z.boolean().optional(),
  automationMode: z.enum(['MANUAL_APPROVAL', 'FULLY_AUTOMATIC']).optional(),
  enableEmailMonitor: z.boolean().optional(),
  targetKeywords: z.array(z.string()).optional(),
  blacklistedCompanies: z.array(z.string()).optional(),
});

export const UserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type JobSearchFormData = z.infer<typeof JobSearchSchema>;
export type MasterResumeFormData = z.infer<typeof MasterResumeSchema>;
export type CoverLetterFormData = z.infer<typeof CoverLetterSchema>;
export type SettingsFormData = z.infer<typeof SettingsSchema>;
export type UserProfileFormData = z.infer<typeof UserProfileSchema>;
