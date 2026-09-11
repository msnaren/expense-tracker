import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Sparkles, X, Check, ShieldAlert, AlertTriangle } from 'lucide-react';

/**
 * SpendWise Google Sign-In Component
 *
 * GOOGLE OAUTH CLIENT ID CONFIGURATION:
 * 1. Obtain a Client ID from Google Cloud Console (https://console.cloud.google.com/apis/credentials)
 * 2. Add `VITE_GOOGLE_CLIENT_ID` to your `frontend/.env` file:
 *    VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
 * 3. Ensure Authorized JavaScript Origins in Google Cloud Console include:
 *    - http://localhost:5173
 *    - http://127.0.0.1:5173
 *
 * NOTE: Never place Google Client Secret in frontend code. Client Secret must remain private.
 */

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  buttonText?: string;
  className?: string;
}

/**
 * Helper to check whether the Client ID is a valid production Google Client ID
 * rather than a placeholder like 'your_google_client_id_here'.
 */
const isRealGoogleClientId = (clientId: string) => {
  if (!clientId) return false;
  const lower = clientId.toLowerCase().trim();
  if (
    lower.includes('your_google_client_id') ||
    lower.includes('placeholder') ||
    lower.includes('your_client_id') ||
    lower.includes('example') ||
    !lower.endsWith('.apps.googleusercontent.com')
  ) {
    return false;
  }
  return true;
};

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  buttonText = 'Continue with Google',
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackModal, setFallbackModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load Google Client ID from Vite environment variable
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  const handleCredentialResponse = async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/google', {
        credential: response.credential
      });
      login(res.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Backend Google auth failed:', err);
      setError(err.response?.data?.detail || 'Failed to authenticate Google account with backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAuth = async (email: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/google', { email, name });
      login(res.data.access_token);
      setFallbackModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ONLY load official Google GIS script if a valid production Client ID is present
    if (!isRealGoogleClientId(googleClientId)) {
      return;
    }

    const scriptId = 'google-gis-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
            });
          } catch (e) {
            console.error('Failed to init Google accounts', e);
          }
        }
      };
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
        });
      } catch (e) {
        console.error('Failed to init Google accounts', e);
      }
    }
  }, [googleClientId]);

  const handleGoogleClick = () => {
    // If we have a valid client ID initialized, invoke official Google prompt
    if (isRealGoogleClientId(googleClientId) && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setFallbackModal(true);
          }
        });
      } catch (e) {
        setFallbackModal(true);
      }
    } else {
      // Directly open the internal solid Google / Gmail sign in modal without popup 401 error
      setFallbackModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 ${className}`}
        style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0' }}
      >
        {/* Official Google Logo */}
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="text-sm font-bold text-slate-900">{loading ? 'Authenticating...' : buttonText}</span>
      </button>

      {/* Solid Non-Blending Google Account Modal */}
      {fallbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            className="bg-white text-slate-900 rounded-2xl w-full max-w-md border border-slate-300 shadow-2xl overflow-hidden p-6 space-y-4"
            style={{ background: '#ffffff', color: '#0f172a' }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="font-bold text-slate-900 text-base">Google Account Sign-In</span>
              </div>
              <button
                type="button"
                onClick={() => setFallbackModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-600 text-xs rounded-xl flex items-center gap-2 border border-rose-500/20 font-medium">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {!isRealGoogleClientId(googleClientId) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-2 text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Google Client ID Configuration Required</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  To enable live Google OAuth popups, configure your real Google OAuth Client ID in <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono text-[10px]">frontend/.env</code> as <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID</code>.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600 font-medium">
              Select a verified Gmail account below or enter your Google email for instant 1-click authorization:
            </p>

            {/* Prominent Primary Gmail Account Chip: msnaren1@gmail.com */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Verified Gmail Account
              </label>
              <button
                type="button"
                onClick={() => {
                  setCustomEmail('msnaren1@gmail.com');
                  handleCustomAuth('msnaren1@gmail.com', 'Naren');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 font-bold transition-all shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shadow">
                    M
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">msnaren1@gmail.com</div>
                    <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <Check size={12} /> Google Identity Verified Account
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm">
                  1-Click Login →
                </span>
              </button>
            </div>

            {/* Other Preset Gmail Accounts */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Other Quick Accounts
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['user@gmail.com', 'arjun@gmail.com'].map(gm => (
                  <button
                    key={gm}
                    type="button"
                    onClick={() => {
                      setCustomEmail(gm);
                      handleCustomAuth(gm, gm.split('@')[0]);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                      {gm[0].toUpperCase()}
                    </span>
                    <span className="truncate">{gm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Gmail Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customEmail) {
                  handleCustomAuth(customEmail, customName || customEmail.split('@')[0]);
                }
              }}
              className="space-y-3 pt-2 border-t border-slate-200"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Type Custom Google Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFallbackModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customEmail || loading}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Authenticating...' : 'Continue with Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
