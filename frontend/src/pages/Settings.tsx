import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { User, Lock, Moon, Sun, Download, Trash2, CheckCircle, ShieldAlert } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme, moneyBg, setMoneyBg } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.put('/settings/profile', { name, email });
      setProfileMsg('Profile details updated successfully');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }
    try {
      await api.post('/settings/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await api.get('/settings/backup');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `spendwise_backup_${user?.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export backup data');
    }
  };

  const handleResetData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently wipe all your transactions, budgets, goals, and reset account balances to ₹0. Are you absolutely sure?')) return;
    try {
      await api.post('/settings/reset');
      alert('All financial data reset successfully.');
      window.location.reload();
    } catch (err) {
      alert('Failed to reset data');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account & System Settings</h1>
        <p className="text-muted-foreground mt-1">Manage profile, preferences, security, and data backup</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
          <ShieldAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
            <p className="text-xs text-muted-foreground">Update your personal account information</p>
          </div>
        </div>

        {profileMsg && (
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Appearance & Lock In Theme Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Theme & Appearance</h2>
              <p className="text-xs text-muted-foreground">Active Background: Lock In Retro Cash Stack Wallpaper</p>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-foreground text-sm font-medium transition-colors"
          >
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Security & Password</h2>
            <p className="text-xs text-muted-foreground">Ensure your SpendWise account password remains secure</p>
          </div>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{passwordMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Backup & Data Reset Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Data Management & Backup</h2>
        <p className="text-xs text-muted-foreground">Download your full financial data backup or reset your account</p>
        
        <div className="flex flex-wrap gap-4 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-colors"
          >
            <Download size={18} />
            <span>Download JSON Backup</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 font-medium transition-colors"
          >
            <Trash2 size={18} />
            <span>Reset All Account Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
