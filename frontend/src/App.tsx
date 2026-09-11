import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Analytics } from './pages/Analytics';
import { Accounts } from './pages/Accounts';
import { Goals } from './pages/Goals';
import { Challenges } from './pages/Challenges';
import { SpendWiseAI } from './pages/SpendWiseAI';
import { Recurring } from './pages/Recurring';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Savings } from './pages/Savings';
import { Monthly } from './pages/Monthly';
import { Yearly } from './pages/Yearly';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="savings" element={<Savings />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="challenges" element={<Challenges />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-assistant" element={<SpendWiseAI />} />
            <Route path="monthly" element={<Monthly />} />
            <Route path="yearly" element={<Yearly />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
