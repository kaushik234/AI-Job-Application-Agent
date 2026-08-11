import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, ShieldCheck, Key, Laptop, CheckCircle2, AlertCircle, Trash2, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfileSchema, UserProfileFormData } from '../../lib/schemas';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import api from '../../lib/api';

export const ProfileView: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState([
    { id: 'sess_1', ipAddress: '127.0.0.1', userAgent: 'Chrome 122 (macOS)', createdAt: '2026-08-07 09:15', current: true },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      firstName: user?.firstName || 'Kaushik',
      lastName: user?.lastName || 'Khandhala',
      email: user?.email || 'khandhalakaushik234@gmail.com',
    },
  });

  const handleUpdateProfile = async (data: UserProfileFormData) => {
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      await api.put('/auth/profile', data);
      await refreshProfile();
      setUpdateMessage('Profile details successfully updated!');
    } catch (err: any) {
      setUpdateMessage(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await api.post('/auth/resend-verification');
      alert('Verification email sent!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification email sent!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-500" />
                <span>User Profile & Account Information</span>
              </CardTitle>
              <CardDescription>Manage user credentials and security credentials</CardDescription>
            </div>
            <Badge variant={user?.isEmailVerified ? 'green' : 'amber'}>
              {user?.isEmailVerified ? 'Verified Account' : 'Email Unverified'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleUpdateProfile)} className="space-y-4">
            {updateMessage && (
              <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-xs text-blue-200">
                {updateMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                icon={<User className="w-4 h-4" />}
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              {...register('email')}
              error={errors.email?.message}
            />

            <div className="flex items-center justify-between pt-2">
              {!user?.isEmailVerified && (
                <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} icon={<Send className="w-3.5 h-3.5" />}>
                  Resend Verification Email
                </Button>
              )}

              <Button type="submit" variant="primary" isLoading={isUpdating} className="ml-auto">
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Laptop className="w-5 h-5 text-indigo-500" />
            <span>Active Login Sessions</span>
          </CardTitle>
          <CardDescription>Active JWT refresh tokens and browser sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200">{sess.userAgent}</span>
                      {sess.current && <Badge variant="green" size="sm">Current Session</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">IP: {sess.ipAddress} • Connected {sess.createdAt}</p>
                  </div>
                </div>

                {!sess.current && (
                  <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
