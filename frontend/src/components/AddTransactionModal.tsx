import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { showSuccessSticker } from '../utils/sticker';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'income' | 'expense';
  onSuccess: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, type]);

  const fetchData = async () => {
    try {
      const [catsRes, accsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts')
      ]);

      const isIncome = type === 'income';
      const filteredCats = catsRes.data.filter((c: any) => 
        isIncome ? c.type.toLowerCase() === 'income' : c.type.toLowerCase() !== 'income'
      );

      setCategories(filteredCats.length > 0 ? filteredCats : catsRes.data);
      setAccounts(accsRes.data);
      
      if (filteredCats.length > 0) {
        setCategoryId(filteredCats[0].id.toString());
      } else if (catsRes.data.length > 0) {
        setCategoryId(catsRes.data[0].id.toString());
      }

      if (accsRes.data.length > 0) setAccountId(accsRes.data[0].id.toString());
    } catch (err) {
      console.error("Failed to fetch form data", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await api.post('/transactions', {
        amount: parseFloat(amount),
        description: description || (type === 'income' ? 'Income Deposit' : 'Expense'),
        type: type === 'income' ? 'Income' : 'Expense',
        category_id: parseInt(categoryId),
        account_id: parseInt(accountId),
        payment_method: paymentMethod,
        notes: type === 'expense' ? (notes || undefined) : undefined,
        transaction_date: new Date(date).toISOString(),
      });
      onSuccess();
      showSuccessSticker(type);
      onClose();
      setAmount('');
      setDescription('');
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    if (method === 'Cash') {
      const cashAcc = accounts.find(a => a.type.toLowerCase() === 'cash' || a.name.toLowerCase().includes('cash'));
      if (cashAcc) setAccountId(cashAcc.id.toString());
    } else if (method === 'UPI') {
      const upiAcc = accounts.find(a => a.type.toLowerCase() === 'upi' || a.name.toLowerCase().includes('upi') || a.name.toLowerCase().includes('bank'));
      if (upiAcc) setAccountId(upiAcc.id.toString());
    }
  };

  if (!isOpen) return null;

  const isIncome = type === 'income';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-xl border border-border p-6 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6">
          {isIncome ? 'Add Income' : 'Add Expense'}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-semibold text-lg"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Income Source / Category & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isIncome ? 'Income Source' : 'Category'}
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Account</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method (Cash vs UPI / Cards) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {isIncome ? 'Received Via (Payment Method)' : 'Payment Method'}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm font-medium"
            >
              <option value="UPI">📱 UPI</option>
              <option value="Cash">💵 Cash</option>
              <option value="Debit Card">💳 Debit Card</option>
              <option value="Credit Card">💳 Credit Card</option>
              <option value="Net Banking">🏦 Net Banking</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
            <input
              type="date"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
              placeholder={isIncome ? 'E.g., Monthly Salary, Freelance project' : 'E.g., Dinner at Bistro, Grocery store'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Notes (Expense ONLY) */}
          {!isIncome && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
                placeholder="Additional details or tag..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium transition-opacity mt-2 text-white ${
              isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:opacity-90'
            }`}
          >
            {loading ? 'Saving...' : (isIncome ? 'Save Income' : 'Save Expense')}
          </button>
        </form>
      </div>
    </div>
  );
};
