import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, IndianRupee, Plus, Sparkles, PieChart as PieIcon, Wallet, PiggyBank, Target, ShieldCheck, CheckCircle2, Layers, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { ReceiptOCRModal } from '../components/ReceiptOCRModal';
import { Link } from 'react-router-dom';

interface TransactionItem {
  id: number;
  description: string;
  type: string;
  amount: number;
  transaction_date: string;
  category?: { name: string; icon?: string };
  account?: { name: string };
}

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

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expenses: 0,
    balance: 0,
    total_savings: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    cash_balance: 0,
    upi_balance: 0,
    cash_income: 0,
    upi_income: 0,
    cash_expenses: 0,
    upi_expenses: 0,
    monthly_cash_income: 0,
    monthly_upi_income: 0,
    monthly_cash_expenses: 0,
    monthly_upi_expenses: 0
  });

  const [savingsSummary, setSavingsSummary] = useState<SavingsSummary | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<TransactionItem[]>([]);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, savRes, budRes, txRes, dailyRes, insRes, catRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/savings/summary'),
        api.get('/budgets/summary'),
        api.get('/transactions?limit=6'),
        api.get('/analytics/daily?days=7'),
        api.get('/analytics/insights'),
        api.get('/analytics/categories?days=30')
      ]);

      setSummary(sumRes.data);
      setSavingsSummary(savRes.data);
      setBudgetSummary(budRes.data);
      setRecentTxns(txRes.data);
      setChartData(dailyRes.data);
      setInsights(insRes.data.insights || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalTxCount = recentTxns.length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time breakdown of Cash, UPI income, expenses & category budget limits</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsOCRModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium hover:bg-accent/80 transition-colors border border-border text-sm"
          >
            <Sparkles size={18} className="text-primary" />
            <span>Scan Receipt</span>
          </button>

          <button 
            onClick={() => { setModalType('income'); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus size={18} />
            <span>+ Add Income (Cash/UPI)</span>
          </button>
          
          <button 
            onClick={() => { setModalType('expense'); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={18} />
            <span>- Log Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards - Separate Cards with Cash Visual Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Card 1: Cash Wallet */}
        <div className="bg-card cash-glow-card shimmer-container p-5 rounded-2xl border border-emerald-500/30 shadow-sm space-y-3 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="cash-coin-float inline-block">💵</span> Cash Wallet
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
              Cash
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-0.5">Cash Balance</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{(summary.cash_balance || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pt-2 border-t border-border/60 text-xs space-y-1">
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Cash Recd:</span>
              <span>₹{(summary.cash_income || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>Cash Spent:</span>
              <span>₹{(summary.cash_expenses || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: UPI / Bank Account */}
        <div className="bg-card upi-glow-card shimmer-container p-5 rounded-2xl border border-primary/30 shadow-sm space-y-3 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="cash-coin-float inline-block">📱</span> UPI / Bank
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-extrabold px-2 py-0.5 rounded-full border border-primary/20">
              Online
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-0.5">UPI Balance</span>
            <span className="text-2xl font-black text-primary">₹{(summary.upi_balance || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-2 border-t border-border/60 text-xs space-y-1">
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>UPI Recd:</span>
              <span>₹{(summary.upi_income || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>UPI Spent:</span>
              <span>₹{(summary.upi_expenses || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-card shimmer-container p-5 rounded-2xl border border-rose-500/30 shadow-sm space-y-3 hover:border-rose-500/50 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-rose-600 text-xs uppercase tracking-wider flex items-center gap-1">
              <span>💸</span> Total Expenses
            </h3>
            <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-0.5">Combined Spent</span>
            <span className="text-2xl font-extrabold text-rose-600">₹{(summary.total_expenses || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-2 border-t border-border/60 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Cash Total:</span>
              <span className="font-bold text-amber-600">₹{(summary.cash_expenses || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>UPI Total:</span>
              <span className="font-bold text-primary">₹{(summary.upi_expenses || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Available Net Balance */}
        <div className="bg-card shimmer-container p-5 rounded-2xl border border-border shadow-sm space-y-3 hover:border-primary/40 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1">
              <span>🏦</span> Net Balance
            </h3>
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <IndianRupee size={16} />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-0.5">Total In Accounts</span>
            <span className="text-2xl font-black text-foreground">₹{(summary.balance || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
            Cash (₹{(summary.cash_balance || 0).toLocaleString('en-IN')}) & UPI (₹{(summary.upi_balance || 0).toLocaleString('en-IN')})
          </div>
        </div>

        {/* Card 5: Total Savings Vault */}
        <div className="bg-card cash-glow-card shimmer-container p-5 rounded-2xl border border-emerald-500/30 shadow-sm space-y-3 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1">
              <span className="cash-coin-float inline-block">🐖</span> Savings Vault
            </h3>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <PiggyBank size={16} />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-0.5">Total Savings</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{(savingsSummary ? savingsSummary.total_savings : summary.total_savings).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pt-2 border-t border-border/60 text-xs flex justify-between text-muted-foreground">
            <span>Rate:</span>
            <span className="font-bold text-primary">{savingsSummary ? savingsSummary.savings_rate : 0}% of income</span>
          </div>
        </div>
      </div>

      {/* Prominent Real Savings & Daily Expense Tracking Card */}
      {savingsSummary && (
        <div className="bg-gradient-to-r from-emerald-900/10 via-background to-primary/5 p-6 rounded-2xl border border-emerald-500/30 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                <PiggyBank size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Permanent Savings & Daily Expense Tracker</h3>
                <p className="text-xs text-muted-foreground">Normal daily expenses deduct ONLY from daily expense limit, keeping savings intact.</p>
              </div>
            </div>
            <Link
              to="/savings"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0"
            >
              <ShieldCheck size={16} />
              <span>Manage Savings Page</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Income</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">₹{savingsSummary.total_income.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Daily Expense Limit</span>
              <p className="text-lg font-bold text-foreground mt-1">₹{savingsSummary.daily_expense_allocation.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Daily Expense Spent</span>
              <p className="text-lg font-bold text-rose-600 mt-1">₹{savingsSummary.daily_expense_spent.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Remaining Daily Money</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">₹{savingsSummary.remaining_daily_expense.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Savings</span>
              <p className="text-lg font-extrabold text-emerald-600 mt-1">₹{savingsSummary.total_savings.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-card border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Savings Rate</span>
              <p className="text-lg font-bold text-primary mt-1">{savingsSummary.savings_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Category Budget Allocation & Daily Needs Section */}
      {budgetSummary && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Layers size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Category Budget Allocations</h3>
                <p className="text-xs text-muted-foreground">Your custom category limits, spent today, spent this month & remaining balance.</p>
              </div>
            </div>

            <Link
              to="/budgets"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              <span>Manage Allocations</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {budgetSummary.items.length === 0 ? (
            <div className="p-6 bg-muted/20 border border-dashed border-border rounded-xl text-center space-y-2">
              <p className="text-sm font-medium text-foreground">No category budget allocations created yet.</p>
              <p className="text-xs text-muted-foreground">Set up custom daily or monthly budgets for Petrol, Food, Travel, etc.</p>
              <Link
                to="/budgets"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
              >
                + Set Your First Category Budget
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {budgetSummary.items.map(item => (
                <div key={item.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{item.category_icon || '📦'}</span>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{item.category_name}</h4>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          ₹{item.daily_amount.toLocaleString('en-IN')}/day • ₹{item.amount.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                    </div>
                    {item.used_percentage_monthly >= 100 && (
                      <span className="text-[10px] bg-destructive/10 text-destructive font-bold px-2 py-0.5 rounded-full border border-destructive/20">
                        Exceeded
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Spent Today: ₹{item.spent_today.toLocaleString('en-IN')}</span>
                      <span className={item.remaining_today >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                        Rem: ₹{item.remaining_today.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.used_percentage_today >= 100 ? 'bg-destructive' : item.used_percentage_today >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(item.used_percentage_today, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Empty state vs Charts */}
      {totalTxCount === 0 && !loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Welcome to CashTrack! 💰</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No cash entries yet. Start by logging your first expense or adding cash received today.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button 
              onClick={() => { setModalType('expense'); setIsModalOpen(true); }}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Log First Cash Expense
            </button>
            <button 
              onClick={() => { setModalType('income'); setIsModalOpen(true); }}
              className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Add Cash Received
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Spending Trend Chart */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Daily Cash Spending Trend</h2>
                <p className="text-xs text-muted-foreground">Cash outflow over the past 7 days</p>
              </div>
              <Link to="/analytics" className="text-xs font-semibold text-primary hover:underline">
                View Full Analytics →
              </Link>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#spendingGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Financial Insights Panel */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <span>Financial Insights</span>
                </h2>
                <Link to="/ai-assistant" className="text-xs font-semibold text-primary hover:underline">
                  Ask AI →
                </Link>
              </div>

              <div className="space-y-3">
                {insights.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add more transactions to unlock AI insights.</p>
                ) : (
                  insights.slice(0, 3).map((ins, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl flex items-start gap-2.5 text-xs text-foreground">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{ins}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Categories list */}
            {categories.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Top Category Spending</h4>
                <div className="space-y-2">
                  {categories.slice(0, 3).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span>{c.icon || '📦'}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-semibold text-foreground">₹{c.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      {totalTxCount > 0 && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Recent Cash Entries</h2>
            <Link to="/transactions" className="text-xs font-semibold text-primary hover:underline">
              View All Transactions →
            </Link>
          </div>

          <div className="divide-y divide-border">
            {recentTxns.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-accent/30 rounded-xl px-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type.toLowerCase() === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {tx.type.toLowerCase() === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category?.name || 'General'} • {tx.transaction_date ? tx.transaction_date.split('T')[0] : ''}
                    </p>
                  </div>
                </div>

                <div className={`font-bold text-sm ${
                  tx.type.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-foreground'
                }`}>
                  {tx.type.toLowerCase() === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        onSuccess={loadDashboardData}
      />

      {/* Receipt OCR Modal */}
      <ReceiptOCRModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};
