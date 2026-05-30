import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Lock, ArrowUpRight, Activity, DollarSign, Building2, Clock, Zap, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { canAccessPlan, SubscriptionPlanId } from '../types';

interface WhaleActivity {
  id: string;
  symbol: string;
  activity_type: 'buy' | 'sell' | 'options' | 'block';
  value_usd: number;
  institution: string | null;
  notes_he: string;
  plan_required: SubscriptionPlanId;
  occurred_at: string;
}

interface MarketSignal {
  id: string;
  title_he: string;
  body_he: string;
  signal_type: 'bullish' | 'bearish' | 'neutral';
  plan_required: SubscriptionPlanId;
  created_at: string;
}

const ACTIVITY_CONFIG = {
  buy:     { label: 'רכישה', icon: TrendingUp,   bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  sell:    { label: 'מכירה', icon: TrendingDown,  bg: 'bg-red-500/10',     border: 'border-red-500/25',     text: 'text-red-400',     dot: 'bg-red-400' },
  options: { label: 'אופציות', icon: Zap,         bg: 'bg-blue-500/10',    border: 'border-blue-500/25',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  block:   { label: 'עסקת בלוק', icon: Building2, bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400',   dot: 'bg-amber-400' },
};

const SIGNAL_CONFIG = {
  bullish: { label: 'חיובי',  icon: TrendingUp,   bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', barColor: 'bg-emerald-500' },
  bearish: { label: 'שלילי',  icon: TrendingDown,  bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     barColor: 'bg-red-500' },
  neutral: { label: 'ניטרלי', icon: Minus,          bg: 'bg-slate-700/30',   border: 'border-slate-600/40',   text: 'text-slate-300',   barColor: 'bg-slate-500' },
};

function formatValue(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  return `$${(usd / 1_000).toFixed(0)}K`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `לפני ${days} ימים`;
  if (hours > 0) return `לפני ${hours} שעות`;
  return `לפני ${mins} דקות`;
}

interface LockedOverlayProps {
  plan: SubscriptionPlanId;
  onUpgrade: () => void;
}

function LockedOverlay({ plan, onUpgrade }: LockedOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-amber-400" />
      </div>
      <p className="text-white font-semibold mb-1">תוכן זה דורש מנוי {plan.toUpperCase()}</p>
      <p className="text-slate-500 text-sm mb-5 max-w-xs">שדרג את המנוי שלך כדי לצפות בסיגנלים ובפעילות הוויל המלאה</p>
      <button
        onClick={onUpgrade}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20 text-sm"
      >
        <ArrowUpRight className="w-4 h-4" />
        שדרג ל-{plan.toUpperCase()}
      </button>
    </div>
  );
}

interface DashboardProps {
  onNavigateSubscription: () => void;
}

export default function WhaleActivity({ onNavigateSubscription }: DashboardProps) {
  const { currentPlan } = useSubscription();
  const [activities, setActivities] = useState<WhaleActivity[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'options' | 'block'>('all');

  const canSeeBasic = canAccessPlan(currentPlan, 'basic');
  const canSeePro = canAccessPlan(currentPlan, 'pro');
  const canSeeVip = canAccessPlan(currentPlan, 'vip');

  useEffect(() => {
    Promise.all([
      supabase.from('whale_activities').select('*').eq('is_active', true).order('occurred_at', { ascending: false }).limit(50),
      supabase.from('whale_market_signals').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10),
    ]).then(([{ data: acts, error: actsErr }, { data: sigs, error: sigsErr }]) => {
      if (acts && !actsErr) setActivities(acts as WhaleActivity[]);
      if (sigs && !sigsErr) setSignals(sigs as MarketSignal[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const visibleActivities = activities.filter((a) => {
    const planOk = canAccessPlan(currentPlan, a.plan_required as SubscriptionPlanId);
    const typeOk = filter === 'all' || a.activity_type === filter;
    return planOk && typeOk;
  });

  const lockedCount = activities.filter((a) => !canAccessPlan(currentPlan, a.plan_required as SubscriptionPlanId)).length;

  const totals = {
    buyUsd: visibleActivities.filter(a => a.activity_type === 'buy' || a.activity_type === 'block').reduce((s, a) => s + a.value_usd, 0),
    sellUsd: visibleActivities.filter(a => a.activity_type === 'sell').reduce((s, a) => s + a.value_usd, 0),
    count: visibleActivities.length,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f1a]" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0b0f1a]/95 backdrop-blur border-b border-slate-700/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              פעילות הכסף הגדול
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">מעקב אחרי עסקאות מוסדיות וויל — בזמן אמת</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-cyan-400 text-xs font-medium">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#141929] border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-slate-500 text-xs">זרימה נכנסת</p>
            </div>
            <p className="text-emerald-400 text-xl font-bold">{canSeeBasic ? formatValue(totals.buyUsd) : '—'}</p>
          </div>
          <div className="bg-[#141929] border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <p className="text-slate-500 text-xs">זרימה יוצאת</p>
            </div>
            <p className="text-red-400 text-xl font-bold">{canSeeBasic ? formatValue(totals.sellUsd) : '—'}</p>
          </div>
          <div className="bg-[#141929] border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              <p className="text-slate-500 text-xs">עסקאות גלויות</p>
            </div>
            <p className="text-cyan-400 text-xl font-bold">{canSeeBasic ? totals.count : '—'}</p>
          </div>
        </div>

        {/* Market Signals */}
        <div>
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            סיגנלי שוק מוסדיים
          </h2>

          {!canSeePro ? (
            <LockedOverlay plan="pro" onUpgrade={onNavigateSubscription} />
          ) : (
            <div className="space-y-3">
              {signals.map((sig) => {
                const cfg = SIGNAL_CONFIG[sig.signal_type];
                const Icon = cfg.icon;
                const isLocked = !canAccessPlan(currentPlan, sig.plan_required as SubscriptionPlanId);
                return (
                  <div key={sig.id} className={`relative rounded-2xl border p-5 ${cfg.bg} ${cfg.border} overflow-hidden`}>
                    <div className={`absolute right-0 top-0 bottom-0 w-1 ${cfg.barColor}`} />
                    {isLocked ? (
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-3 bg-slate-700/60 rounded w-40 mb-2 blur-[2px]" />
                          <div className="h-2.5 bg-slate-700/40 rounded w-full blur-[2px]" />
                        </div>
                        <button onClick={onNavigateSubscription} className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg flex-shrink-0 transition">
                          VIP
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${cfg.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-white font-semibold text-sm">{sig.title_he}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/40 ${cfg.text}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{sig.body_he}</p>
                            <p className="text-slate-600 text-xs mt-2">{timeAgo(sig.created_at)}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              עסקאות מוסדיות אחרונות
            </h2>
            {/* Filter buttons */}
            {canSeeBasic && (
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'buy', 'sell', 'options', 'block'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${filter === f ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
                  >
                    {f === 'all' ? 'הכל' : ACTIVITY_CONFIG[f].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!canSeeBasic ? (
            <LockedOverlay plan="basic" onUpgrade={onNavigateSubscription} />
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#141929] border border-slate-700/30 rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-700/50 rounded w-24" />
                      <div className="h-3 bg-slate-700/30 rounded w-64" />
                    </div>
                    <div className="h-5 bg-slate-700/40 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleActivities.map((activity) => {
                const cfg = ACTIVITY_CONFIG[activity.activity_type];
                const Icon = cfg.icon;
                return (
                  <div key={activity.id} className={`bg-[#141929] border ${cfg.border} rounded-2xl p-4 hover:bg-[#1a2235] transition-colors`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${cfg.text}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-white font-bold text-base">{activity.symbol}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          {activity.institution && (
                            <span className="text-xs text-slate-500 bg-slate-800/50 border border-slate-700/30 px-2 py-0.5 rounded-full">
                              {activity.institution}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{activity.notes_he}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-600 text-xs">{timeAgo(activity.occurred_at)}</span>
                        </div>
                      </div>

                      <div className="text-left flex-shrink-0">
                        <p className={`text-lg font-bold ${cfg.text}`}>{formatValue(activity.value_usd)}</p>
                        <p className="text-slate-600 text-xs text-left">USD</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Locked items teaser */}
              {lockedCount > 0 && (
                <div className="bg-[#141929] border border-amber-500/20 rounded-2xl p-4 text-center">
                  <Lock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-300 text-sm font-medium">{lockedCount} עסקאות נוספות נעולות</p>
                  <p className="text-slate-500 text-xs mb-3">שדרג לPRO/VIP לגישה מלאה לכל הנתונים</p>
                  <button
                    onClick={onNavigateSubscription}
                    className="text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/25 text-amber-400 px-4 py-2 rounded-lg transition"
                  >
                    שדרג עכשיו
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-800/20 border border-slate-700/20 rounded-xl p-4">
          <p className="text-slate-600 text-xs text-center leading-relaxed">
            נתוני הפעילות המוסדית מוצגים לצרכי מידע ומחקר בלבד. אינם מהווים ייעוץ השקעות או המלצה לפעולה. Whale Radar אינה אחראית לתוצאות מסחר.
          </p>
        </div>
      </div>
    </div>
  );
}
