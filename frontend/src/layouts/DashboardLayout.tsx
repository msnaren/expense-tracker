import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme, type MoneyBgTheme } from '../hooks/useTheme';
import api from '../services/api';
import { FloatingAIAssistant } from '../components/FloatingAIAssistant';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  PieChart,
  Target,
  Repeat,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  Trophy,
  IndianRupee,
  Plus,
  Coins,
  Palette,
  Layers,
  Image as ImageIcon,
  Calendar,
  CalendarDays
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, moneyBg, setMoneyBg } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showThemePopover, setShowThemePopover] = useState(false);
  const [showAddTabPopover, setShowAddTabPopover] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Cash Savings', path: '/savings', icon: PiggyBank },
    { name: 'Cash Expenses', path: '/transactions', icon: ArrowRightLeft },
    { name: 'Budgets', path: '/budgets', icon: Target },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Challenges', path: '/challenges', icon: Trophy },
    { name: 'Cash Wallets', path: '/accounts', icon: Wallet },
    { name: 'Recurring', path: '/recurring', icon: Repeat },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Monthly Tracking', path: '/monthly', icon: Calendar },
    { name: 'Yearly Tracking', path: '/yearly', icon: CalendarDays },
    { name: 'Cash AI', path: '/ai-assistant', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // ─── Closable Tabs State ───
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('spendwise-open-tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return ['/dashboard', '/savings', '/transactions', '/budgets', '/ai-assistant'];
  });

  // Ensure current active path is in openTabs
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath && navItems.some(item => item.path === currentPath)) {
      if (!openTabs.includes(currentPath)) {
        const nextTabs = [...openTabs, currentPath];
        setOpenTabs(nextTabs);
        localStorage.setItem('spendwise-open-tabs', JSON.stringify(nextTabs));
      }
    }
  }, [location.pathname]);

  // Save openTabs to localStorage
  const updateOpenTabs = (tabs: string[]) => {
    setOpenTabs(tabs);
    localStorage.setItem('spendwise-open-tabs', JSON.stringify(tabs));
  };

  const handleCloseTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    e.preventDefault();

    const remainingTabs = openTabs.filter(p => p !== path);

    if (remainingTabs.length === 0) {
      // If user closes all tabs, default to /dashboard
      updateOpenTabs(['/dashboard']);
      navigate('/dashboard');
      return;
    }

    updateOpenTabs(remainingTabs);

    // If the closed tab was currently active, switch to adjacent open tab
    if (location.pathname === path) {
      const closedIndex = openTabs.indexOf(path);
      const nextIndex = Math.max(0, closedIndex - 1);
      navigate(remainingTabs[nextIndex] || remainingTabs[0]);
    }
  };

  const handleOpenTab = (path: string) => {
    if (!openTabs.includes(path)) {
      updateOpenTabs([...openTabs, path]);
    }
    navigate(path);
    setShowAddTabPopover(false);
  };

  const handleCloseAllOtherTabs = (keepPath: string) => {
    updateOpenTabs([keepPath]);
    navigate(keepPath);
  };

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closedNavItems = navItems.filter(item => !openTabs.includes(item.path));

  const bgThemes: { id: MoneyBgTheme; label: string; icon: string; desc: string }[] = [
    { id: 'lockin', label: 'Lock In Cash', icon: '🕶️', desc: 'User Retro Aesthetic Money Wallpaper' },
    { id: 'emerald', label: 'Emerald Empire', icon: '👑', desc: 'Rich Emerald Money Art & Gold Notes' },
    { id: 'gold', label: 'Gold Cash Vault', icon: '🪙', desc: 'Dark Gold Obsidian Vault' },
    { id: 'pattern', label: 'Banknote Grid', icon: '💸', desc: 'Geometric Cash & Watermark' },
    { id: 'none', label: 'Minimal Theme', icon: '✨', desc: 'Standard Clean Dark Glass' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* ─── Aesthetic Money Background Layer ─── */}
      <div className="money-bg-container">
        <div className="money-bg-image fixed inset-0 transition-opacity duration-700" />
        
        {/* Floating Money Particle Effects */}
        {moneyBg !== 'none' && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <span className="floating-money-coin text-2xl" style={{ left: '10%', animationDelay: '0s' }}>💵</span>
            <span className="floating-money-coin text-xl" style={{ left: '25%', animationDelay: '3s' }}>🪙</span>
            <span className="floating-money-coin text-2xl" style={{ left: '50%', animationDelay: '6s' }}>💰</span>
            <span className="floating-money-coin text-xl" style={{ left: '75%', animationDelay: '2s' }}>₹</span>
            <span className="floating-money-coin text-2xl" style={{ left: '90%', animationDelay: '8s' }}>💸</span>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
              <IndianRupee size={18} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                CashTrack
              </span>
              <span className="text-[10px] text-emerald-500/80 font-medium tracking-wider uppercase">
                Aesthetic Money
              </span>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 rounded-md hover:bg-accent text-muted-foreground"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col h-[calc(100vh-4rem)] justify-between py-4">
          <nav className="px-3 space-y-1 overflow-y-auto">
            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Modules
            </div>
            {navItems.map((item) => {
              const isOpen = openTabs.includes(item.path);
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => {
                    if (!isOpen) handleOpenTab(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                      isActive 
                        ? 'font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-md shadow-emerald-500/10' 
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {isOpen && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="Tab Open" />
                  )}
                </NavLink>
              );
            })}
          </nav>
          
          <div className="px-4 mt-auto space-y-2 pt-2 border-t border-border/40">
            {/* Quick Theme Switcher Pill in Sidebar */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-foreground">Money Theme</span>
              </div>
              <button
                onClick={() => setShowThemePopover(!showThemePopover)}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                Change
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-muted-foreground rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass-header z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent text-muted-foreground"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-sm">
              <Coins size={14} className="text-amber-400 animate-pulse" />
              <span>Lock In Cash Mode</span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto relative">
            {/* Notifications Popover */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifPopover(!showNotifPopover);
                  setShowThemePopover(false);
                  setShowAddTabPopover(false);
                }}
                className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifPopover && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card/95 border border-border/80 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  <div className="p-4 border-b border-border/50 font-semibold text-foreground flex justify-between items-center">
                    <span>Notifications</span>
                    <span className="text-xs font-normal text-muted-foreground">{notifications.length} active</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 hover:bg-accent/40 transition-colors">
                          <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                          <span className="text-[10px] text-muted-foreground mt-2 block">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Dark / Light Toggle */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-border/40">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-semibold hidden sm:block text-foreground">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* ─── CLOSABLE TABS / MODULE WORKSPACE BAR (SOLID NON-BLENDING) ─── */}
        <div className="tab-bar-header px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {openTabs.map((path) => {
              const navItem = navItems.find(i => i.path === path);
              if (!navItem) return null;
              const isActive = location.pathname === path;
              const Icon = navItem.icon;

              return (
                <div
                  key={path}
                  onClick={() => navigate(path)}
                  className={`tab-item ${isActive ? 'tab-item-active' : 'tab-item-inactive'}`}
                  title={`Switch to ${navItem.name}`}
                >
                  <Icon size={16} />
                  <span>{navItem.name}</span>

                  {/* CLOSE BUTTON 'X' FOR THE TAB */}
                  <button
                    onClick={(e) => handleCloseTab(e, path)}
                    className="tab-close-btn"
                    title={`Close ${navItem.name} tab`}
                  >
                    <X size={13} className="stroke-[2.5]" />
                  </button>
                </div>
              );
            })}

            {/* '+' ADD MODULE TAB BUTTON */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAddTabPopover(!showAddTabPopover);
                  setShowThemePopover(false);
                  setShowNotifPopover(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all ml-1 shadow-md shadow-emerald-900/40"
                title="Open module in new tab"
              >
                <Plus size={15} className="stroke-[3]" />
                <span className="hidden sm:inline">Add Tab</span>
              </button>

              {showAddTabPopover && (
                <div className="absolute left-0 mt-2 w-64 bg-card/95 border border-border/80 rounded-2xl shadow-2xl z-50 p-2.5 backdrop-blur-xl animate-fade-in">
                  <div className="px-2 py-1.5 mb-2 border-b border-border/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-emerald-400" /> Open Module Tab
                    </span>
                    <button 
                      onClick={() => setShowAddTabPopover(false)}
                      className="p-1 rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {closedNavItems.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      All modules are currently open in tabs!
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {closedNavItems.map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleOpenTab(item.path)}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-emerald-500/15 hover:text-emerald-400 text-muted-foreground transition-all"
                          >
                            <Icon size={15} />
                            <span>{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {openTabs.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => {
                          handleCloseAllOtherTabs(location.pathname);
                          setShowAddTabPopover(false);
                        }}
                        className="w-full text-center py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Close Other Tabs
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground hidden lg:inline-block px-2 py-1 rounded-lg bg-card/40 border border-border/30">
            {openTabs.length} active tab{openTabs.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-transparent">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Widget */}
      <FloatingAIAssistant />
    </div>
  );
};

