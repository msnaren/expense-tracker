import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Repeat, Plus, CheckCircle, Trash2, Calendar, Play } from 'lucide-react';

interface Account {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface RecurringTransaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  description: string;
  frequency: string;
  next_date: string;
  active: boolean;
}

export const Recurring: React.FC = () => {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    amount: '',
    description: '',
    frequency: 'Monthly',
    next_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, accRes, catRes] = await Promise.all([
        api.get('/recurring'),
        api.get('/accounts'),
        api.get('/categories')
      ]);
      setItems(recRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      if (accRes.data.length > 0 && !formData.account_id) {
        setFormData(prev => ({ ...prev, account_id: accRes.data[0].id.toString() }));
      }
      if (catRes.data.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: catRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;
    try {
      await api.post('/recurring', {
        account_id: parseInt(formData.account_id),
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        description: formData.description,
        frequency: formData.frequency,
        next_date: formData.next_date
      });
      setShowModal(false);
      setFormData({
        account_id: accounts[0]?.id.toString() || '',
        category_id: categories[0]?.id.toString() || '',
        amount: '',
        description: '',
        frequency: 'Monthly',
        next_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) {
      alert('Failed to save recurring item');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.post(`/recurring/${id}/toggle`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessDue = async () => {
    try {
      setProcessing(true);
      const res = await api.post('/recurring/process');
      setMessage(res.data.message);
      fetchData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      alert('Failed to process recurring transactions');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Transactions</h1>
          <p className="text-muted-foreground mt-1">Automate subscriptions, utility bills, and fixed expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleProcessDue}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-colors"
          >
            <Play size={18} />
            <span>{processing ? 'Processing...' : 'Process Due Bills'}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
          >
            <Plus size={18} />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading recurring expenses...</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Repeat size={32} />
          </div>
          <h3 className="text-xl font-semibold text-foreground">No Recurring Expenses</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Add recurring subscriptions like Rent, Netflix, Internet, or Phone bills to keep track of upcoming payments automatically.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Your First Recurring Expense
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className={`bg-card border rounded-xl p-6 transition-all ${item.active ? 'border-border' : 'border-border/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Repeat size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.description}</h3>
                    <span className="text-xs text-muted-foreground">{item.frequency}</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Calendar size={14} />
                <span>Next due: {item.next_date}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    item.active 
                      ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {item.active ? 'Active' : 'Paused'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">New Recurring Expense</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix Subscription"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Next Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formData.next_date}
                    onChange={e => setFormData({ ...formData, next_date: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                <select
                  value={formData.account_id}
                  onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
