import React, { useState, useEffect } from 'react';
import { Calendar, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  category_id: number;
  account_id: number;
  transaction_date: string;
  category?: { id: number; name: string; icon?: string };
}

interface SavingsRecord {
  id: number;
  amount: number;
  type: string;
  date: string;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Monthly: React.FC = () => {
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMonthData = async () => {
    try {
      setLoading(true);
      // Determine start and end dates for the selected month
      const startDate = new Date(year, selectedMonth, 1);
      const endDate = new Date(year, selectedMonth + 1, 0); // Last day of month

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch transactions
      const txRes = await api.get(`/transactions?start_date=${startStr}&end_date=${endStr}&limit=1000`);
      setTransactions(txRes.data);

      // Fetch savings records to compute Total Savings for the month
      const svRes = await api.get('/savings/records');
      const filteredSavings = svRes.data.filter((record: SavingsRecord) => {
        const recordDate = parseISO(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
      setSavingsRecords(filteredSavings);

    } catch (err) {
      console.error('Failed to fetch monthly data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [selectedMonth, year]);

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type.toLowerCase() === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingBalance = totalIncome - totalExpense;

  const totalSavings = savingsRecords.reduce((sum, record) => {
    if (record.type === 'contribution') return sum + record.amount;
    if (record.type === 'withdrawal') return sum - record.amount;
    return sum;
  }, 0);

  // Category breakdown
  const categoryTotals = transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .reduce((acc, tx) => {
      const catName = tx.category?.name || 'General';
      acc[catName] = (acc[catName] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryArray = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="text-emerald-500" /> Monthly Tracking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Detailed view of your expenses and income for a specific month.</p>
        </div>
        
        {/* Year Selector */}
        <select 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 bg-card border border-border rounded-xl text-foreground font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {/* Month Selector */}
      <div className="bg-card border border-border rounded-2xl p-2 sm:p-4 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(index)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedMonth === index
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-background border border-border text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-emerald-500 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowDownRight size={20} /></div>
                <h3 className="font-semibold text-sm">Total Income</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalIncome.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-rose-500 mb-2">
                <div className="p-2 bg-rose-500/10 rounded-lg"><ArrowUpRight size={20} /></div>
                <h3 className="font-semibold text-sm">Total Expenses</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalExpense.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-amber-500 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg"><IndianRupee size={20} /></div>
                <h3 className="font-semibold text-sm">Remaining Balance</h3>
              </div>
              <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                {remainingBalance >= 0 ? '' : '-'}₹{Math.abs(remainingBalance).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-blue-500 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg"><ArrowDownRight size={20} /></div>
                <h3 className="font-semibold text-sm">Total Savings</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalSavings.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Expenses */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-1 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-foreground mb-4">Category Expenses</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {categoryArray.length === 0 ? (
                  <div className="text-center text-muted-foreground mt-10 text-sm">No expenses for this month</div>
                ) : (
                  categoryArray.map(([name, amount], index) => {
                    const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-foreground">{name}</span>
                          <span className="font-semibold text-rose-500">₹{amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-accent rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">{percentage}%</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-2 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-foreground mb-4">Transaction History</h2>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground mt-10 text-sm">No transactions found for {months[selectedMonth]} {year}.</div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/40 border border-transparent hover:border-border transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type.toLowerCase() === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {tx.type.toLowerCase() === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(tx.transaction_date), 'MMM dd, yyyy')} • {tx.category?.name || 'General'}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.type.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-foreground'}`}>
                          {tx.type.toLowerCase() === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
