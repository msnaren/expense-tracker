import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Plus,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  TrendingUp,
  Zap,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { CreateChallengeModal } from '../components/CreateChallengeModal';
import { AddChallengeProgressModal } from '../components/AddChallengeProgressModal';

interface Challenge {
  id: number;
  title: string;
  description?: string;
  category: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'abandoned';
  challenge_type: string;
  icon: string;
  days_remaining: number;
  progress_percentage: number;
  remaining_amount: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}

interface GamificationStats {
  current_streak: number;
  longest_streak: number;
  total_saved: number;
  active_challenges_count: number;
  completed_challenges_count: number;
  badges: Badge[];
}

const PRESET_QUICK_CARDS = [
  {
    title: 'Save ₹5,000 this month',
    description: 'A 30-day target to set aside ₹5,000.',
    category: 'Monthly Saver',
    target_amount: 5000,
    days: 30,
    challenge_type: 'fixed_amount',
    icon: '📈',
    badgeText: 'Most Popular'
  },
  {
    title: 'No-spend weekend',
    description: 'Zero unnecessary spends for 3 full days.',
    category: 'No-Spend',
    target_amount: 1000,
    days: 3,
    challenge_type: 'no_spend',
    icon: '🛡️',
    badgeText: 'Quick Sprint'
  },
  {
    title: 'Reduce food spending by 10%',
    description: 'Save ~₹2,000 on takeout & dining out.',
    category: 'Food Cutback',
    target_amount: 2000,
    days: 30,
    challenge_type: 'cutback',
    icon: '🥗',
    badgeText: 'Smart Cutback'
  },
  {
    title: 'Save ₹100 per day',
    description: 'Daily consistency challenge = ₹3,000/mo.',
    category: 'Daily Habit',
    target_amount: 3000,
    days: 30,
    challenge_type: 'daily_streak',
    icon: '🔥',
    badgeText: 'Habit Builder'
  },
  {
    title: '30-day savings challenge',
    description: 'Stash ₹150/day to reach ₹4,500.',
    category: '30-Day Sprint',
    target_amount: 4500,
    days: 30,
    challenge_type: 'fixed_amount',
    icon: '🎯',
    badgeText: 'Milestone'
  }
];

