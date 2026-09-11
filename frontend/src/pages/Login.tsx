import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import {
  Wallet, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { useGoogleLogin } from '@react-oauth/google';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Email or Username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      login(response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (codeResponse: any) => {
    setLoading(true);
    setError('');
    try {
      // Send the code to our backend to exchange for tokens
      const redirectUri = window.location.origin + '/login';
      const response = await api.post('/auth/google', {
        code: codeResponse.code,
        redirect_uri: redirectUri
      });
      login(response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google login backend error:", err);
      setError(err.response?.data?.detail || 'Google sign-in failed on our server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: (error) => {
      console.error("Google login error:", error);
      setError('Google sign-in failed or was cancelled. Please try again.');
    },
    flow: 'auth-code',
  });

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 antialiased selection:bg-indigo-500 selection:text-white">
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
        onSuccessLogin={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
          setError('Password reset successfully! Please sign in with your new password.');
        }}
      />

      {/* Main Login Card */}
      <main className="w-full max-w-md">
        {/* App Logo & Name */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Wallet size={24} strokeWidth={2.5} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Expense Tracker
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Manage your money. Track your future.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[1.25rem] shadow-xl shadow-slate-200/50 p-8 space-y-6 relative overflow-hidden">
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Welcome back! Please enter your details.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium placeholder:text-slate-400 group-hover:border-slate-400"
                />
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-11 pr-11 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium placeholder:text-slate-400 group-hover:border-slate-400"
                />
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-indigo-600 checked:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all cursor-pointer"
                  />
                  <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                    <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors select-none">Remember me</span>
              </label>
              
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Signing in...' : 'Login'}
              {!loading && <ArrowRight size={18} strokeWidth={2.5} />}
            </button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400 font-semibold text-xs uppercase tracking-wider">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-6 w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 hover:border-slate-300 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          <div className="pt-3 text-center text-sm text-slate-600 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

