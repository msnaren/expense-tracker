import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Edit2, X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

interface Account {
  id: number;
  name: string;
  balance: number;
}

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    target_amount: '',
    target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [contributeForm, setContributeForm] = useState({
    amount: '',
    account_id: ''
  });

  const [message, setMessage] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const [gRes, aRes] = await Promise.all([
        api.get('/goals'),
        api.get('/accounts')
      ]);
      setGoals(gRes.data);
      setAccounts(aRes.data);
      if (aRes.data.length > 0 && !contributeForm.account_id) {
        setContributeForm(prev => ({ ...prev, account_id: aRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error('Failed to fetch goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.target_amount || parseFloat(createForm.target_amount) <= 0) return;
    try {
      await api.post('/goals', {
        name: createForm.name,
        target_amount: parseFloat(createForm.target_amount),
        target_date: createForm.target_date
      });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        target_amount: '',
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchGoals();
    } catch (err) {
      alert('Failed to create goal');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal || !contributeForm.amount || parseFloat(contributeForm.amount) <= 0) return;
    try {
      const res = await api.post(`/goals/${contributeGoal.id}/contribute`, {
        amount: parseFloat(contributeForm.amount),
        account_id: contributeForm.account_id ? parseInt(contributeForm.account_id) : null
      });
      setContributeGoal(null);
      setContributeForm(prev => ({ ...prev, amount: '' }));
      setMessage(`Added ₹${parseFloat(contributeForm.amount).toLocaleString('en-IN')} towards ${contributeGoal.name}!`);
      fetchGoals();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to contribute to goal');
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    try {
      await api.put(`/goals/${editGoal.id}`, {
        name: editGoal.name,
        target_amount: editGoal.target_amount,
        current_amount: editGoal.current_amount,
        target_date: editGoal.target_date
      });
      setEditGoal(null);
      fetchGoals();
    } catch (err) {
      alert('Failed to update goal');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err) {
      alert('Failed to delete goal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Savings Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Set targets for major purchases, emergency funds, and future savings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Create Savings Goal
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Loading goals...</p>
        ) : goals.length === 0 ? (
          <div className="col-span-full bg-card p-12 rounded-2xl border border-border text-center shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Target size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No savings goals yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Whether it's a new laptop, emergency fund, or a vacation, set a target and track contributions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Set Your First Goal
            </button>
          </div>
        ) : (
          goals.map(goal => {
            const percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            
            return (
              <div key={goal.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-foreground">{goal.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Target Date: {goal.target_date ? goal.target_date.split('T')[0] : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                        {Math.round(percent)}%
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2 flex justify-between items-end">
                    <div className="text-2xl font-bold text-foreground">
                      ₹{goal.current_amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Target: ₹{goal.target_amount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-6 border border-border/50">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setContributeGoal(goal)}
                    className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Add Contribution
                  </button>
                  <button
                    onClick={() => setEditGoal(goal)}
                    className="px-4 bg-secondary text-secondary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Create Savings Goal</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Macbook Pro"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="60000"
                  value={createForm.target_amount}
                  onChange={e => setCreateForm({ ...createForm, target_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={createForm.target_date}
                  onChange={e => setCreateForm({ ...createForm, target_date: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Contribute to {contributeGoal.name}</h2>
              <button onClick={() => setContributeGoal(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Contribution Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="1000"
                  value={contributeForm.amount}
                  onChange={e => setContributeForm({ ...contributeForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Deduct From Account (Optional)</label>
                <select
                  value={contributeForm.account_id}
                  onChange={e => setContributeForm({ ...contributeForm, account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Do not deduct from balance</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (₹{acc.balance.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Confirm Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editGoal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Edit Savings Goal</h2>
              <button onClick={() => setEditGoal(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={editGoal.name}
                  onChange={e => setEditGoal({ ...editGoal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={editGoal.target_amount}
                    onChange={e => setEditGoal({ ...editGoal, target_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Saved Amount (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={editGoal.current_amount}
                    onChange={e => setEditGoal({ ...editGoal, current_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={editGoal.target_date ? editGoal.target_date.split('T')[0] : ''}
                  onChange={e => setEditGoal({ ...editGoal, target_date: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditGoal(null)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
