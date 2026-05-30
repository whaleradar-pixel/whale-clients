import { useState, useEffect, useCallback } from 'react';
import { Lock, TrendingUp, Search, X, ExternalLink, BarChart2, Brain, Radio, Clock, ArrowUpRight, Bell, BellOff, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { hasApiKey } from '../lib/finnhub';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useMarketData } from '../hooks/useMarketData';
import { useMarketStatus } from '../hooks/useMarketStatus';
import { MarketGroup, SubscriptionPlanId, canAccessPlan } from '../types';
import StockCard from '../components/StockCard';

const PLAN_ICONS: Record<SubscriptionPlanId, string> = {
  free: '🌐', basic: '⚡', pro: '🚀', vip: '👑',
};

const WATCHLIST_LIMITS: Record<SubscriptionPlanId, number> = {
  free: 5,
  basic: 20,
  pro: Infinity,
  vip: Infinity,
};

interface AIAnalysisResult {
  analysis_he: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  momentum: string;
  volume_note: string;
  trend: string;
  cached: boolean;
}

interface PriceAlert {
  id: string;
  symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

async function fetchAIAnalysis(
  symbol: string,
  price: number,
  change: number,
  changePercent: number,
  volume?: number
): Promise<AIAnalysisResult | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? supabaseKey;

