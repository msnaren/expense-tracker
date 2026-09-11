import React, { useState, useEffect } from 'react';
import { Wallet, Plus, CreditCard, Landmark, Coins, ArrowRightLeft, Trash2, Edit2, X, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

export const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({ name: '', type: 'Bank Account', balance: '0' });
  const [transferForm, setTransferForm] = useState({ from_account_id: '', to_account_id: '', amount: '', description: '' });
  const [message, setMessage] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts');
      setAccounts(response.data);
      if (response.data.length >= 2 && !transferForm.from_account_id) {
        setTransferForm({
          from_account_id: response.data[0].id.toString(),
          to_account_id: response.data[1].id.toString(),
          amount: '',
          description: 'Transfer'
        });
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        name: addForm.name,
        type: addForm.type,
        balance: parseFloat(addForm.balance) || 0
      });
      setShowAddModal(false);
      setAddForm({ name: '', type: 'Bank Account', balance: '0' });
      fetchAccounts();
    } catch (err) {
      alert('Failed to create account');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount) return;
    try {
      await api.put(`/accounts/${editAccount.id}`, {
        name: editAccount.name,
        type: editAccount.type,
        balance: editAccount.balance
      });
      setEditAccount(null);
      fetchAccounts();
    } catch (err) {
      alert('Failed to update account');
    }
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      const res = await api.post('/accounts/recalculate');
      setMessage(res.data.message || 'Balances synchronized successfully!');
      fetchAccounts();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      alert('Failed to recalculate balances');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete account');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) return;
    try {
      const res = await api.post('/accounts/transfer', {
        from_account_id: parseInt(transferForm.from_account_id),
        to_account_id: parseInt(transferForm.to_account_id),
        amount: parseFloat(transferForm.amount),
        description: transferForm.description
      });
      setShowTransferModal(false);
      setMessage(res.data.message);
      fetchAccounts();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to transfer funds');
    }
  };

  const getIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'bank account': return <Landmark size={24} />;
      case 'credit card': return <CreditCard size={24} />;
      case 'cash': return <Coins size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts & Wallets</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage cash, bank accounts, UPI, debit/credit cards, and transfer funds.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            title="Recalculate and synchronize exact balance from all logged transactions"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Sync Correct Balances</span>
          </button>

          {accounts.length >= 2 && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors border border-border"
            >
              <ArrowRightLeft size={18} />
              <span>Transfer Funds</span>
            </button>
          )}

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="col-span-full bg-card p-12 rounded-2xl border border-border text-center shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Wallet size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No accounts added</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Add your first account to start tracking your balances and transactions accurately.
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Add Your First Account
            </button>
          </div>
        ) : (
          accounts.map(account => (
            <div key={account.id} className="bg-card p-6 rounded-2xl border border-border flex flex-col justify-between h-48 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    {getIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{account.name}</h3>
                    <p className="text-xs text-muted-foreground">{account.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setEditAccount(account)}
                    className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                <div className="text-3xl font-bold text-foreground">
                  ₹{account.balance.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Add New Account</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Account"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Type</label>
                <select
                  value={addForm.type}
                  onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Bank Account">Bank Account</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Starting Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addForm.balance}
                  onChange={e => setAddForm({ ...addForm, balance: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Edit Account</h2>
              <button onClick={() => setEditAccount(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={editAccount.name}
                  onChange={e => setEditAccount({ ...editAccount, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Type</label>
                <select
                  value={editAccount.type}
                  onChange={e => setEditAccount({ ...editAccount, type: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Bank Account">Bank Account</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Current Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editAccount.balance}
                  onChange={e => setEditAccount({ ...editAccount, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-base font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditAccount(null)}
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

      {/* Transfer Funds Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Transfer Money</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">From Account</label>
                <select
                  value={transferForm.from_account_id}
                  onChange={e => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Balance: ₹{acc.balance.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">To Account</label>
                <select
                  value={transferForm.to_account_id}
                  onChange={e => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Balance: ₹{acc.balance.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. ATM Cash Withdrawal"
                  value={transferForm.description}
                  onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
