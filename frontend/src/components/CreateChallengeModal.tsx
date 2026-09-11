import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { addDays, format } from 'date-fns';
import api from '../services/api';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: {
    title: string;
    description: string;
    category: string;
    target_amount: number;
    days: number;
    challenge_type: string;
    icon: string;
  } | null;
}

const PRESET_TEMPLATES = [
  {
    title: 'Save ₹5,000 this month',
    description: 'Set aside money consistently to hit a ₹5,000 milestone this month.',
    category: 'Monthly Saver',
    target_amount: 5000,
    days: 30,
    challenge_type: 'fixed_amount',
    icon: '📈'
  },
  {
    title: 'No-spend weekend',
    description: 'Zero non-essential spending this weekend. Cook at home and enjoy free fun!',
    category: 'No-Spend',
    target_amount: 1000,
    days: 3,
    challenge_type: 'no_spend',
    icon: '🛡️'
  },
  {
    title: 'Reduce food spending by 10%',
    description: 'Trim takeaway and dining out expenses by 10% over the next 30 days.',
    category: 'Food Cutback',
    target_amount: 2000,
    days: 30,
    challenge_type: 'cutback',
    icon: '🥗'
  },
  {
    title: 'Save ₹100 per day',
    description: 'Build a daily micro-savings habit by stashing ₹100 every single day.',
    category: 'Daily Habit',
    target_amount: 3000,
    days: 30,
    challenge_type: 'daily_streak',
    icon: '🔥'
  },
  {
    title: '30-day savings challenge',
    description: 'Gradually build up your savings cushion over an exciting 30-day sprint.',
    category: '30-Day Sprint',
    target_amount: 4500,
    days: 30,
    challenge_type: 'fixed_amount',
    icon: '🎯'
  }
];

const ICONS = ['🏆', '🔥', '💰', '🎯', '📈', '🛡️', '🥗', '☕', '🚀', '⭐', '💎', '🌱'];

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [challengeType, setChallengeType] = useState('fixed_amount');
  const [icon, setIcon] = useState('🏆');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTemplate) {
      applyTemplate(initialTemplate);
    } else {
      resetForm();
    }
  }, [initialTemplate, isOpen]);

  const applyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setCategory(tmpl.category);
    setTargetAmount(tmpl.target_amount.toString());
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(addDays(new Date(), tmpl.days), 'yyyy-MM-dd'));
    setChallengeType(tmpl.challenge_type);
    setIcon(tmpl.icon);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('General');
    setTargetAmount('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    setChallengeType('fixed_amount');
    setIcon('🏆');
    setError(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a challenge title.');
      return;
    }
    const amt = parseFloat(targetAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive target amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/challenges', {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        target_amount: amt,
        start_date: startDate,
        end_date: endDate,
        challenge_type: challengeType,
        icon: icon || '🏆',
        current_amount: 0
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create challenge', err);
      setError(err.response?.data?.detail || 'Failed to create challenge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card text-card-foreground rounded-2xl w-full max-w-xl border border-border shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Start a Savings Challenge</h2>
              <p className="text-xs text-muted-foreground">Pick a fun goal to supercharge your financial wellness</p>
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
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Popular Presets (1-Click Fill)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className={`p-2.5 text-left rounded-xl border text-xs transition-all flex flex-col justify-between ${
                    title === tmpl.title
                      ? 'border-primary bg-primary/10 font-medium text-primary shadow-sm'
                      : 'border-border bg-muted/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-base mb-1">{tmpl.icon}</span>
                  <span className="line-clamp-2 font-medium leading-snug">{tmpl.title}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">₹{tmpl.target_amount.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            {/* Title & Icon */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-foreground mb-1.5">Challenge Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Save ₹5,000 this month"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Icon</label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg"
                >
                  {ICONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Amount & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Target Savings (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    placeholder="5000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Saver, Habit, Food"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Target End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description / Motivation (Optional)</label>
              <textarea
                rows={2}
                placeholder="Why are you taking this challenge? Keep yourself inspired!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Starting...' : 'Start Challenge 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