    const res = await fetch(`${supabaseUrl}/functions/v1/ai-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, price, change, changePercent, volume }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface AnalysisModalProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  canUseAI: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

function AnalysisModal({ symbol, price, change, changePercent, volume, canUseAI, onClose, onUpgrade }: AnalysisModalProps) {
  const isPositive = changePercent >= 0;
  const [tab, setTab] = useState<'chart' | 'ai'>('chart');
  const [aiResult, setAIResult] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState(false);

  const loadAI = useCallback(async () => {
    if (!canUseAI || aiResult || aiLoading) return;
    setAILoading(true);
    setAIError(false);
    const result = await fetchAIAnalysis(symbol, price, change, changePercent, volume);
    if (result) {
      setAIResult(result);
    } else {
      setAIError(true);
    }
    setAILoading(false);
  }, [symbol, price, change, changePercent, volume, canUseAI, aiResult, aiLoading]);

  useEffect(() => {
    if (tab === 'ai' && canUseAI) loadAI();
  }, [tab, canUseAI, loadAI]);

  const signalColors = {
    bullish: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'חיובי' },
    bearish: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'שלילי' },
    neutral: { bg: 'bg-slate-700/30', border: 'border-slate-600/40', text: 'text-slate-300', label: 'ניטרלי' },
  };
  const sig = aiResult ? signalColors[aiResult.signal] : signalColors[isPositive ? 'bullish' : 'bearish'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <TrendingUp className={`w-5 h-5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{symbol}</h3>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">${price.toFixed(2)}</span>
                <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/50">
          <button
            onClick={() => setTab('chart')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${tab === 'chart' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart2 className="w-4 h-4" />
            גרף
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${tab === 'ai' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <Brain className="w-4 h-4" />
            ניתוח AI
            {!canUseAI && <Lock className="w-3 h-3 text-amber-400 mr-1" />}
          </button>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-auto flex items-center gap-1.5 px-4 py-3 text-slate-500 hover:text-cyan-400 text-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            TradingView
          </a>
        </div>

        <div className="p-5">
          {tab === 'chart' ? (
            <div className="aspect-video bg-[#0b0f1a] rounded-xl overflow-hidden border border-slate-700/40">
              <iframe
                src={`https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=${symbol}&interval=D&hidesidetoolbar=1&theme=dark&style=1&locale=he&toolbar_bg=141929&withdateranges=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&calendar=0&news=0`}
                className="w-full h-full"
                allow="clipboard-write"
              />
            </div>
          ) : !canUseAI ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-amber-400" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">ניתוח AI — PRO ומעלה</h4>
              <p className="text-slate-400 text-sm max-w-xs mb-5 leading-relaxed">
                גישה לניתוח AI מתקדם עם סיגנלים, מומנטום, וניתוח מגמות זמינה ממנוי PRO ומעלה.
              </p>
              <button
                onClick={() => { onClose(); onUpgrade(); }}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg"
              >
                <ArrowUpRight className="w-4 h-4" />
                שדרג ל-PRO
              </button>
            </div>
          ) : aiLoading ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-slate-800/30 border-slate-700/30 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-slate-700 rounded" />
                  <div className="h-3 bg-slate-700 rounded w-28" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-full" />
                  <div className="h-3 bg-slate-700/40 rounded w-4/5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-800/50 rounded-xl p-3 text-center animate-pulse">
                    <div className="h-2.5 bg-slate-700/50 rounded w-12 mx-auto mb-2" />
                    <div className="h-3.5 bg-slate-700/50 rounded w-10 mx-auto" />
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs text-center flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin inline-block" />
                מנתח נתוני שוק...
              </p>
            </div>
          ) : aiError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
              <p className="text-slate-400 text-sm mb-3">לא הצלחנו לטעון את הניתוח</p>
              <button onClick={loadAI} className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-lg transition">
                נסה שוב
              </button>
            </div>
          ) : aiResult ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${sig.bg} ${sig.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className={`w-4 h-4 ${sig.text}`} />
                  <span className={`text-sm font-semibold ${sig.text}`}>
                    סיגנל: {sig.label}
                  </span>
                  {aiResult.cached && (
                    <span className="text-xs text-slate-600 mr-auto">מטמון</span>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{aiResult.analysis_he}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'מומנטום', value: aiResult.momentum, color: aiResult.signal === 'bullish' ? 'text-emerald-400' : aiResult.signal === 'bearish' ? 'text-red-400' : 'text-slate-300' },
                  { label: 'נפח', value: aiResult.volume_note, color: 'text-slate-300' },
                  { label: 'מגמה', value: aiResult.trend, color: aiResult.trend === 'עולה' ? 'text-emerald-400' : aiResult.trend === 'יורד' ? 'text-red-400' : 'text-slate-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">{label}</p>
                    <p className={`text-sm font-semibold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs text-center">* ניתוח לצרכי מידע בלבד. אינו מהווה המלצת השקעה.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Triggered Alerts History ───────────────────────────────── */

const HISTORY_PAGE_SIZE = 5;

function TriggeredAlertsHistory({ alerts, onDelete }: { alerts: PriceAlert[]; onDelete: (id: string) => void }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(alerts.length / HISTORY_PAGE_SIZE);
  const visible = alerts.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs font-medium">היסטוריית התראות ({alerts.length})</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5 rotate-90" />
            </button>
            <span className="text-slate-600 text-xs">{page + 1}/{totalPages}</span>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        )}
      </div>
      {visible.map((alert) => (
        <div key={alert.id} className="flex items-center justify-between bg-slate-800/20 border border-slate-700/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-sm font-mono font-semibold">{alert.symbol}</p>
              <p className="text-slate-600 text-xs">
                {alert.condition === 'above' ? '▲' : '▼'} ${alert.target_price}
                {alert.triggered_at && (
                  <span className="mr-1.5">
                    · {new Date(alert.triggered_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => onDelete(alert.id)} className="p-1.5 text-slate-700 hover:text-slate-500 hover:bg-slate-700/30 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Price Alerts Panel ─────────────────────────────────────── */

interface PriceAlertsPanelProps {
  onClose: () => void;
}

function PriceAlertsPanel({ onClose }: PriceAlertsPanelProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setAlerts(data as PriceAlert[]);
        setLoading(false);
      });
  }, [user?.id]);

  const handleAdd = async () => {
    if (!user) return;
    const sym = symbol.trim().toUpperCase();
    const price = parseFloat(targetPrice);
    if (!sym || isNaN(price) || price <= 0) {
      setAddError('הכנס סימול ומחיר תקינים');
      return;
    }
    setAdding(true);
    setAddError('');
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({ user_id: user.id, symbol: sym, target_price: price, condition })
      .select()
      .single();
    setAdding(false);
    if (error) {
      setAddError('שגיאה בהוספת ההתראה');
      return;
    }
    setAlerts((prev) => [data as PriceAlert, ...prev]);
    setSymbol('');
    setTargetPrice('');
    setSuccessMsg('התראה נוספה בהצלחה');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">התראות מחיר</h3>
              <p className="text-slate-500 text-xs">{activeAlerts.length} התראות פעילות</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Add new alert */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <p className="text-slate-300 text-sm font-medium">הוסף התראה חדשה</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="סימול (AAPL)"
                maxLength={8}
                className="bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/50 transition font-mono"
              />
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="מחיר יעד ($)"
                min="0"
                step="0.01"
                className="bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>
            <div className="flex gap-2">
              {(['above', 'below'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${condition === c ? (c === 'above' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400') : 'bg-slate-800/30 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
                >
                  {c === 'above' ? '▲ מעל' : '▼ מתחת'}
                </button>
              ))}
            </div>
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            {successMsg && (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />{successMsg}
              </p>
            )}
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              {adding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              הוסף התראה
            </button>
          </div>

          {/* Active alerts */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-14 bg-slate-800/30 rounded-xl animate-pulse" />)}
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <BellOff className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">אין התראות פעילות</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-medium">פעילות ({activeAlerts.length})</p>
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${alert.condition === 'above' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-white text-sm font-mono font-semibold">{alert.symbol}</p>
                      <p className={`text-xs ${alert.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {alert.condition === 'above' ? '▲ מעל' : '▼ מתחת'} ${alert.target_price}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Triggered alerts history */}
          {triggeredAlerts.length > 0 && (
            <TriggeredAlertsHistory alerts={triggeredAlerts} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}

function MarketGroupCard({
  group, hasAccess, onUpgrade, currentPlan, watchlistCount, onWatchlistChange,
}: {
  group: MarketGroup;
  hasAccess: boolean;
  onUpgrade: () => void;
  currentPlan: SubscriptionPlanId;
  watchlistCount: number;
  onWatchlistChange: (delta: number) => void;
}) {
  const { quotes, loading } = useMarketData(hasAccess ? group.symbols : []);
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [watchlistLimitMsg, setWatchlistLimitMsg] = useState(false);

  const canUseAI = canAccessPlan(currentPlan, 'pro');
  const watchlistLimit = WATCHLIST_LIMITS[currentPlan];

  useEffect(() => {
    if (!user || !hasAccess) return;
    supabase.from('user_watchlists').select('symbol').eq('user_id', user.id).then(({ data }) => {
      if (data) setWatchlist(new Set(data.map((r) => r.symbol)));
    });
  }, [user?.id, hasAccess]);

  const toggleWatchlist = async (symbol: string) => {
    if (!user) return;
    if (watchlist.has(symbol)) {
      await supabase.from('user_watchlists').delete().eq('user_id', user.id).eq('symbol', symbol);
      setWatchlist((prev) => { const s = new Set(prev); s.delete(symbol); return s; });
      onWatchlistChange(-1);
    } else {
      if (watchlistCount >= watchlistLimit) {
        setWatchlistLimitMsg(true);
        setTimeout(() => setWatchlistLimitMsg(false), 3500);
        return;
      }
      await supabase.from('user_watchlists').insert({ user_id: user.id, symbol });
      setWatchlist((prev) => new Set(prev).add(symbol));
      onWatchlistChange(1);
    }
  };

  const selectedQuote = selectedStock ? quotes[selectedStock] : null;

  return (
    <>
      <div className="bg-[#141929] border border-slate-700/40 rounded-2xl overflow-hidden">
        {/* Group header */}
        <button
          onClick={() => hasAccess ? setIsExpanded(!isExpanded) : onUpgrade()}
          className="w-full flex items-center gap-4 p-5 hover:bg-slate-700/10 transition-colors"
        >
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${group.gradient_from} ${group.gradient_to} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-right">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">{group.name_he}</h3>
              {!hasAccess && (
                <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Lock className="w-3 h-3" />
                  {PLAN_ICONS[group.required_plan]} {group.required_plan.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">{group.description_he}</p>
          </div>
          <div className="flex items-center gap-3">
            {hasAccess && !loading && (
              <div className="text-left">
                <div className="flex gap-1">
                  {group.symbols.slice(0, 3).map((sym) => {
                    const q = quotes[sym];
                    if (!q) return null;
                    return (
                      <span key={sym} className={`text-xs font-mono ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(1)}%
                      </span>
                    );
                  }).filter(Boolean).map((el, i) => [el, i < 2 ? <span key={`sep-${i}`} className="text-slate-700 text-xs">·</span> : null]).flat()}
                </div>
              </div>
            )}
            <div className={`w-6 h-6 flex items-center justify-center text-slate-500 transition-transform duration-200 ${isExpanded && hasAccess ? 'rotate-90' : ''}`}>
              {hasAccess ? '›' : <Lock className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Watchlist limit warning */}
        {watchlistLimitMsg && (
          <div className="mx-5 mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-2.5">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-xs flex-1">
              הגעת למגבלת {watchlistLimit} מניות במעקב עבור מנוי {currentPlan.toUpperCase()}.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
              className="text-xs text-amber-400 hover:text-amber-300 underline flex-shrink-0 transition"
            >
              שדרג
            </button>
          </div>
        )}

        {/* Stocks grid */}
        {isExpanded && hasAccess && (
          <div className="px-5 pb-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {group.symbols.map((sym) => (
                  <div key={sym} className="bg-[#1a2235] rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-700/50 rounded mb-3 w-16" />
                    <div className="h-6 bg-slate-700/50 rounded w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {group.symbols.map((sym) => {
                  const quote = quotes[sym];
                  if (!quote) return null;
                  return (
                    <StockCard
                      key={sym}
                      quote={quote}
                      isWatchlisted={watchlist.has(sym)}
                      onToggleWatchlist={toggleWatchlist}
                      onClick={setSelectedStock}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Locked overlay */}
        {!hasAccess && (
          <div className="px-5 pb-5">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center">
              <Lock className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">קבוצה זו דורשת מנוי <strong className="text-amber-400">{group.required_plan.toUpperCase()}</strong> ומעלה</p>
              <button
                onClick={onUpgrade}
                className="mt-3 text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/20 text-amber-400 px-4 py-1.5 rounded-lg transition"
              >
                שדרג מנוי
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedQuote && (
        <AnalysisModal
          symbol={selectedQuote.symbol}
          price={selectedQuote.price}
          change={selectedQuote.change}
          changePercent={selectedQuote.changePercent}
          volume={selectedQuote.volume}
          canUseAI={canUseAI}
          onClose={() => setSelectedStock(null)}
          onUpgrade={() => { setSelectedStock(null); onUpgrade(); }}
        />
      )}
    </>
  );
}

interface DashboardProps {
  onNavigateSubscription: () => void;
}

function MarketStatusBadge() {
  const market = useMarketStatus();

  const statusStyles: Record<string, { dot: string; bg: string; border: string; text: string }> = {
    open:           { dot: 'bg-emerald-400 animate-pulse', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    early_close:    { dot: 'bg-amber-400 animate-pulse',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-400' },
    pre_market:     { dot: 'bg-blue-400 animate-pulse',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400' },
    after_hours:    { dot: 'bg-orange-400',                bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400' },
    closed_holiday: { dot: 'bg-red-400',                   bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
    closed_weekend: { dot: 'bg-slate-500',                 bg: 'bg-slate-700/20',   border: 'border-slate-700/40',   text: 'text-slate-400' },
    closed_today:   { dot: 'bg-slate-500',                 bg: 'bg-slate-700/20',   border: 'border-slate-700/40',   text: 'text-slate-400' },
  };

  const s = statusStyles[market.status] ?? statusStyles.closed_today;

  return (
    <div className={`flex items-center gap-2 ${s.bg} border ${s.border} rounded-xl px-3 py-2`} title={market.detail}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
      <div className="flex flex-col leading-tight">
        <span className={`text-xs font-semibold ${s.text} whitespace-nowrap`}>{market.label}</span>
        <span className="text-slate-600 text-[10px] whitespace-nowrap">{market.nextEventLabel}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigateSubscription }: DashboardProps) {
  const { profile, user } = useAuth();
  const { currentPlan, hasAccess } = useSubscription();
  const market = useMarketStatus();
  const [groups, setGroups] = useState<MarketGroup[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMarketDetail, setShowMarketDetail] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  useEffect(() => {
    supabase
      .from('market_groups')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (data && !error) setGroups(data as MarketGroup[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_watchlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => { if (count !== null) setWatchlistCount(count); });
  }, [user?.id]);

  const filteredGroups = groups.filter((g) =>
    !search || g.name_he.includes(search) || g.symbols.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  const firstName = profile?.full_name?.split(' ')[0] || 'סוחר';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <>
    <div className="flex-1 overflow-y-auto bg-[#0b0f1a]" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0b0f1a]/95 backdrop-blur border-b border-slate-700/30 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl truncate">{greeting}, {firstName}</h1>
            <p className="text-slate-500 text-sm">שווקים בזמן אמת · {market.etTime} · <span className="text-slate-400">{market.ilTime}</span></p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש מניה..."
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pr-9 pl-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 w-32 sm:w-40"
              />
            </div>

            {/* Market status badge — clickable for detail */}
            <button onClick={() => setShowMarketDetail(v => !v)}>
              <MarketStatusBadge />
            </button>

            {/* Price Alerts button */}
            <button
              onClick={() => setShowAlerts(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 rounded-xl px-3 py-2 transition"
              title="התראות מחיר"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-medium hidden sm:inline">התראות</span>
            </button>

            {hasApiKey() ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-3 py-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium hidden sm:inline">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-amber-400 text-xs font-medium hidden sm:inline">Demo</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable market detail */}
        {showMarketDetail && (
          <div className="mt-3 bg-[#141929] border border-slate-700/40 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-slate-300 leading-relaxed">{market.detail}</p>
                <div className="flex flex-wrap gap-4 mt-3">
                  <div>
                    <p className="text-slate-600 text-xs">שעה (ET)</p>
                    <p className="text-white font-mono font-semibold">{market.etTime}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">שעה (ישראל)</p>
                    <p className="text-cyan-300 font-mono font-semibold">{market.ilTime}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">הפתיחה הבאה</p>
                    <p className="text-cyan-400 font-medium">{market.nextOpen}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">אירוע הבא</p>
                    <p className="text-amber-400 font-medium">{market.nextEventLabel}</p>
                  </div>
                </div>
                <p className="text-slate-700 text-xs mt-3">שעות מסחר רגילות: ב'–ו' 09:30–16:00 ET | פרה-מרקט 04:00–09:30 | After Hours 16:00–20:00</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'קבוצות נגישות', value: groups.filter((g) => hasAccess(g.required_plan)).length, suffix: `/${groups.length}`, color: 'text-cyan-400' },
            {
              label: 'מניות במעקב',
              value: watchlistCount,
              suffix: WATCHLIST_LIMITS[currentPlan] === Infinity ? '' : `/${WATCHLIST_LIMITS[currentPlan]}`,
              color: watchlistCount >= WATCHLIST_LIMITS[currentPlan] ? 'text-amber-400' : 'text-amber-400',
            },
            { label: 'מנוי פעיל', value: currentPlan.toUpperCase(), suffix: '', color: 'text-emerald-400' },
          ].map(({ label, value, suffix, color }) => (
            <div key={label} className="bg-[#141929] border border-slate-700/30 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}<span className="text-slate-600 text-sm">{suffix}</span></p>
            </div>
          ))}
        </div>

        {/* Market groups */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#141929] border border-slate-700/40 rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-700/50 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700/50 rounded w-32" />
                    <div className="h-3 bg-slate-700/30 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <MarketGroupCard
                key={group.id}
                group={group}
                hasAccess={hasAccess(group.required_plan)}
                onUpgrade={onNavigateSubscription}
                currentPlan={currentPlan}
                watchlistCount={watchlistCount}
                onWatchlistChange={(delta) => setWatchlistCount((c) => c + delta)}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 bg-slate-800/20 border border-slate-700/20 rounded-xl p-4">
          <p className="text-slate-600 text-xs leading-relaxed text-center">
            המידע המוצג בפלטפורמה הינו למטרות מידע בלבד ואינו מהווה ייעוץ השקעות, המלצה לרכישה או מכירה של ניירות ערך.
            כל משתמש אחראי באופן בלעדי על החלטותיו הפיננסיות. Whale Radar אינה אחראית לכל הפסד שייגרם.
            {' '}
            <a href="mailto:whaleradar@whaleradar.dev" className="text-slate-500 hover:text-slate-400 transition">whaleradar@whaleradar.dev</a>
            {' · '}
            <a href="https://wa.me/972524899914" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition">052-489-9914</a>
          </p>
        </div>
      </div>
    </div>

    {showAlerts && <PriceAlertsPanel onClose={() => setShowAlerts(false)} />}
    </>
  );
}
