import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, AlertCircle, Trash2, Edit2, X, Calendar, DollarSign, Calculator, Layers, Sparkles } from 'lucide-react';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
  type: string;
  icon?: string;
}

interface AccountItem {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface CategoryBudgetItem {
  id: number;
  category_id: number;
  category_name: string;
  category_icon?: string;
  period: string;
  amount: number;
  daily_amount: number;
  spent_monthly: number;
  spent_today: number;
  remaining_monthly: number;
  remaining_today: number;
  used_percentage_monthly: number;
  used_percentage_today: number;
}

interface BudgetSummary {
  total_monthly_allocated: number;
  total_daily_allocated: number;
  total_spent_monthly: number;
  total_spent_today: number;
  total_remaining_monthly: number;
  total_remaining_today: number;
  items: CategoryBudgetItem[];
}

export const Budgets: React.FC = () => {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editItem, setEditItem] = useState<CategoryBudgetItem | null>(null);

  // Quick + Add Daily Expense / Increase Budget Modal
  const [quickAddTarget, setQuickAddTarget] = useState<{
    item: CategoryBudgetItem;
    mode: 'expense' | 'increase';
  } | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAccountId, setQuickAccountId] = useState<number | string>('');
  const [quickNote, setQuickNote] = useState('');

  // Category creation form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  // Budget form state
  const [form, setForm] = useState({
    category_id: '',
    period: 'monthly', // 'daily' or 'monthly'
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, catRes, accRes] = await Promise.all([
        api.get('/budgets/summary'),
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setSummary(sumRes.data);
      
      const expenseCats = catRes.data.filter((c: Category) => c.type.toLowerCase() === 'expense');
      setCategories(expenseCats);
      setAccounts(accRes.data || []);

      if (accRes.data && accRes.data.length > 0 && !quickAccountId) {
        setQuickAccountId(accRes.data[0].id);
      }

      if (expenseCats.length > 0 && !form.category_id) {
        setForm(prev => ({ ...prev, category_id: expenseCats[0].id.toString() }));
      }
    } catch (err) {
      console.error("Failed to fetch budget allocation data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const daysInMonth = new Date(form.year, form.month, 0).getDate();

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/categories', {
        name: newCatName.trim(),
        type: 'Expense',
        icon: newCatIcon || '📦'
      });
      setShowCategoryModal(false);
      setNewCatName('');
      setNewCatIcon('📦');
      await fetchData();
      setForm(prev => ({ ...prev, category_id: res.data.id.toString() }));
    } catch (err) {
      alert('Failed to create category');
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0 || !form.category_id) return;
    
    const val = parseFloat(form.amount);
    let amt = val;
    let d_amt = 0;

    if (form.period === 'daily') {
      d_amt = val;
      amt = val * daysInMonth;
    } else {
      amt = val;
      d_amt = val / daysInMonth;
    }

    try {
      await api.post('/budgets', {
        category_id: parseInt(form.category_id),
        period: form.period,
        amount: amt,
        daily_amount: d_amt,
        month: form.month,
        year: form.year
      });
      setShowCreateModal(false);
      setForm(prev => ({ ...prev, amount: '' }));
      fetchData();
    } catch (err) {
      alert('Failed to set budget allocation');
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const daysInCurMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    let amt = editItem.amount;
    let d_amt = editItem.daily_amount;

    if (editItem.period === 'daily') {
      amt = editItem.daily_amount * daysInCurMonth;
    } else {
      d_amt = editItem.amount / daysInCurMonth;
    }

    try {
      await api.put(`/budgets/${editItem.id}`, {
        category_id: editItem.category_id,
        period: editItem.period,
        amount: amt,
        daily_amount: d_amt,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
      setEditItem(null);
      fetchData();
    } catch (err) {
      alert('Failed to update budget allocation');
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Are you sure you want to remove this budget allocation?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete budget allocation');
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTarget || !quickAmount || parseFloat(quickAmount) <= 0) return;
    const val = parseFloat(quickAmount);

    try {
      if (quickAddTarget.mode === 'expense') {
        const selectedAccId = quickAccountId || (accounts.length > 0 ? accounts[0].id : null);
        if (!selectedAccId) {
          alert('Please select or create an account to log expenses');
          return;
        }
        await api.post('/transactions', {
          amount: val,
          type: 'Expense',
          category_id: quickAddTarget.item.category_id,
          account_id: parseInt(selectedAccId.toString()),
          description: quickNote.trim() || `Daily Expense: ${quickAddTarget.item.category_name}`,
          payment_method: 'Cash',
          transaction_date: new Date().toISOString()
        });
      } else {
        // Increase daily budget limit
        const daysInCurMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const newDaily = quickAddTarget.item.daily_amount + val;
        const newMonthly = newDaily * daysInCurMonth;

        await api.put(`/budgets/${quickAddTarget.item.id}`, {
          category_id: quickAddTarget.item.category_id,
          period: 'daily',
          amount: newMonthly,
          daily_amount: newDaily,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
      }

      setQuickAddTarget(null);
      setQuickAmount('');
      setQuickNote('');
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Quick action failed');
    }
  };

  const calculatePreview = () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) return null;
    const num = parseFloat(form.amount);
    if (form.period === 'daily') {
      return {
        daily: num,
        monthly: num * daysInMonth
      };
    } else {
      return {
        daily: num / daysInMonth,
        monthly: num
      };
    }
  };

  const preview = calculatePreview();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Needs & Budget Allocations</h1>
          <p className="text-muted-foreground text-sm mt-1">Set category limits, track daily & monthly spending, and protect your savings</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium hover:bg-accent/80 transition-colors border border-border"
          >
            <Plus size={18} />
            <span>New Category</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>Set Budget Allocation</span>
          </button>
        </div>
      </div>

      {/* Allocation & Spending Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Monthly Allocated</span>
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Calendar size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{summary.total_monthly_allocated.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Sum of monthly limits across categories</p>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Daily Allocated</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Calculator size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">₹{summary.total_daily_allocated.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Total combined daily limit target</p>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Actual Spent (Month / Today)</span>
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600">₹{summary.total_spent_monthly.toLocaleString('en-IN')}</span>
              <span className="text-xs font-medium text-rose-500">(Today: ₹{summary.total_spent_today.toLocaleString('en-IN')})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Actual expenses logged this month</p>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Remaining Budget</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <PiggyBank size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${summary.total_remaining_monthly >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{summary.total_remaining_monthly.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground">(Daily: ₹{summary.total_remaining_today.toLocaleString('en-IN')})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly allocated minus spent</p>
          </div>
        </div>
      )}

      {/* Main Allocations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Loading allocations...</p>
        ) : !summary || summary.items.length === 0 ? (
          <div className="col-span-full bg-card p-12 rounded-2xl border border-border text-center shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Layers size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Category Budgets Set Yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Allocate custom budgets for Petrol, Food, Travel, Shopping, etc. Set a daily or monthly budget for each category and track how much you spend versus your limits.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-semibold hover:bg-accent/80 transition-colors border border-border"
              >
                Create Custom Category
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={18} />
                Set First Allocation
              </button>
            </div>
          </div>
        ) : (
          summary.items.map(item => {
            const isDanger = item.used_percentage_monthly >= 100 || item.used_percentage_today >= 100;
            const isWarning = !isDanger && (item.used_percentage_monthly >= 80 || item.used_percentage_today >= 80);

            return (
              <div key={item.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                        {item.category_icon || '📦'}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{item.category_name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium uppercase tracking-wider">
                          {item.period === 'daily' ? 'Daily Priority' : 'Monthly Priority'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setQuickAddTarget({ item, mode: 'expense' }); setQuickAmount(''); setQuickNote(''); }}
                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 font-semibold text-xs border border-emerald-500/20 transition-all"
                        title="Quick Log Daily Expense or Increase Budget Limit"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                      <button
                        onClick={() => setEditItem(item)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors"
                        title="Edit Allocation"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors"
                        title="Delete Allocation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Limits summary display */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl mb-4 border border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Daily Limit</span>
                      <span className="font-bold text-foreground text-sm">₹{item.daily_amount.toLocaleString('en-IN')}/day</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Monthly Limit</span>
                      <span className="font-bold text-foreground text-sm">₹{item.amount.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>

                  {/* Spending today progress */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Spent Today: ₹{item.spent_today.toLocaleString('en-IN')}</span>
                      <span className={item.remaining_today >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        Rem: ₹{item.remaining_today.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.used_percentage_today >= 100 ? 'bg-destructive' : item.used_percentage_today >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(item.used_percentage_today, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Spending monthly progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Spent Month: ₹{item.spent_monthly.toLocaleString('en-IN')}</span>
                      <span className={item.remaining_monthly >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        Rem: ₹{item.remaining_monthly.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.used_percentage_monthly >= 100 ? 'bg-destructive' : item.used_percentage_monthly >= 80 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(item.used_percentage_monthly, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick + Action Buttons */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => { setQuickAddTarget({ item, mode: 'expense' }); setQuickAmount(''); setQuickNote(''); }}
                      className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-xl font-semibold flex items-center justify-center gap-1 transition-colors border border-emerald-500/20"
                    >
                      <Plus size={14} />
                      <span>Log Daily Expense</span>
                    </button>
                    <button
                      onClick={() => { setQuickAddTarget({ item, mode: 'increase' }); setQuickAmount(''); setQuickNote(''); }}
                      className="flex-1 py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold flex items-center justify-center gap-1 transition-colors border border-primary/20"
                    >
                      <Plus size={14} />
                      <span>Increase Budget</span>
                    </button>
                  </div>
                </div>

                {isWarning && (
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl flex items-start gap-2 text-xs border border-amber-500/20">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>Warning: High spending level reached for this category.</span>
                  </div>
                )}
                {isDanger && (
                  <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl flex items-start gap-2 text-xs border border-destructive/20">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>Budget Limit Exceeded! Reduce spending to stay on target.</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Custom Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                <span>Create Expense Category</span>
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petrol, Groceries, Travel, Coffee"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category Icon / Emoji</label>
                <input
                  type="text"
                  placeholder="⛽, 🍔, ✈️, 🛍️, ☕"
                  value={newCatIcon}
                  onChange={e => setNewCatIcon(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Category Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Set Budget Allocation</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-muted-foreground">Category</label>
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setShowCategoryModal(true); }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    + Add New Category
                  </button>
                </div>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '📦'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Budget Allocation Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, period: 'daily' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.period === 'daily'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    ⚡ Daily Limit
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, period: 'monthly' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.period === 'monthly'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    📅 Monthly Limit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {form.period === 'daily' ? 'Daily Amount (₹)' : 'Monthly Amount (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={form.period === 'daily' ? 'e.g. 50' : 'e.g. 1500'}
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {preview && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1 text-emerald-600">
                  <div className="font-bold uppercase">Automatic Calculation Preview:</div>
                  <div className="flex justify-between">
                    <span>Daily Allocation:</span>
                    <span className="font-bold">₹{preview.daily.toFixed(2)} / day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Allocation:</span>
                    <span className="font-bold">₹{preview.monthly.toFixed(2)} / month</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Allocation Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Edit Budget Allocation</h2>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <input
                  type="text"
                  disabled
                  value={`${editItem.category_icon || '📦'} ${editItem.category_name}`}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Budget Priority</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditItem({ ...editItem, period: 'daily' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      editItem.period === 'daily'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    ⚡ Daily Limit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem({ ...editItem, period: 'monthly' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      editItem.period === 'monthly'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    📅 Monthly Limit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {editItem.period === 'daily' ? 'Daily Amount (₹)' : 'Monthly Amount (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editItem.period === 'daily' ? editItem.daily_amount : editItem.amount}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    if (editItem.period === 'daily') {
                      setEditItem({ ...editItem, daily_amount: v });
                    } else {
                      setEditItem({ ...editItem, amount: v });
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick + Add Daily Expense / Increase Budget Modal */}
      {quickAddTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-xl">
                  {quickAddTarget.item.category_icon || '📦'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {quickAddTarget.item.category_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Quick Action</p>
                </div>
              </div>
              <button onClick={() => setQuickAddTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border/50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setQuickAddTarget({ ...quickAddTarget, mode: 'expense' })}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  quickAddTarget.mode === 'expense'
                    ? 'bg-card text-emerald-600 shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus size={14} />
                <span>Log Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickAddTarget({ ...quickAddTarget, mode: 'increase' })}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  quickAddTarget.mode === 'increase'
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus size={14} />
                <span>Increase Limit</span>
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickAmount(amt.toString())}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        quickAmount === amt.toString()
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-border text-foreground'
                      }`}
                    >
                      + ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {quickAddTarget.mode === 'expense' ? 'Daily Expense Amount (₹)' : 'Increase Daily Limit By (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 150"
                  value={quickAmount}
                  onChange={e => setQuickAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-bold"
                />
              </div>

              {quickAddTarget.mode === 'expense' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                    <select
                      value={quickAccountId}
                      onChange={e => setQuickAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Balance: ₹{acc.balance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Description / Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Lunch, Petrol refill, Snacks"
                      value={quickNote}
                      onChange={e => setQuickNote(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              {/* Status Preview */}
              {quickAmount && !isNaN(parseFloat(quickAmount)) && parseFloat(quickAmount) > 0 && (
                <div className="p-3 bg-muted/50 rounded-xl border border-border/50 text-xs space-y-1">
                  {quickAddTarget.mode === 'expense' ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Remaining Daily Limit:</span>
                      <span className={`font-bold ${quickAddTarget.item.remaining_today - parseFloat(quickAmount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{(quickAddTarget.item.remaining_today - parseFloat(quickAmount)).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Daily Limit Target:</span>
                      <span className="font-bold text-primary">
                        ₹{(quickAddTarget.item.daily_amount + parseFloat(quickAmount)).toFixed(2)} / day
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAddTarget(null)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-semibold rounded-xl transition-colors ${
                    quickAddTarget.mode === 'expense'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {quickAddTarget.mode === 'expense' ? 'Log Daily Expense' : 'Increase Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
