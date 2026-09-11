import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface AddChallengeProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  challenge: {
    id: number;
    title: string;
    target_amount: number;
    current_amount: number;
    remaining_amount?: number;
    icon: string;
  } | null;
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

export const AddChallengeProgressModal: React.FC<AddChallengeProgressModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  challenge
}) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setAmount('');
    setNotes('');
    setError(null);
  }, [isOpen, challenge]);

  if (!isOpen || !challenge) return null;

  const remaining = Math.max(0, challenge.target_amount - challenge.current_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/challenges/${challenge.id}/progress`, {
        amount: val,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to log progress', err);
      setError(err.response?.data?.detail || 'Failed to record progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card text-card-foreground rounded-2xl w-full max-w-md border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 via-background to-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
              {challenge.icon || '💰'}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground line-clamp-1">{challenge.title}</h2>
              <p className="text-xs text-muted-foreground">
                Remaining to save: <span className="font-semibold text-foreground">₹{remaining.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Add (₹)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_AMOUNTS.map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => setAmount(quickVal.toString())}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                    amount === quickVal.toString()
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'border-border bg-muted/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  +₹{quickVal}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount to Add (₹) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-8 pr-3.5 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Note / Habit Win (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cooked lunch at home, skipped soda!"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-md disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Saving...' : 'Add Progress 🎉'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
