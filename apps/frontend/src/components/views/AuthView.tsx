import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, ShieldCheck, ArrowRight, Github, Chrome, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, LoginFormData, RegisterFormData } from '../../lib/schemas';
import { Button } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';

export const AuthView: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'reset' | 'verify'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('');
  const { login, register, oauthLogin, forgotPassword, resetPassword, verifyEmail, isLoading } = useAuth();

  // Login Form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: 'khandhalakaushik234@gmail.com',
      password: 'Password123!',
    },
  });

  // Register Form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: 'Kaushik',
      lastName: 'Khandhala',
      email: 'khandhalakaushik234@gmail.com',
      password: 'Password123!',
      role: 'USER',
    },
  });

  // Forgot Password Form
  const forgotForm = useForm<{ email: string }>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const handleLoginSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setSuccessMessage(null);
    try {
      await login(data);
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setAuthError(null);
    setSuccessMessage(null);
    try {
      const res = await register(data);
      setSuccessMessage('Registration successful! Please log in with your credentials.');
      setTab('login');
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleOAuthGoogle = async () => {
    setAuthError(null);
    try {
      await oauthLogin('google', 'google_123456789', 'khandhalakaushik234@gmail.com', 'Kaushik', 'Khandhala');
    } catch (err: any) {
      setAuthError('Google OAuth authentication failed.');
    }
  };

  const handleOAuthGitHub = async () => {
    setAuthError(null);
    try {
      await oauthLogin('github', 'github_987654321', 'khandhalakaushik234@gmail.com', 'Kaushik', 'Khandhala');
    } catch (err: any) {
      setAuthError('GitHub OAuth authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SENTINEL AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
            Autonomous Job Search & Application Intelligence Agent
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            onClick={() => { setTab('login'); setAuthError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setAuthError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {authError && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start space-x-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start space-x-2 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your autonomous job portal</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="name@company.com"
                  {...loginForm.register('email')}
                  error={loginForm.formState.errors.email?.message}
                />

                <Input
                  label="Password"
                  type="password"
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} icon={<ArrowRight className="w-4 h-4" />}>
                  Sign In to Dashboard
                </Button>
              </form>

              {/* OAuth Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-2 text-slate-500 font-medium">Or continue with</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" size="sm" onClick={handleOAuthGoogle} icon={<Chrome className="w-4 h-4 text-red-400" />}>
                  Google
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleOAuthGitHub} icon={<Github className="w-4 h-4 text-slate-200" />}>
                  GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Setup your profile to let SENTINEL AI automate your job hunt</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    type="text"
                    icon={<User className="w-4 h-4" />}
                    placeholder="Kaushik"
                    {...registerForm.register('firstName')}
                    error={registerForm.formState.errors.firstName?.message}
                  />
                  <Input
                    label="Last Name"
                    type="text"
                    placeholder="Khandhala"
                    {...registerForm.register('lastName')}
                    error={registerForm.formState.errors.lastName?.message}
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="name@company.com"
                  {...registerForm.register('email')}
                  error={registerForm.formState.errors.email?.message}
                />

                <Input
                  label="Password"
                  type="password"
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="Minimum 8 characters"
                  {...registerForm.register('password')}
                  error={registerForm.formState.errors.password?.message}
                />

                <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading} icon={<ArrowRight className="w-4 h-4" />}>
                  Create Free Account
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Forgot Password */}
        {tab === 'forgot' && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>Enter your registered email to request a password reset token</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={forgotForm.handleSubmit(async (data) => {
                  setAuthError(null);
                  try {
                    const res = await forgotPassword(data.email);
                    setSuccessMessage(res.message || 'Reset token generated successfully.');
                    if (res.resetToken) {
                      setResetTokenInput(res.resetToken);
                      setTab('reset');
                    }
                  } catch (err: any) {
                    setAuthError(err.response?.data?.message || 'Failed to request password reset.');
                  }
                })}
                className="space-y-4"
              >
                <Input
                  label="Account Email"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="name@company.com"
                  {...forgotForm.register('email')}
                />

                <Button type="submit" variant="primary" className="w-full">
                  Request Reset Token
                </Button>

                <div className="flex justify-between gap-2 pt-2">
                  <Button type="button" variant="ghost" className="text-xs flex-1" onClick={() => setTab('reset')}>
                    Have a Token? Reset
                  </Button>
                  <Button type="button" variant="ghost" className="text-xs flex-1" onClick={() => setTab('login')}>
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Password */}
        {tab === 'reset' && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Enter your reset token and new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  try {
                    const res = await resetPassword(resetTokenInput, newPasswordInput);
                    setSuccessMessage(res.message || 'Password successfully reset.');
                    setTab('login');
                  } catch (err: any) {
                    setAuthError(err.response?.data?.message || 'Password reset failed.');
                  }
                }}
                className="space-y-4"
              >
                <Input
                  label="Reset Token"
                  type="text"
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="reset_..."
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                />

                <Input
                  label="New Password"
                  type="password"
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="Minimum 8 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />

                <Button type="submit" variant="primary" className="w-full">
                  Update Password
                </Button>

                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setTab('login')}>
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Verify Email */}
        {tab === 'verify' && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Verify Email</CardTitle>
              <CardDescription>Enter your email verification token</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  try {
                    const res = await verifyEmail(verifyTokenInput);
                    setSuccessMessage(res.message || 'Email verified successfully!');
                    setTab('login');
                  } catch (err: any) {
                    setAuthError(err.response?.data?.message || 'Email verification failed.');
                  }
                }}
                className="space-y-4"
              >
                <Input
                  label="Verification Token"
                  type="text"
                  icon={<ShieldCheck className="w-4 h-4" />}
                  placeholder="verify_..."
                  value={verifyTokenInput}
                  onChange={(e) => setVerifyTokenInput(e.target.value)}
                />

                <Button type="submit" variant="primary" className="w-full">
                  Submit Token
                </Button>

                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setTab('login')}>
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
