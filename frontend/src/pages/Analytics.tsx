import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, PieChart as PieIcon, BarChart3, AlertCircle } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

export const Analytics: React.FC = () => {
  const [days, setDays] = useState(30);
  const [categories, setCategories] = useState<{ name: string; icon: string; amount: number; percentage: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [catRes, monthRes, trendRes, foreRes, insRes] = await Promise.all([
        api.get(`/analytics/categories?days=${days}`),
        api.get('/analytics/monthly?months=6'),
        api.get('/analytics/trends'),
        api.get('/analytics/forecast'),
        api.get('/analytics/insights')
      ]);

      setCategories(catRes.data || []);
      setMonthlyData(monthRes.data || []);
      setTrends(trendRes.data);
      setForecast(foreRes.data);
      setInsights(insRes.data.insights || []);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash Analytics & Forecast</h1>
          <p className="text-muted-foreground text-sm mt-1">Deep analysis of cash spending patterns and financial performance</p>
        </div>

        <select
          value={days}
          onChange={e => setDays(parseInt(e.target.value))}
          className="bg-card border border-border text-foreground text-sm font-medium rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary outline-none shadow-sm"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 3 Months</option>
          <option value={180}>Last 6 Months</option>
          <option value={365}>Last 1 Year</option>
        </select>
      </div>

      {/* Overview Cards */}
      {trends && trends.has_data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Average Transaction</span>
            <p className="text-3xl font-bold text-foreground mt-2">₹{trends.average_transaction?.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Per expense transaction</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Largest Expense</span>
            <p className="text-3xl font-bold text-rose-600 mt-2">
              ₹{trends.largest_expense?.amount ? trends.largest_expense.amount.toLocaleString('en-IN') : 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {trends.largest_expense?.description || 'N/A'} ({trends.largest_expense?.date || ''})
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Most Used Category</span>
            <p className="text-3xl font-bold text-primary mt-2">{trends.most_used_category || 'N/A'}</p>
            <p className="text-xs text-muted-foreground mt-1">Highest frequency category</p>
          </div>
        </div>
      )}

      {/* Main Charts */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading financial analytics...</div>
      ) : categories.length === 0 && monthlyData.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Analytics Data Available</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            Add transactions to generate interactive graphs, category pie charts, spending trends, and expense forecasts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses by Category Pie Chart */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <PieIcon className="text-primary" size={20} />
              <span>Category Breakdown ({days} Days)</span>
            </h2>

            <div className="h-[260px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                    stroke="none"
                  >
                    {categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
              {categories.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-muted-foreground flex-1 truncate">{item.name}</span>
                  <span className="font-bold text-foreground">₹{item.amount.toLocaleString('en-IN')} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Financial Forecast Card */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="text-primary" size={20} />
                <span>Expense Forecast</span>
              </h2>

              {forecast && forecast.has_sufficient_data ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <span className="text-xs font-semibold text-primary uppercase">Estimated Monthly Expenses</span>
                    <p className="text-3xl font-bold text-primary mt-1">₹{forecast.estimated_monthly.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on current month daily average of ₹{forecast.daily_average}
                    </p>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-xl space-y-2 text-xs border border-border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Month Spent So Far:</span>
                      <span className="font-semibold text-foreground">₹{forecast.current_month_so_far.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence Level:</span>
                      <span className="font-semibold text-emerald-600">{forecast.confidence}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-muted/30 border border-border rounded-xl text-center space-y-2">
                  <AlertCircle className="mx-auto text-amber-500" size={28} />
                  <h4 className="font-semibold text-foreground text-sm">Insufficient Data for Forecast</h4>
                  <p className="text-xs text-muted-foreground">
                    Add at least 3 transactions to generate an AI-powered expense forecast for the end of the month.
                  </p>
                </div>
              )}
            </div>

            {/* Smart Insights List */}
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Key Insights</h4>
              <ul className="space-y-1 text-xs text-foreground">
                {insights.map((ins, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Income vs Expenses Bar Chart */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-6">Monthly Cash In vs Cash Out Trend</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
