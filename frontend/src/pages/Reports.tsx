import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Download, Calendar, Filter } from 'lucide-react';

interface ReportSummary {
  transaction_count: number;
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  category_breakdown: { name: string; value: number; percentage: number }[];
  payment_breakdown: { method: string; amount: number }[];
  transactions: {
    id: number;
    date: string;
    type: string;
    category: string;
    account: string;
    amount: number;
    description: string;
    payment_method: string;
  }[];
}

export const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/reports/summary?${params.toString()}`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch report summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadCSV = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/reports/export/csv?${params.toString()}&token=${token}`, '_blank');
  };

  const handleDownloadPDF = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/reports/export/pdf?${params.toString()}&token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Reports & Statements</h1>
          <p className="text-muted-foreground mt-1">Generate and export detailed transaction reports and tax statements</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-colors"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
          >
            <FileText size={18} />
            <span>Print Statement / PDF</span>
          </button>
        </div>
      </div>

      {/* Date Filter Card */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 font-medium text-sm transition-colors"
        >
          <Filter size={16} />
          <span>Apply Filter</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Generating report...</div>
      ) : !report || report.transaction_count === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-semibold text-foreground">No Report Data Available</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            There are no transactions in the selected date range. Add income or expenses to see statements.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <span className="text-xs font-medium text-muted-foreground">Total Income</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">₹{report.total_income.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <span className="text-xs font-medium text-muted-foreground">Total Expenses</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">₹{report.total_expense.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <span className="text-xs font-medium text-muted-foreground">Net Savings</span>
              <p className="text-2xl font-bold text-foreground mt-1">₹{report.net_savings.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <span className="text-xs font-medium text-muted-foreground">Savings Rate</span>
              <p className="text-2xl font-bold text-primary mt-1">{report.savings_rate}%</p>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Category Expenses Breakdown</h3>
              <div className="space-y-3">
                {report.category_breakdown.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">₹{cat.value.toLocaleString('en-IN')}</span>
                      <span className="font-bold text-foreground w-12 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Methods Breakdown</h3>
              <div className="space-y-3">
                {report.payment_breakdown.map((pm, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{pm.method}</span>
                    <span className="font-semibold text-foreground">₹{pm.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Transaction List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border font-semibold text-foreground">
              Statement Itemized Transactions ({report.transaction_count})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{tx.date}</td>
                      <td className="px-6 py-4 font-medium capitalize">{tx.type}</td>
                      <td className="px-6 py-4">{tx.category}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{tx.description}</td>
                      <td className={`px-6 py-4 text-right font-bold ${tx.type.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type.toLowerCase() === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
