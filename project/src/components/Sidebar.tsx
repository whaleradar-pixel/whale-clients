import { useState } from 'react';
import { TrendingUp, LayoutDashboard, Crown, User, LogOut, Bell, ChevronRight, Shield, Menu, X, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

type Page = 'dashboard' | 'subscription' | 'profile' | 'whales';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'חינמי', color: 'text-slate-400' },
  basic: { label: 'בסיסי', color: 'text-blue-400' },
  pro: { label: 'מקצועי', color: 'text-emerald-400' },
  vip: { label: 'VIP', color: 'text-amber-400' },
};

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { id: 'whales', label: 'כסף גדול', icon: Activity, badge: 'NEW' },
  { id: 'subscription', label: 'מנוי', icon: Crown },
  { id: 'profile', label: 'פרופיל', icon: User },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { currentPlan } = useSubscription();
  const planInfo = PLAN_LABELS[currentPlan] ?? PLAN_LABELS.free;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const avatar = profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#141929] border-l border-slate-700/50 flex-col h-screen sticky top-0 flex-shrink-0" dir="rtl">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight block leading-none">Whale Radar</span>
              <span className="text-slate-500 text-xs">פלטפורמת מסחר</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => handleNavigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${currentPage === id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${currentPage === id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>{label}</span>
              {badge && currentPage !== id && (
                <span className="mr-auto text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
              {currentPage === id && <ChevronRight className="w-3 h-3 mr-auto text-cyan-400/60" />}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-2">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400 text-xs">מנוי נוכחי</span>
              </div>
              <span className={`text-xs font-bold ${planInfo.color}`}>{planInfo.label}</span>
            </div>
            {currentPlan !== 'vip' && (
              <button
                onClick={() => handleNavigate('subscription')}
                className="w-full text-xs text-center bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/20 text-cyan-400 rounded-lg py-1.5 transition"
              >
                שדרג עכשיו
              </button>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'משתמש'}</p>
              <p className="text-slate-500 text-xs truncate">{profile?.email}</p>
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                <Bell className="w-4 h-4" />
              </button>
              <button onClick={signOut} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-40 bg-[#141929]/95 backdrop-blur border-b border-slate-700/50 px-4 py-3 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Whale Radar</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/50 ${planInfo.color}`}>{planInfo.label}</span>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-[#141929] border-l border-slate-700/50 flex flex-col h-full mr-auto shadow-2xl">
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-base block leading-none">Whale Radar</span>
                  <span className="text-slate-500 text-xs">פלטפורמת מסחר</span>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => handleNavigate(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group ${currentPage === id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${currentPage === id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{label}</span>
                  {badge && currentPage !== id && (
                    <span className="mr-auto text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">{badge}</span>
                  )}
                  {currentPage === id && <ChevronRight className="w-3 h-3 mr-auto text-cyan-400/60" />}
                </button>
              ))}
            </nav>

            <div className="px-3 pb-3">
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400 text-xs">מנוי נוכחי</span>
                  </div>
                  <span className={`text-xs font-bold ${planInfo.color}`}>{planInfo.label}</span>
                </div>
                {currentPlan !== 'vip' && (
                  <button
                    onClick={() => handleNavigate('subscription')}
                    className="w-full text-xs text-center bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/20 text-cyan-400 rounded-lg py-2 transition"
                  >
                    שדרג עכשיו
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold">
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'משתמש'}</p>
                  <p className="text-slate-500 text-xs truncate">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                יציאה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 right-0 left-0 z-40 bg-[#141929]/95 backdrop-blur border-t border-slate-700/50 px-2 py-1.5 flex items-center justify-around" dir="rtl">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNavigate(id)}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200 ${currentPage === id ? 'text-cyan-400' : 'text-slate-500 active:text-slate-300'}`}
          >
            <div className={`relative ${currentPage === id ? 'after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
