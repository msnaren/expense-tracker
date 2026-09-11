import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, X, ShieldCheck, Sparkles, KeyRound, RefreshCw, Send } from 'lucide-react';
import api from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccessLogin?: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccessLogin
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(initialEmail);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setStep(1);
      setVerificationCode('');
      setSentCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setInfoMessage('');
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  // Step 1: Send Verification Code to Email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.code) {
        setSentCode(res.data.code);
      }
      setInfoMessage(`Verification code sent to ${email}. Check your email or code banner below.`);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No account found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-code', {
        email,
        code: verificationCode.trim()
      });
      setInfoMessage('Verification code confirmed! Enter your new password below.');
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        new_password: newPassword,
        code: verificationCode.trim()
      });
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onSuccessLogin) {
      onSuccessLogin(email);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative transition-all">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Reset Password</h3>
              <p className="text-xs text-slate-400">Step {step} of 4: {
                step === 1 ? 'Enter Email' : step === 2 ? 'Enter Code' : step === 3 ? 'New Password' : 'Complete'
              }</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-7 space-y-4">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-10 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-medium placeholder:text-slate-400"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
                <Send size={16} />
              </button>
            </form>
          )}

          {/* STEP 2: Enter Verification Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Simulated Email Code Preview Box */}
              {sentCode && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <Mail size={14} />
                    <span>Incoming Verification Email:</span>
                  </div>
                  <p className="text-[11px] text-emerald-600">Your 6-Digit verification code is:</p>
                  <div className="text-xl font-mono font-black tracking-widest text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 inline-block">
                    {sentCode}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 849201"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-center font-mono text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw size={12} />
                  Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 4 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
                <CheckCircle2 size={16} />
              </button>
            </form>
          )}

          {/* STEP 4: Success Confirmation */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Password Reset Complete!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your credentials for <strong>{email}</strong> have been updated.
                </p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Return to Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