export const Challenges: React.FC = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedChallengeForProgress, setSelectedChallengeForProgress] = useState<Challenge | null>(null);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [challengesRes, statsRes] = await Promise.all([
        api.get('/challenges'),
        api.get('/challenges/gamification/stats')
      ]);
      setChallenges(challengesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load challenges & stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickCheckin = async () => {
    try {
      await api.post('/challenges/checkin', {
        amount: 0,
        notes: 'Daily check-in streak activity'
      });
      setCheckinMessage('🔥 Daily check-in logged! Streak updated!');
      setTimeout(() => setCheckinMessage(null), 3500);
      fetchData();
    } catch (err) {
      console.error('Check-in failed', err);
    }
  };

  const handleDeleteChallenge = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this challenge?')) return;
    try {
      await api.delete(`/challenges/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete challenge', err);
    }
  };

  const openCreateWithTemplate = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    setIsCreateModalOpen(true);
  };

  const openCustomCreate = () => {
    setSelectedTemplate(null);
    setIsCreateModalOpen(true);
  };

  const openAddProgress = (challenge: Challenge) => {
    setSelectedChallengeForProgress(challenge);
    setIsProgressModalOpen(true);
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header section with quick action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Savings Challenges
            </h1>
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles size={12} /> Gamified
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Turn your financial goals into motivating micro-challenges, build daily streaks, and earn badges!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleQuickCheckin}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Flame size={18} className="animate-pulse" />
            <span>Daily Check-in</span>
          </button>

          <button
            onClick={openCustomCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>New Challenge</span>
          </button>
        </div>
      </div>

      {/* Checkin Alert Banner */}
      {checkinMessage && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-transparent border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 font-medium text-sm animate-fade-in shadow-sm">
          <Flame size={20} className="text-amber-500" />
          <span>{checkinMessage}</span>
        </div>
      )}

      {/* Gamification Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-background to-rose-500/10 p-5 rounded-2xl border border-amber-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Saving Streak</span>
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-rose-500 text-white rounded-xl shadow-sm">
              <Flame size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {stats?.current_streak || 0}
            </span>
            <span className="text-sm font-medium text-muted-foreground">Days in a row</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats && stats.current_streak > 0
              ? `Best streak: ${stats.longest_streak} days. Keep it rolling! 🔥`
              : 'Log savings or tap Check-in to start your streak!'}
          </p>
        </div>

        {/* Total Saved Card */}
        <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Challenge Savings</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground">
              ₹{(stats?.total_saved || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Stashed away through gamified micro-goals 🎉
          </p>
        </div>

        {/* Active Challenges Card */}
        <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Active Sprints</span>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {activeChallenges.length}
            </span>
            <span className="text-sm text-muted-foreground">In Progress</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {completedChallenges.length} challenges successfully completed 🏆
          </p>
        </div>

        {/* Badges Earned Card */}
        <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Achievements</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Trophy size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {stats?.badges.filter(b => b.unlocked).length || 0}
            </span>
            <span className="text-sm text-muted-foreground">
              of {stats?.badges.length || 5} Unlocked
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Level up badges as you hit key milestones ⭐
          </p>
        </div>
      </div>

      {/* Achievement Badges Showcase */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">Achievement Badges</h2>
          </div>
          <span className="text-xs text-muted-foreground">Unlock trophies as you save</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats?.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center relative ${
                badge.unlocked
                  ? 'bg-gradient-to-b from-amber-500/15 via-background to-amber-500/5 border-amber-500/40 shadow-sm'
                  : 'bg-muted/20 border-border/60 opacity-75'
              }`}
            >
              {badge.unlocked && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 size={12} />
                </div>
              )}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-transform ${
                badge.unlocked ? 'scale-110 shadow-inner' : 'grayscale opacity-60'
              }`}>
                {badge.icon}
              </div>
              <h4 className="font-bold text-xs text-foreground leading-tight mb-1">{badge.name}</h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{badge.description}</p>
              
              <div className="w-full mt-auto">
                {badge.unlocked ? (
                  <span className="inline-block w-full py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 rounded-md">
                    UNLOCKED 🏆
                  </span>
                ) : (
                  <div className="space-y-1">
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{Math.round(badge.progress)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 1-Click Popular Challenges Carousel / Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-primary" /> Popular Preset Challenges
            </h2>
            <p className="text-xs text-muted-foreground">Pick a ready-made challenge and start with one tap</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESET_QUICK_CARDS.map((tmpl, idx) => (
            <div
              key={idx}
              onClick={() => openCreateWithTemplate(tmpl)}
              className="bg-background hover:bg-card border border-border hover:border-primary/50 p-4 rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{tmpl.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tmpl.badgeText}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {tmpl.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">₹{tmpl.target_amount.toLocaleString()}</span>
                <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active & Completed Challenges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-2 text-sm font-bold transition-colors relative ${
                activeTab === 'active'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Challenges ({activeChallenges.length})
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-2 text-sm font-bold transition-colors relative ${
                activeTab === 'completed'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completed Trophies ({completedChallenges.length})
              {activeTab === 'completed' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading challenges...</div>
        ) : activeTab === 'active' ? (
          activeChallenges.length === 0 ? (
            <div className="bg-background p-10 rounded-2xl border border-border text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4 text-2xl">
                🎯
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No active challenges</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Start a preset challenge above or create a custom saving sprint to kickstart your progress!
              </p>
              <button
                onClick={openCustomCreate}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={18} />
                Create Your First Challenge
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-background rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Icon, Title, and Days Left Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                          {challenge.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground line-clamp-1">{challenge.title}</h3>
                          <span className="text-[11px] text-muted-foreground">{challenge.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-secondary/80 text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0">
                        <Clock size={12} />
                        <span>{challenge.days_remaining}d left</span>
                      </div>
                    </div>

                    {challenge.description && (
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                        {challenge.description}
                      </p>
                    )}

                    {/* Progress Stats */}
                    <div className="space-y-2 mb-4 bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-muted-foreground">Saved so far</span>
                        <span className="font-bold text-foreground text-sm">
                          ₹{challenge.current_amount.toLocaleString()} <span className="text-muted-foreground font-normal">/ ₹{challenge.target_amount.toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-emerald-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(challenge.progress_percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-0.5">
                        <span>Remaining: ₹{challenge.remaining_amount.toLocaleString()}</span>
                        <span className="font-bold text-primary">{Math.round(challenge.progress_percentage)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => openAddProgress(challenge)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} /> Log Savings
                    </button>
                    <button
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                      title="Abandon Challenge"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          completedChallenges.length === 0 ? (
            <div className="bg-background p-10 rounded-2xl border border-border text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-4 text-2xl">
                🏆
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No completed challenges yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Once you reach 100% on any savings sprint, it will be immortalized here in your trophy room!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10 rounded-2xl p-5 border border-amber-500/30 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shrink-0">
                          🏆
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{challenge.title}</h3>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> COMPLETED
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-background/80 rounded-xl border border-border text-center">
                      <span className="text-xs text-muted-foreground">Total Achieved</span>
                      <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₹{challenge.current_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ended on {format(new Date(challenge.end_date), 'MMM dd, yyyy')}</span>
                    <button
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Non-shaming / Positive philosophy banner */}
      <div className="p-4 bg-muted/40 rounded-2xl border border-border flex items-center gap-3 text-xs text-muted-foreground">
        <Info size={18} className="shrink-0 text-primary" />
        <p>
          <strong>SpendWise Philosophy:</strong> Gamification is 100% positive, optional, and designed for celebration. We never shame or penalize your daily spending choices. Take challenges at your own rhythm!
        </p>
      </div>

      {/* Modals */}
      <CreateChallengeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchData}
        initialTemplate={selectedTemplate}
      />

      <AddChallengeProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        onSuccess={fetchData}
        challenge={selectedChallengeForProgress}
      />
    </div>
  );
};
