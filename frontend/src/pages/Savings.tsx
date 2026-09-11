import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, Minus, Edit2, Trash2, X, AlertCircle, ArrowUpRight, ArrowDownRight, Target, ShieldCheck } from 'lucide-react';
import api from '../services/api';

interface SavingsSummary {
  total_income: number;
  daily_expense_allocation: number;
  daily_expense_spent: number;
  remaining_daily_expense: number;
  total_savings: number;
  total_contributions: number;
  total_withdrawals: number;
  savings_rate: number;
}

interface SavingsRecord {
  id: number;
  user_id: number;
  account_id?: number;
  amount: number;
  type: 'contribution' | 'withdrawal';
  description: string;
  source?: string;
  date: string;
  created_at: string;
}

interface Account {
  id: number;
  name: string;
  balance: number;
}

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

export const Savings: React.FC = () => {
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [records, setRecords] = useState<SavingsRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editRecord, setEditRecord] = useState<SavingsRecord | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: 'Monthly Savings',
    source: 'Monthly Allocation',
    account_id: ''
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: 'Emergency Expense',
    account_id: ''
  });

  const [allocationForm, setAllocationForm] = useState({
    daily_expense_allocation: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      const [sumRes, recRes, accRes, goalRes] = await Promise.all([
        api.get('/savings/summary'),
        api.get('/savings/records'),
        api.get('/accounts'),
        api.get('/goals')
      ]);

      setSummary(sumRes.data);
      setRecords(recRes.data);
      setAccounts(accRes.data);
      setGoals(goalRes.data);

      if (accRes.data.length > 0) {
        setAddForm(prev => ({ ...prev, account_id: prev.account_id || accRes.data[0].id.toString() }));
        setWithdrawForm(prev => ({ ...prev, account_id: prev.account_id || accRes.data[0].id.toString() }));
      }
      if (sumRes.data) {
        setAllocationForm({ daily_expense_allocation: sumRes.data.daily_expense_allocation.toString() });
      }
    } catch (err) {
      console.error('Failed to fetch savings data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingsData();
  }, []);

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) return;

    try {
      await api.post('/savings/contribution', {
        amount: parseFloat(addForm.amount),
        date: new Date(addForm.date).toISOString(),
        description: addForm.description,
        source: addForm.source,
        account_id: addForm.account_id ? parseInt(addForm.account_id) : null
      });

      setShowAddModal(false);
      setAddForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: 'Monthly Savings',
        source: 'Monthly Allocation',
        account_id: accounts[0]?.id.toString() || ''
      });
      setSuccessMsg('Successfully added to savings!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchSavingsData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add savings.');
    }
  };

  const handleWithdrawSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) return;

    try {
      await api.post('/savings/withdrawal', {
        amount: parseFloat(withdrawForm.amount),
        date: new Date(withdrawForm.date).toISOString(),
        reason: withdrawForm.reason,
        account_id: withdrawForm.account_id ? parseInt(withdrawForm.account_id) : null
      });

      setShowWithdrawModal(false);
      setWithdrawForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reason: 'Emergency Expense',
        account_id: accounts[0]?.id.toString() || ''
      });
      setSuccessMsg('Successfully withdrew from savings.');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchSavingsData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to withdraw from savings.');
    }
  };

  const handleUpdateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/savings/allocation', {
        daily_expense_allocation: parseFloat(allocationForm.daily_expense_allocation) || 0
      });
      setShowAllocationModal(false);
      fetchSavingsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update allocation.');
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this savings record? Current savings balance will be recalculated.')) return;
    try {
      await api.delete(`/savings/records/${id}`);
      fetchSavingsData();
    } catch (err) {
      alert('Failed to delete savings record.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    try {
      await api.put(`/savings/records/${editRecord.id}`, {
        amount: editRecord.amount,
        description: editRecord.description,
        source: editRecord.source,
        date: new Date(editRecord.date).toISOString()
      });
      setEditRecord(null);
      fetchSavingsData();
    } catch (err) {
      alert('Failed to update savings record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Savings Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Real, database-backed permanent savings & daily expense allocations</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAllocationModal(true)}
            className="flex-1 sm:flex-none px-4 py-2 border border-border bg-card hover:bg-accent text-foreground rounded-xl font-medium text-sm transition-colors"
          >
            Set Daily Expense Limit
          </button>

          <button
            onClick={() => { setError(null); setShowAddModal(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Add to Savings</span>
          </button>

          <button
            onClick={() => { setError(null); setShowWithdrawModal(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-rose-700 transition-colors shadow-sm"
          >
            <Minus size={18} />
            <span>Withdraw from Savings</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-2 text-sm font-medium">
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary Stats Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Current Savings</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <PiggyBank size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-emerald-600">₹{summary.total_savings.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">Permanent savings balance</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Daily Expense Limit</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ArrowUpRight size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-foreground">₹{summary.daily_expense_allocation.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Spent: ₹{summary.daily_expense_spent.toLocaleString('en-IN')} | Remaining: <strong className="text-emerald-600">₹{summary.remaining_daily_expense.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Contributions</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <ArrowDownRight size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-foreground">₹{summary.total_contributions.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">Total added to savings</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Savings Rate</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Target size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-primary">{summary.savings_rate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Of total income (₹{summary.total_income.toLocaleString('en-IN')})</p>
            </div>
          </div>
        </div>
      )}

      {/* Savings History Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Savings History</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 hidden sm:table-cell">Source / Reason</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">Loading savings history...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-base text-foreground">No savings records yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add to Savings" to start your permanent savings tracker.</p>
                  </td>
                </tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {rec.date ? rec.date.split('T')[0] : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        rec.type === 'contribution' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}>
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">{rec.description}</td>
                    <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-muted-foreground">
                      {rec.source || '-'}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold text-base ${
                      rec.type === 'contribution' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {rec.type === 'contribution' ? '+' : '-'}₹{rec.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditRecord(rec)}
                          className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings Goals Overview */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Target Savings Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const percent = Math.min((g.current_amount / g.target_amount) * 100, 100);
            return (
              <div key={g.id} className="p-4 rounded-xl border border-border bg-background space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-foreground">{g.name}</h4>
                  <span className="text-xs font-semibold text-primary">{percent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Saved: ₹{g.current_amount.toLocaleString('en-IN')}</span>
                  <span>Target: ₹{g.target_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add to Savings Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2 text-emerald-600">
                <Plus size={20} />
                Add to Savings
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="2500"
                  value={addForm.amount}
                  onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Monthly Savings"
                  value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Source</label>
                <input
                  type="text"
                  placeholder="Monthly Allocation, Bonus, Extra Income"
                  value={addForm.source}
                  onChange={e => setAddForm({ ...addForm, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Account (Optional)</label>
                  <select
                    value={addForm.account_id}
                    onChange={e => setAddForm({ ...addForm, account_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw from Savings Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2 text-rose-600">
                <Minus size={20} />
                Withdraw from Savings
              </h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="500"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-bold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="Emergency medical expense, Travel deposit"
                  value={withdrawForm.reason}
                  onChange={e => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={withdrawForm.date}
                    onChange={e => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Destination Account</label>
                  <select
                    value={withdrawForm.account_id}
                    onChange={e => setWithdrawForm({ ...withdrawForm, account_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">None</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-semibold rounded-xl text-xs hover:bg-rose-700 transition-colors shadow-sm"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-lg">Set Daily Expense Allocation</h3>
              <button onClick={() => setShowAllocationModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Daily Expense Limit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2000"
                  value={allocationForm.daily_expense_allocation}
                  onChange={e => setAllocationForm({ daily_expense_allocation: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Allocating ₹2,000 out of ₹4,500 income sets remaining ₹2,500 as target savings.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 shadow-sm"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-lg">Edit Savings Record</h3>
              <button onClick={() => setEditRecord(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editRecord.amount}
                  onChange={e => setEditRecord({ ...editRecord, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editRecord.description}
                  onChange={e => setEditRecord({ ...editRecord, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Source / Reason</label>
                <input
                  type="text"
                  value={editRecord.source || ''}
                  onChange={e => setEditRecord({ ...editRecord, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 shadow-sm"
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
