import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Plus, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { AddTransactionModal } from '../components/AddTransactionModal';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  category_id: number;
  account_id: number;
  payment_method?: string;
  notes?: string;
  category?: { id: number; name: string; icon?: string };
  account?: { id: number; name: string };
  transaction_date: string;
}

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'uploaded' | 'manual'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'income' | 'expense'>('expense');
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get(`/transactions?${params.toString()}`);
      setTransactions(response.data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, categoryFilter, startDate, endDate]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this transaction? This will automatically revert the account balance.")) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (err) {
        alert('Failed to delete transaction');
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;
    try {
      await api.put(`/transactions/${editTx.id}`, {
        account_id: editTx.account_id,
        category_id: editTx.category_id,
        type: editTx.type,
        amount: editTx.amount,
        description: editTx.description,
        transaction_date: editTx.transaction_date,
        payment_method: editTx.payment_method || 'Cash',
        notes: editTx.notes || ''
      });
      setEditTx(null);
      fetchTransactions();
    } catch (err) {
      alert('Failed to update transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete statement of income, expenses, and transfers</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => { setAddModalType('expense'); setIsAddModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>Add Expense</span>
          </button>
          <button 
            onClick={() => { setAddModalType('income'); setIsAddModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6 space-y-4">
        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search description, category, notes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-shadow"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setShowFilterBar(!showFilterBar)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFilterBar ? 'bg-primary/10 border-primary text-primary' : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Drawer / Bar */}
        {showFilterBar && (
          <div className="p-4 bg-muted/30 border border-border rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Transaction Type</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>
        )}

        {/* Record Source Filter Pills */}
        <div className="flex items-center gap-2 border-b border-border pb-3 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              sourceFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            📁 All Records ({transactions.length})
          </button>
          <button
            onClick={() => setSourceFilter('uploaded')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              sourceFilter === 'uploaded'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            📷 Uploaded Receipts ({
              transactions.filter(t => (t.notes || '').toLowerCase().includes('ocr') || (t.notes || '').toLowerCase().includes('receipt') || (t.notes || '').toLowerCase().includes('scan') || (t.description || '').toLowerCase().includes('receipt')).length
            })
          </button>
          <button
            onClick={() => setSourceFilter('manual')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              sourceFilter === 'manual'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            ✏️ Manual Entries ({
              transactions.filter(t => !(t.notes || '').toLowerCase().includes('ocr') && !(t.notes || '').toLowerCase().includes('receipt') && !(t.notes || '').toLowerCase().includes('scan') && !(t.description || '').toLowerCase().includes('receipt')).length
            })
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Transaction / Record</th>
                <th className="py-3 px-4 hidden md:table-cell">Category</th>
                <th className="py-3 px-4 hidden sm:table-cell">Date</th>
                <th className="py-3 px-4 hidden lg:table-cell">Account & Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-base text-foreground">No transactions found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting filters or add a new transaction.</p>
                  </td>
                </tr>
              ) : (
                transactions
                  .filter(tx => {
                    const isUploaded = (tx.notes || '').toLowerCase().includes('ocr') ||
                      (tx.notes || '').toLowerCase().includes('receipt') ||
                      (tx.notes || '').toLowerCase().includes('scan') ||
                      (tx.description || '').toLowerCase().includes('receipt');
                    if (sourceFilter === 'uploaded') return isUploaded;
                    if (sourceFilter === 'manual') return !isUploaded;
                    return true;
                  })
                  .map((tx) => {
                    const isUploaded = (tx.notes || '').toLowerCase().includes('ocr') ||
                      (tx.notes || '').toLowerCase().includes('receipt') ||
                      (tx.notes || '').toLowerCase().includes('scan') ||
                      (tx.description || '').toLowerCase().includes('receipt');

                    return (
                      <tr key={tx.id} className="hover:bg-accent/40 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type.toLowerCase() === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                            }`}>
                              {tx.type.toLowerCase() === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{tx.description}</p>
                                {isUploaded ? (
                                  <span className="text-[10px] bg-amber-500/15 text-amber-600 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                                    📷 Uploaded Scan
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-muted text-muted-foreground font-medium px-1.5 py-0.5 rounded border border-border">
                                    ✏️ Record
                                  </span>
                                )}
                              </div>
                              {tx.notes && <p className="text-xs text-muted-foreground line-clamp-1">{tx.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                            {tx.category?.name || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell text-muted-foreground text-xs">
                          {tx.transaction_date ? tx.transaction_date.split('T')[0] : ''}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell text-muted-foreground text-xs">
                          <div>
                            <span className="font-medium text-foreground">{tx.account?.name || '-'}</span>
                            {tx.payment_method && <span className="block text-[11px] text-muted-foreground">{tx.payment_method}</span>}
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${
                          tx.type.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-foreground'
                        }`}>
                          {tx.type.toLowerCase() === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setEditTx(tx)}
                              className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                              title="Change / Edit Record Details"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(tx.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editTx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Edit Transaction</h2>
              <button onClick={() => setEditTx(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editTx.description}
                  onChange={e => setEditTx({ ...editTx, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={editTx.amount}
                  onChange={e => setEditTx({ ...editTx, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                  <select
                    value={editTx.account_id}
                    onChange={e => setEditTx({ ...editTx, account_id: parseInt(e.target.value) })}
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
                    value={editTx.category_id}
                    onChange={e => setEditTx({ ...editTx, category_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Method</label>
                  <select
                    value={editTx.payment_method || 'Cash'}
                    onChange={e => setEditTx({ ...editTx, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="Debit Card">💳 Debit Card</option>
                    <option value="Credit Card">💳 Credit Card</option>
                    <option value="Net Banking">🏦 Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={editTx.transaction_date ? editTx.transaction_date.split('T')[0] : ''}
                    onChange={e => setEditTx({ ...editTx, transaction_date: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Notes / Scan Details</label>
                <input
                  type="text"
                  placeholder="Notes, tags, or receipt details"
                  value={editTx.notes || ''}
                  onChange={e => setEditTx({ ...editTx, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditTx(null)}
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

      {/* Add Modal */}
      <AddTransactionModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        type={addModalType}
        onSuccess={fetchTransactions}
      />
    </div>
  );
};
