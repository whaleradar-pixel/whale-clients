import { useState, useCallback } from 'react';
import {
  Search, User, ShieldOff, ShieldCheck, RefreshCw, Send, Clock,
  ChevronDown, ChevronRight, CheckCircle, AlertCircle, AlertTriangle,
  Key, Crown, Zap, Star, Calendar, Mail, Phone, Activity,
  BookOpen, Wrench, RotateCcw, Eye, XCircle, Info, Loader,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type PlanId = 'free' | 'basic' | 'pro' | 'vip';

interface ClientData {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  subscription_plan: PlanId;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  is_email_verified: boolean;
  is_blocked: boolean;
  access_code: string | null;
  admin_notes: string;
  created_at: string;
}

interface SessionData {
  id: string;
  session_token: string;
  user_agent: string;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
}

interface OtpData {
  id: string;
  code: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface SupportActionRecord {
  id: string;
  action_type: string;
  action_data: Record<string, unknown>;
  admin_note: string;
  created_at: string;
}

interface ActionResult { ok: boolean; msg: string }

/* ─────────────────────────────────────────────
   Troubleshooting Guide Data
───────────────────────────────────────────── */
interface TroubleshootEntry {
  id: string;
  category: string;
  title: string;
  symptoms: string[];
  causes: string[];
  steps: string[];
  adminAction?: string; // key of an action the admin can run
  severity: 'low' | 'medium' | 'high';
}

const TROUBLESHOOT_DB: TroubleshootEntry[] = [
  {
    id: 'login-invalid',
    category: 'כניסה',
    title: 'לא יכול להתחבר — אימייל/סיסמה שגויים',
    symptoms: ['הודעה: "אימייל או סיסמה שגויים"', 'לא מצליח להתחבר בשום דרך'],
    causes: ['הסיסמה שגויה', 'האימייל לא רשום במערכת', 'הגדלת אותיות (CapsLock)'],
    steps: [
      'בדוק שהאימייל מדויק בטבלת לקוחות',
      'שלח ללקוח קישור לאיפוס סיסמה דרך כפתור "שלח קישור סיסמה" למטה',
      'אם הבעיה נמשכת — בדוק שהחשבון לא חסום',
    ],
    adminAction: 'send_reset',
    severity: 'medium',
  },
  {
    id: 'login-blocked',
    category: 'כניסה',
    title: 'חשבון חסום',
    symptoms: ['הודעה: "חשבון זה חסום"', 'לא מאפשר כניסה גם עם סיסמה נכונה'],
    causes: ['האדמין חסם ידנית', 'שיתוף גישה זוהה', 'פעילות חשודה'],
    steps: [
      'בדוק בטאב "לקוחות" את סטטוס החסימה',
      'קבל הסבר מהלקוח',
      'אם לגיטימי — בטל חסימה בכפתור למטה',
    ],
    adminAction: 'unblock',
    severity: 'high',
  },
  {
    id: 'login-session-kicked',
    category: 'כניסה',
    title: 'מנותק מיד אחרי כניסה',
    symptoms: ['נכנס ומיד יוצא', 'הודעת שגיאה על מכשיר לא מאושר'],
    causes: ['סשן מכשיר אחר עדיין פעיל', 'שינוי סיסמה שביטל סשנים', 'localStorage פגום'],
    steps: [
      'לחץ "איפוס סשנים" בחלק החיפוש למטה',
      'בקש מהלקוח לנסות כניסה מחדש',
      'אם לא עוזר — אפס גם קוקיז בדפדפן של הלקוח',
    ],
    adminAction: 'reset_sessions',
    severity: 'medium',
  },
  {
    id: 'verify-no-email',
    category: 'אימות',
    title: 'לא קיבל אימייל אימות / OTP',
    symptoms: ['עמוד האימות עלה אבל אין אימייל', 'לא מגיע קוד'],
    causes: ['אימייל בספאם', 'שגיאה בשליחה', 'אימייל שגוי ברישום', 'rate limit (5 קודות/שעה)'],
    steps: [
      'בקש מהלקוח לבדוק תיקיית ספאם/junk',
      'ודא שהאימייל נכון בטבלת לקוחות',
      'שלח קוד OTP מחדש בכפתור "שלח OTP מחדש" למטה',
      'אם עבר שעה מאז 5 קודות — rate limit יתאפס אוטומטית',
    ],
    adminAction: 'resend_otp',
    severity: 'medium',
  },
  {
    id: 'verify-wrong-code',
    category: 'אימות',
    title: 'הקוד לא מתקבל / שגוי',
    symptoms: ['הודעה: "קוד שגוי או פג תוקף"', 'הקוד לא עובד'],
    causes: ['קוד ישן (תוקף 10 דקות)', 'הועתק עם רווח', 'נשלח קוד חדש שבטל ישן'],
    steps: [
      'שלח קוד חדש בכפתור למטה',
      'הנחה את הלקוח להזין מיידית',
      'ודא שהוא מעתיק 6 ספרות בלבד ללא רווחים',
    ],
    adminAction: 'resend_otp',
    severity: 'low',
  },
  {
    id: 'subscription-expired',
    category: 'מנוי',
    title: 'מנוי פג תוקף',
    symptoms: ['גישה נחסמת לתכנים', 'בנר "המנוי שלך פג תוקף"'],
    causes: ['תאריך פקיעה עבר', 'חידוש לא בוצע', 'חיוב נכשל'],
    steps: [
      'בדוק תאריך פקיעה בחיפוש למטה',
      'אם הלקוח שילם — הרחב מנוי בכפתור "הארך מנוי 30 יום"',
      'אם לא שילם — הפנה לדף מנויים לחידוש',
    ],
    adminAction: 'extend_30',
    severity: 'high',
  },
  {
    id: 'subscription-wrong-plan',
    category: 'מנוי',
    title: 'מנוי לא עודכן אחרי תשלום',
    symptoms: ['לקוח שילם אבל רואה עדיין חבילה ישנה', 'Stripe הצליח אבל DB לא עודכן'],
    causes: ['Webhook של Stripe לא הגיע', 'שגיאה ב-Edge Function', 'עיכוב סינכרון'],
    steps: [
      'בדוק לוגים ב-Supabase Edge Functions לשגיאות stripe-webhook',
      'עדכן ידנית בכפתור "שנה חבילה" למטה',
      'שלח אימייל אישור בכפתור "שלח אישור מנוי"',
    ],
    adminAction: 'change_plan',
    severity: 'high',
  },
  {
    id: 'data-not-loading',
    category: 'טכני',
    title: 'נתוני מניות לא טוענים',
    symptoms: ['דשבורד ריק', 'Spinner ממשיך ללא סוף', 'מחירים לא מתעדכנים'],
    causes: ['Finnhub API key חסר/לא תקף', 'WebSocket חסום ב-firewall', 'חיבור אינטרנט חלש'],
    steps: [
      'בקש מהלקוח לפתוח DevTools > Console ולשלוח צילום מסך',
      'בדוק שמפתח Finnhub קיים ב-Environment Variables',
      'נתוני mock יפעלו אוטומטית אם ה-API לא זמין',
      'בקש לנסות רשת אחרת (Wi-Fi ↔ סלולר)',
    ],
    severity: 'medium',
  },
  {
    id: 'ai-analysis-error',
    category: 'טכני',
    title: 'ניתוח AI לא עובד',
    symptoms: ['כפתור AI לא מגיב', 'שגיאה בניתוח', 'זמן תגובה ארוך מאוד'],
    causes: ['OpenAI API key חסר', 'הגעה ל-rate limit', 'Edge Function כרותה'],
    steps: [
      'בדוק Supabase > Edge Functions > ai-analysis logs',
      'ודא שמפתח OpenAI מוגדר ב-Secrets',
      'ניתוח AI נשמר cache — תוצאות ישנות עדיין יופיעו',
    ],
    severity: 'medium',
  },
  {
    id: 'password-reset-no-email',
    category: 'כניסה',
    title: 'אימייל לאיפוס סיסמה לא הגיע',
    symptoms: ['לחץ "שכחתי סיסמה" אבל אין אימייל', 'בדק ספאם'],
    causes: ['Supabase SMTP לא מוגדר', 'אימייל שגוי הוזן', 'חסימת דומיין'],
    steps: [
      'ודא שה-Supabase Email provider מוגדר נכון ב-Auth Settings',
      'שלח קישור איפוס ידנית בכפתור למטה',
      'בדוק לוגים ב-Supabase > Auth > Logs',
    ],
    adminAction: 'send_reset',
    severity: 'medium',
  },
  {
    id: 'access-code-invalid',
    category: 'כניסה',
    title: 'קוד גישה לא עובד',
    symptoms: ['הלקוח מקליד קוד גישה אבל נדחה', 'שגיאה לא ברורה'],
    causes: ['קוד גישה שגוי / ישן', 'חשבון טרם נוצר', 'אותיות גדולות/קטנות'],
    steps: [
      'בדוק את קוד הגישה הנוכחי בטאב לקוחות',
      'צור קוד גישה חדש בכפתור "הפק קוד גישה" בטאב לקוחות',
      'שלח ללקוח ב-WhatsApp',
    ],
    severity: 'low',
  },
  {
    id: 'cant-see-content',
    category: 'מנוי',
    title: 'לא רואה תכנים / קבוצות נעולות',
    symptoms: ['תכנים עם מנעול', 'הודעה "שדרג מנוי"', 'תכנים שאמורים להיות פתוחים'],
    causes: ['חבילה לא עודכנה', 'מנוי פג תוקף', 'Cache ישן בדפדפן'],
    steps: [
      'בדוק חבילה נוכחית בחיפוש למטה',
      'אם החבילה נכונה — בקש מהלקוח לרענן הדף (Ctrl+Shift+R)',
      'אם החבילה שגויה — עדכן ידנית בכפתור "שנה חבילה"',
    ],
    adminAction: 'change_plan',
    severity: 'medium',
  },
  {
    id: 'whale-activity-empty',
    category: 'טכני',
    title: 'פעילות לווייתנים ריקה',
    symptoms: ['עמוד פעילות לווייתנים לא מציג נתונים', 'טבלה ריקה'],
    causes: ['נתונים לא נוצרו', 'Edge Function generate-whale-activity לא רצה'],
    steps: [
      'בדוק Supabase > Edge Functions > generate-whale-activity',
      'הפעל ידנית מ-Supabase Dashboard',
      'ודא שה-cron job פעיל ב-pg_cron',
    ],
    severity: 'low',
  },
  {
    id: 'app-white-screen',
    category: 'טכני',
    title: 'מסך לבן / אפליקציה לא נטענת',
    symptoms: ['לקוח פותח את האפליקציה ורואה מסך ריק', 'דפדפן תקוע'],
    causes: ['JavaScript error קריטי', 'Cache פגום', 'גרסה ישנה של הדפדפן'],
    steps: [
      'בקש לפתוח בדפדפן אחר (Chrome/Firefox/Safari)',
      'בקש לנקות Cache: Ctrl+Shift+Delete',
      'בקש לשלוח צילום DevTools Console',
      'בדוק Netlify/Vercel שהדפלוי האחרון עבר',
    ],
    severity: 'high',
  },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const PLAN_LABELS: Record<PlanId, string> = { free: 'חינמי', basic: 'בסיסי', pro: 'מקצועי', vip: 'VIP' };
const PLAN_ICONS: Record<PlanId, typeof Zap> = { free: Zap, basic: Zap, pro: Star, vip: Crown };
const PLAN_COLORS: Record<PlanId, string> = { free: 'text-slate-400', basic: 'text-blue-400', pro: 'text-emerald-400', vip: 'text-amber-400' };
const SEVERITY_COLORS = { low: 'border-slate-600/50 text-slate-400', medium: 'border-amber-500/40 text-amber-400', high: 'border-red-500/40 text-red-400' };
const SEVERITY_BG = { low: 'bg-slate-700/30', medium: 'bg-amber-500/10', high: 'bg-red-500/10' };
const SEVERITY_LABEL = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };
const ACTION_TYPE_LABELS: Record<string, string> = {
  reset_sessions: 'איפוס סשנים', unblock: 'ביטול חסימה', extend_30: 'הארכת מנוי 30 יום',
  resend_otp: 'שליחת OTP מחדש', send_reset: 'שליחת קישור איפוס סיסמה',
  send_welcome: 'שליחת אימייל ברוך הבא', change_plan: 'שינוי חבילה', add_note: 'הוספת הערה',
  resend_subscription_confirmed: 'שליחת אישור מנוי',
};

function daysLeft(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────────
   Troubleshoot Guide Panel
───────────────────────────────────────────── */
function TroubleshootGuide({ onSelectAction }: { onSelectAction: (action: string) => void }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('הכל');

  const categories = ['הכל', ...Array.from(new Set(TROUBLESHOOT_DB.map(e => e.category)))];

  const results = TROUBLESHOOT_DB.filter(e => {
    const q = query.toLowerCase();
    const matchQ = !q || e.title.toLowerCase().includes(q) ||
      e.symptoms.some(s => s.toLowerCase().includes(q)) ||
      e.causes.some(c => c.toLowerCase().includes(q));
    const matchCat = catFilter === 'הכל' || e.category === catFilter;
    return matchQ && matchCat;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-bold text-lg">מדריך תקלות</h3>
      </div>
      <p className="text-slate-500 text-sm mb-5">חפש לפי תסמין, שגיאה או נושא</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="לדוגמה: לא מצליח להתחבר, OTP לא הגיע..."
          className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${catFilter === cat ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-500 hover:text-slate-300 border border-transparent'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">לא נמצאו תקלות תואמות</div>
        )}
        {results.map(entry => {
          const isOpen = openId === entry.id;
          return (
            <div key={entry.id} className={`border rounded-xl overflow-hidden transition ${SEVERITY_COLORS[entry.severity]} ${SEVERITY_BG[entry.severity]}`}>
              <button
                onClick={() => setOpenId(isOpen ? null : entry.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
              >
                <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[entry.severity]} flex-shrink-0`}>
                  {SEVERITY_LABEL[entry.severity]}
                </span>
                <span className="text-xs text-slate-500 flex-shrink-0">{entry.category}</span>
                <span className="text-white font-medium text-sm flex-1 text-right">{entry.title}</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-700/30 pt-3">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <Eye className="w-3 h-3" /> תסמינים
                    </p>
                    <ul className="space-y-1">
                      {entry.symptoms.map((s, i) => (
                        <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-slate-600 mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> סיבות נפוצות
                    </p>
                    <ul className="space-y-1">
                      {entry.causes.map((c, i) => (
                        <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-slate-600 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3" /> שלבי פתרון
                    </p>
                    <ol className="space-y-1.5">
                      {entry.steps.map((s, i) => (
                        <li key={i} className="text-slate-200 text-sm flex items-start gap-2">
                          <span className="bg-cyan-500/20 text-cyan-400 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {entry.adminAction && (
                    <button
                      onClick={() => onSelectAction(entry.adminAction!)}
                      className="flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-sm font-medium px-4 py-2.5 rounded-xl transition"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      עבור לפעולה: {ACTION_TYPE_LABELS[entry.adminAction]}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Client Lookup + Actions Panel
───────────────────────────────────────────── */
interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
  loading: boolean;
}

function ActionButton({ icon: Icon, label, color, onClick, loading }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition disabled:opacity-40 ${color}`}
    >
      {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function ClientLookup({ preselectedAction }: { preselectedAction: string | null }) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [query, setQuery] = useState('');
  const [client, setClient] = useState<ClientData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [otps, setOtps] = useState<OtpData[]>([]);
  const [history, setHistory] = useState<SupportActionRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [newPlan, setNewPlan] = useState<PlanId>('basic');
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);

  const loadHistory = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('support_actions')
      .select('id,action_type,action_data,admin_note,created_at')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data ?? []);
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setNotFound(false);
    setClient(null);
    setActionResult(null);

    const { data } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,subscription_plan,subscription_expires_at,subscription_started_at,is_email_verified,is_blocked,access_code,admin_notes,created_at')
      .or(`email.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (!data) {
      setNotFound(true);
      setSearching(false);
      return;
    }

    setClient(data as ClientData);
    setNewPlan(data.subscription_plan as PlanId);

    const [sessRes, otpRes] = await Promise.all([
      supabase.from('user_sessions').select('id,session_token,user_agent,is_active,created_at,last_seen_at').eq('user_id', data.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('verification_codes').select('id,code,purpose,expires_at,used_at,created_at').eq('user_id', data.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setSessions(sessRes.data ?? []);
    setOtps(otpRes.data ?? []);
    await loadHistory(data.id);
    setSearching(false);
  };

  const logAction = useCallback(async (userId: string, email: string, type: string, data: Record<string, unknown>, note = '') => {
    await supabase.from('support_actions').insert({
      target_user_id: userId,
      target_email: email,
      action_type: type,
      action_data: data,
      admin_note: note,
    });
    await loadHistory(userId);
  }, [loadHistory]);

  const runAction = useCallback(async (key: string, extraData: Record<string, unknown> = {}) => {
    if (!client) return;
    setActionLoading(key);
    setActionResult(null);

    try {
      let result: ActionResult = { ok: false, msg: 'פעולה לא מוכרת' };

      if (key === 'reset_sessions') {
        await supabase.from('user_sessions').update({ is_active: false }).eq('user_id', client.id);
        await logAction(client.id, client.email, 'reset_sessions', {}, 'איפוס כל הסשנים הפעילים');
        setSessions(prev => prev.map(s => ({ ...s, is_active: false })));
        result = { ok: true, msg: 'כל הסשנים אופסו. הלקוח יצטרך להתחבר מחדש.' };
      }

      else if (key === 'unblock') {
        await supabase.from('profiles').update({ is_blocked: false }).eq('id', client.id);
        await logAction(client.id, client.email, 'unblock', {}, 'ביטול חסימה');
        setClient(c => c ? { ...c, is_blocked: false } : c);
        result = { ok: true, msg: 'החסימה בוטלה. הלקוח יכול להתחבר.' };
      }

      else if (key === 'block') {
        await supabase.from('profiles').update({ is_blocked: true }).eq('id', client.id);
        await logAction(client.id, client.email, 'block', {}, 'חסימת חשבון');
        setClient(c => c ? { ...c, is_blocked: true } : c);
        result = { ok: true, msg: 'החשבון נחסם.' };
      }

      else if (key === 'extend_30') {
        const current = client.subscription_expires_at ? new Date(client.subscription_expires_at) : new Date();
        if (current < new Date()) current.setTime(Date.now());
        current.setDate(current.getDate() + 30);
        const newExpiry = current.toISOString();
        await supabase.from('profiles').update({ subscription_expires_at: newExpiry }).eq('id', client.id);
        await logAction(client.id, client.email, 'extend_30', { new_expiry: newExpiry }, 'הארכת מנוי 30 יום');
        setClient(c => c ? { ...c, subscription_expires_at: newExpiry } : c);
        result = { ok: true, msg: `המנוי הוארך עד ${fmtDate(newExpiry)}` };
      }

      else if (key === 'resend_otp') {
        if (SUPABASE_URL && ANON_KEY) {
          const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        const code = String(100000 + (arr[0] % 900000));
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          await supabase.from('verification_codes').insert({ user_id: client.id, email: client.email, code, purpose: 'email_verification', expires_at: expiresAt });
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ type: 'otp', to: client.email, data: { code } }),
          });
          await logAction(client.id, client.email, 'resend_otp', { code }, 'שליחת OTP ידנית');
          const { data: newOtps } = await supabase.from('verification_codes').select('id,code,purpose,expires_at,used_at,created_at').eq('user_id', client.id).order('created_at', { ascending: false }).limit(10);
          setOtps(newOtps ?? []);
          result = { ok: true, msg: `OTP נשלח לכתובת ${client.email}` };
        }
      }

      else if (key === 'send_reset') {
        const { error } = await supabase.auth.admin ? { error: null } : { error: null };
        // Trigger Supabase password reset email via standard auth
        await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY! },
          body: JSON.stringify({ email: client.email }),
        });
        await logAction(client.id, client.email, 'send_reset', {}, 'שליחת קישור איפוס סיסמה');
        result = { ok: true, msg: `קישור איפוס סיסמה נשלח ל-${client.email}` };
        void error;
      }

      else if (key === 'send_welcome') {
        if (SUPABASE_URL && ANON_KEY) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ type: 'welcome', to: client.email, data: { name: client.full_name.split(' ')[0] } }),
          });
          await logAction(client.id, client.email, 'send_welcome', {}, 'שליחת אימייל ברוך הבא מחדש');
          result = { ok: true, msg: 'אימייל ברוך הבא נשלח.' };
        }
      }

      else if (key === 'change_plan') {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('profiles').update({
          subscription_plan: newPlan,
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: expiresAt,
        }).eq('id', client.id);
        await logAction(client.id, client.email, 'change_plan', { from: client.subscription_plan, to: newPlan, expires_at: expiresAt }, `שינוי חבילה ל-${PLAN_LABELS[newPlan]}`);
        setClient(c => c ? { ...c, subscription_plan: newPlan, subscription_expires_at: expiresAt } : c);
        setShowPlanPicker(false);
        result = { ok: true, msg: `חבילה שונתה ל-${PLAN_LABELS[newPlan]} עד ${fmtDate(expiresAt)}` };
      }

      else if (key === 'add_note') {
        if (noteText.trim()) {
          const merged = [client.admin_notes, noteText.trim()].filter(Boolean).join('\n---\n');
          await supabase.from('profiles').update({ admin_notes: merged }).eq('id', client.id);
          await logAction(client.id, client.email, 'add_note', { note: noteText.trim() }, noteText.trim());
          setClient(c => c ? { ...c, admin_notes: merged } : c);
          setNoteText('');
          setShowNote(false);
          result = { ok: true, msg: 'הערה נשמרה.' };
        }
      }

      else if (key === 'send_subscription_confirmed') {
        if (SUPABASE_URL && ANON_KEY) {
          const days = daysLeft(client.subscription_expires_at);
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ type: 'subscription_confirmed', to: client.email, data: { name: client.full_name.split(' ')[0], plan: PLAN_LABELS[client.subscription_plan], expiry: client.subscription_expires_at, days_left: days ?? 30 } }),
          });
          await logAction(client.id, client.email, 'resend_subscription_confirmed', {}, 'שליחת אישור מנוי');
          result = { ok: true, msg: 'אימייל אישור מנוי נשלח.' };
        }
      }

      setActionResult(result);
    } catch (e) {
      setActionResult({ ok: false, msg: 'שגיאה בביצוע הפעולה. נסה שוב.' });
    } finally {
      setActionLoading(null);
    }
  }, [client, newPlan, noteText, SUPABASE_URL, ANON_KEY, logAction]);

  // When a troubleshoot guide action is selected, scroll to action area (handled by parent via preselectedAction)
  const planIcons = PLAN_ICONS;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-bold text-lg">חיפוש לקוח ופעולות</h3>
      </div>
      <p className="text-slate-500 text-sm mb-5">חפש לפי אימייל, שם או טלפון</p>

      {/* Search bar */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="אימייל / שם מלא / טלפון"
            className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>
        <button
          onClick={search}
          disabled={searching}
          className="px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50"
        >
          {searching ? <Loader className="w-4 h-4 animate-spin" /> : 'חפש'}
        </button>
      </div>

      {notFound && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-300 text-sm">לא נמצא לקוח תואם</span>
        </div>
      )}

      {/* Action result */}
      {actionResult && (
        <div className={`flex items-center gap-2 border rounded-xl p-3.5 mb-4 text-sm ${actionResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {actionResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {actionResult.msg}
        </div>
      )}

      {client && (
        <div className="space-y-4">
          {/* Client card */}
          <div className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-bold">{client.full_name}</p>
                  <p className="text-slate-400 text-sm">{client.email}</p>
                  {client.phone && <p className="text-slate-500 text-xs">{client.phone}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {client.is_blocked && (
                  <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                    <ShieldOff className="w-3 h-3" /> חסום
                  </span>
                )}
                {!client.is_email_verified && (
                  <span className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> לא מאומת
                  </span>
                )}
                {client.is_email_verified && !client.is_blocked && (
                  <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> פעיל
                  </span>
                )}
              </div>
            </div>

            {/* Subscription info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-[#141929] rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1">חבילה</p>
                {(() => { const Icon = planIcons[client.subscription_plan]; return <span className={`flex items-center gap-1.5 font-bold text-sm ${PLAN_COLORS[client.subscription_plan]}`}><Icon className="w-3.5 h-3.5" />{PLAN_LABELS[client.subscription_plan]}</span>; })()}
              </div>
              <div className="bg-[#141929] rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1">פקיעת מנוי</p>
                {client.subscription_expires_at ? (() => {
                  const d = daysLeft(client.subscription_expires_at)!;
                  const color = d < 0 ? 'text-red-400' : d <= 7 ? 'text-orange-400' : 'text-emerald-400';
                  return <p className={`text-sm font-semibold ${color}`}>{d < 0 ? 'פג תוקף' : `${d} ימים`}</p>;
                })() : <p className="text-slate-500 text-sm">ללא הגבלה</p>}
              </div>
              <div className="bg-[#141929] rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1">סשנים פעילים</p>
                <p className="text-white text-sm font-semibold">{sessions.filter(s => s.is_active).length}</p>
              </div>
            </div>

            {/* Actions */}
            <p className="text-slate-500 text-xs font-semibold mb-3 flex items-center gap-1.5">
              <Wrench className="w-3 h-3" /> פעולות
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <ActionButton icon={RotateCcw} label="איפוס סשנים" color="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" onClick={() => runAction('reset_sessions')} loading={actionLoading === 'reset_sessions'} />
              {client.is_blocked
                ? <ActionButton icon={ShieldCheck} label="בטל חסימה" color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" onClick={() => runAction('unblock')} loading={actionLoading === 'unblock'} />
                : <ActionButton icon={ShieldOff} label="חסום משתמש" color="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => runAction('block')} loading={actionLoading === 'block'} />
              }
              <ActionButton icon={Calendar} label="הארך 30 יום" color="bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" onClick={() => runAction('extend_30')} loading={actionLoading === 'extend_30'} />
              <ActionButton icon={Key} label="שלח OTP מחדש" color="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20" onClick={() => runAction('resend_otp')} loading={actionLoading === 'resend_otp'} />
              <ActionButton icon={Mail} label="קישור איפוס סיסמה" color="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600" onClick={() => runAction('send_reset')} loading={actionLoading === 'send_reset'} />
              <ActionButton icon={Send} label="אישור מנוי" color="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600" onClick={() => runAction('send_subscription_confirmed')} loading={actionLoading === 'send_subscription_confirmed'} />
              <ActionButton icon={Send} label='ברוך הבא' color="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600" onClick={() => runAction('send_welcome')} loading={actionLoading === 'send_welcome'} />
              <button
                onClick={() => setShowPlanPicker(p => !p)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                <Crown className="w-3.5 h-3.5" /> שנה חבילה
              </button>
              <button
                onClick={() => setShowNote(p => !p)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                <Info className="w-3.5 h-3.5" /> הוסף הערה
              </button>
            </div>

            {/* Plan picker */}
            {showPlanPicker && (
              <div className="bg-[#141929] border border-slate-700/50 rounded-xl p-4 mb-3">
                <p className="text-slate-300 text-sm font-medium mb-3">בחר חבילה חדשה:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(['free', 'basic', 'pro', 'vip'] as PlanId[]).map(p => {
                    const PlanIcon = planIcons[p];
                    return (
                      <button key={p} onClick={() => setNewPlan(p)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${newPlan === p ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                        <PlanIcon className="w-3.5 h-3.5" />{PLAN_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => runAction('change_plan')} disabled={actionLoading === 'change_plan'}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition disabled:opacity-40">
                  {actionLoading === 'change_plan' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  אשר שינוי ל-{PLAN_LABELS[newPlan]}
                </button>
              </div>
            )}

            {/* Note input */}
            {showNote && (
              <div className="bg-[#141929] border border-slate-700/50 rounded-xl p-4 mb-3">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                  rows={3} placeholder="הערה פנימית על הלקוח..."
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none mb-2" />
                <button onClick={() => runAction('add_note')} disabled={!noteText.trim() || actionLoading === 'add_note'}
                  className="flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 font-medium px-4 py-2 rounded-xl text-sm transition disabled:opacity-40">
                  <CheckCircle className="w-3.5 h-3.5" /> שמור הערה
                </button>
              </div>
            )}
          </div>

          {/* Sessions */}
          <div className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> סשנים ({sessions.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sessions.length === 0 && <p className="text-slate-600 text-sm">אין סשנים</p>}
              {sessions.map(s => (
                <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl text-xs ${s.is_active ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-slate-800/30 border border-slate-700/20'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 truncate">{s.user_agent.slice(0, 60)}</p>
                    <p className="text-slate-600">נוצר: {fmtDate(s.created_at)} · ראה לאחרונה: {s.last_seen_at ? fmtDate(s.last_seen_at) : '—'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full flex-shrink-0 ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {s.is_active ? 'פעיל' : 'סגור'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* OTP codes */}
          <div className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" /> קודות OTP אחרונים ({otps.length})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {otps.length === 0 && <p className="text-slate-600 text-sm">אין קודות</p>}
              {otps.map(o => {
                const expired = new Date(o.expires_at) < new Date();
                return (
                  <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/20 text-xs">
                    <span className="font-mono text-white text-sm font-bold tracking-widest">{o.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500">פג תוקף: {fmtDate(o.expires_at)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full ${o.used_at ? 'bg-slate-700 text-slate-500' : expired ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {o.used_at ? 'שומש' : expired ? 'פג' : 'תקף'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action history */}
          {history.length > 0 && (
            <div className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-5">
              <p className="text-slate-400 text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> היסטוריית פעולות תמיכה
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/20 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-cyan-400 font-medium">{ACTION_TYPE_LABELS[h.action_type] ?? h.action_type}</span>
                      {h.admin_note && <p className="text-slate-500 mt-0.5">{h.admin_note}</p>}
                    </div>
                    <span className="text-slate-600 flex-shrink-0">{fmtDate(h.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Export
───────────────────────────────────────────── */
export default function SupportCenter() {
  const [activeTab, setActiveTab] = useState<'guide' | 'lookup'>('guide');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleGuideAction = (action: string) => {
    setPendingAction(action);
    setActiveTab('lookup');
  };

  return (
    <div dir="rtl">
      <div className="flex gap-2 mb-6">
        {[
          { id: 'guide' as const, label: 'מדריך תקלות', icon: BookOpen },
          { id: 'lookup' as const, label: 'חיפוש לקוח ופעולות', icon: Wrench },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'guide' && <TroubleshootGuide onSelectAction={handleGuideAction} />}
      {activeTab === 'lookup' && <ClientLookup preselectedAction={pendingAction} />}
    </div>
  );
}
