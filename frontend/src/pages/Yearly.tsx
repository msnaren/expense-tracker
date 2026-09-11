import React, { useState, useEffect } from 'react';
import { CalendarDays, ArrowUpRight, ArrowDownRight, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';
import { format, parseISO } from 'date-fns';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  transaction_date: string;
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

export const Yearly: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchYearlyData = async () => {
    try {
      setLoading(true);
      const startStr = `${year}-01-01`;
      const endStr = `${year}-12-31`;

      const txRes = await api.get(`/transactions?start_date=${startStr}&end_date=${endStr}&limit=5000`);
      setTransactions(txRes.data);

      const svRes = await api.get('/savings/records');
      const filteredSavings = svRes.data.filter((record: SavingsRecord) => {
        return record.date.startsWith(year.toString());
      });
      setSavingsRecords(filteredSavings);

    } catch (err) {
      console.error('Failed to fetch yearly data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearlyData();
  }, [year]);

  // Calculations
  const yearlyIncome = transactions
    .filter(t => t.type.toLowerCase() === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const yearlyExpense = transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingBalance = yearlyIncome - yearlyExpense;

  const yearlySavings = savingsRecords.reduce((sum, record) => {
    if (record.type === 'contribution') return sum + record.amount;
    if (record.type === 'withdrawal') return sum - record.amount;
    return sum;
  }, 0);

  // Monthly breakdown array
  const monthlyExpenses = Array(12).fill(0);
  transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .forEach(tx => {
      const monthIndex = parseISO(tx.transaction_date).getMonth();
      monthlyExpenses[monthIndex] += tx.amount;
    });

  // Find highest and lowest spending months
  let highestMonth = '-';
  let highestAmount = -1;
  let lowestMonth = '-';
  let lowestAmount = Infinity;

  // Only consider months where the date has passed or there is an expense
  const currentMonthIndex = new Date().getFullYear() === year ? new Date().getMonth() : 11;

  monthlyExpenses.forEach((amount, index) => {
    if (index <= currentMonthIndex || amount > 0) {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestMonth = months[index];
      }
      if (amount < lowestAmount) {
        lowestAmount = amount;
        lowestMonth = months[index];
      }
    }
  });

  if (highestAmount === -1) highestMonth = 'N/A';
  if (lowestAmount === Infinity) lowestMonth = 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="text-blue-500" /> Yearly Tracking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">High-level summary of your financial progress over the year.</p>
        </div>
        
        {/* Year Selector */}
        <select 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 bg-card border border-border rounded-xl text-foreground font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-emerald-500 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowDownRight size={20} /></div>
                <h3 className="font-semibold text-sm">Yearly Income</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{yearlyIncome.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-rose-500 mb-2">
                <div className="p-2 bg-rose-500/10 rounded-lg"><ArrowUpRight size={20} /></div>
                <h3 className="font-semibold text-sm">Yearly Expenses</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{yearlyExpense.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-blue-500 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg"><IndianRupee size={20} /></div>
                <h3 className="font-semibold text-sm">Remaining Balance</h3>
              </div>
              <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                {remainingBalance >= 0 ? '' : '-'}₹{Math.abs(remainingBalance).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="flex items-center gap-3 text-purple-500 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg"><ArrowDownRight size={20} /></div>
                <h3 className="font-semibold text-sm">Yearly Savings</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{yearlySavings.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Expense Summary List */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-2 flex flex-col h-[450px]">
              <h2 className="text-lg font-bold text-foreground mb-4">Monthly Expense Summary</h2>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {months.map((month, index) => {
                    const amount = monthlyExpenses[index];
                    const isFuture = year === new Date().getFullYear() && index > new Date().getMonth();
                    
                    return (
                      <div key={month} className="flex justify-between items-center p-3 rounded-xl border border-border bg-background">
                        <span className={`font-medium ${isFuture ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{month}</span>
                        <span className={`font-semibold ${amount > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {isFuture ? '-' : `₹${amount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 text-rose-500 mb-3">
                  <div className="p-2 bg-rose-500/10 rounded-lg"><TrendingUp size={24} /></div>
                  <h3 className="font-bold text-foreground">Highest Spending Month</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{highestMonth}</p>
                {highestAmount > -1 && (
                  <p className="text-sm font-semibold text-rose-500 mt-1">₹{highestAmount.toLocaleString('en-IN')}</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 text-emerald-500 mb-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingDown size={24} /></div>
                  <h3 className="font-bold text-foreground">Lowest Spending Month</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{lowestMonth}</p>
                {lowestAmount !== Infinity && (
                  <p className="text-sm font-semibold text-emerald-500 mt-1">₹{lowestAmount.toLocaleString('en-IN')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
