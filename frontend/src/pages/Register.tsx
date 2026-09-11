import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Wallet, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2,
  Sparkles, ArrowRight, Star
} from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton';

const PERKS = [
  'Free forever — no credit card needed',
  'AI-driven spending insights in real time',
  'Unlimited accounts, categories & budgets',
  'Data stays private & encrypted',
];

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const strength = passwordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(145deg, hsl(215,60%,18%) 0%, hsl(230,55%,30%) 50%, hsl(215,50%,22%) 100%)'
        }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, hsl(230,80%,75%), transparent)', animation: 'pulse 7s ease-in-out infinite' }} />
          <div className="absolute bottom-20 -left-16 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, hsl(200,80%,70%), transparent)', animation: 'pulse 9s ease-in-out infinite 3s' }} />
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(hsl(215,80%,90%) 1px, transparent 1px), linear-gradient(90deg, hsl(215,80%,90%) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Wallet size={22} className="text-white" />
          </div>
          <span className="text-white text-xl font-extrabold tracking-tight">SpendWise</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Sparkles size={12} />
              Join thousands of smart savers
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Start Your<br />
              <span style={{ background: 'linear-gradient(90deg, #86efac, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Financial Journey
              </span>
            </h1>
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Create your free account and start making smarter money decisions today.
            </p>
          </div>

          {/* Perks list */}
          <div className="space-y-3">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(134,239,172,0.2)', border: '1px solid rgba(134,239,172,0.4)' }}>
                  <CheckCircle2 size={12} style={{ color: '#86efac' }} />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{perk}</span>
              </div>
            ))}
          </div>

          {/* Testimonial / trust badge */}
          <div className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill="#fbbf24" style={{ color: '#fbbf24' }} />
              ))}
            </div>
            <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.75)' }}>
              "SpendWise completely changed how I manage money. The AI insights are spot-on!"
            </p>
            <p className="text-xs font-semibold mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              — Priya M., College Student
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            🔒 Your data is encrypted and never shared with third parties.
          </p>
        </div>
      </div>

      {/* ── Right Register Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.04]"
          style={{ background: 'hsl(var(--primary))' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full translate-y-1/2 -translate-x-1/2 opacity-[0.04]"
          style={{ background: 'hsl(var(--primary))' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wallet size={18} />
            </div>
            <span className="text-lg font-extrabold text-foreground">SpendWise</span>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Create account ✨</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              It's free and takes less than a minute.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 text-destructive flex items-start gap-2.5 text-sm border border-destructive/20">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Arjun Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? strengthColor[strength] : 'hsl(var(--border))' }} />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-background text-foreground placeholder:text-muted-foreground/60 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-destructive/50 focus:ring-destructive/30'
                      : 'border-border focus:ring-primary/40 focus:border-primary/50'
                  }`}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {confirmPassword && confirmPassword === password && (
                  <CheckCircle2 size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98]"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <>
                  <UserPlus size={17} />
                  Create Free Account
                  <ArrowRight size={15} className="ml-0.5 opacity-70" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-background text-xs font-medium text-muted-foreground uppercase tracking-wider">
                or sign up with
              </span>
            </div>
          </div>

          <GoogleLoginButton buttonText="Sign up with Google" />

          <p className="text-center text-sm text-muted-foreground mt-7">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-2">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
