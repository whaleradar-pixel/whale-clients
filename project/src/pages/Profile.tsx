import { useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, LogOut, ShieldCheck, Clock, Monitor, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { UserSession } from '../types';
import TradingPlatformLinks from '../components/TradingPlatformLinks';

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: 'חינמי', color: 'text-slate-300', bg: 'bg-slate-500/20' },
  basic: { label: 'בסיסי', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  pro: { label: 'מקצועי', color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  vip: { label: 'VIP', color: 'text-amber-300', bg: 'bg-amber-500/20' },
};

export default function Profile() {
  const { user, profile, updateProfile, signOut, sendVerificationCode } = useAuth();
  const { currentPlan } = useSubscription();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [notifications, setNotifications] = useState(profile?.notification_preferences || { price_alerts: true, market_news: true, signal_alerts: true });
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const planInfo = PLAN_LABELS[currentPlan] ?? PLAN_LABELS.free;

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (profile?.notification_preferences) setNotifications(profile.notification_preferences as typeof notifications);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setSessions(data as UserSession[]); });
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName, notification_preferences: notifications } as any);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    await sendVerificationCode(user.email);
    setVerifyMsg('קוד אימות נשלח לאימייל שלך');
    setTimeout(() => setVerifyMsg(''), 4000);
  };

  const handleRevokeSession = async (sessionId: string) => {
    await supabase.from('user_sessions').update({ is_active: false }).eq('id', sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, is_active: false } : s));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f1a]" dir="rtl">
      <div className="px-6 py-8 max-w-2xl">
        <h1 className="text-white font-bold text-2xl mb-1">פרופיל והגדרות</h1>
        <p className="text-slate-500 text-sm mb-8">נהל את החשבון, הסיסמה והגדרות האישיות שלך</p>

        {/* Profile Info */}
        <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{fullName || 'משתמש'}</h3>
              <p className="text-slate-500 text-sm">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${planInfo.bg} ${planInfo.color}`}>
                  <Shield className="w-3 h-3" />
                  {planInfo.label}
                </span>
                {profile?.is_email_verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    מאומת
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    לא מאומת
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">שם מלא</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white focus:outline-none focus:border-cyan-500/50 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={user?.email || ''} readOnly className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-3 pr-10 pl-4 text-slate-400 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {!profile?.is_email_verified && (
            <div className="mt-4">
              <button onClick={handleResendVerification} className="text-sm text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                שלח קוד אימות לאימייל
              </button>
              {verifyMsg && <p className="text-emerald-400 text-xs mt-1">{verifyMsg}</p>}
            </div>
          )}
        </div>

        {/* Trading Platform Links */}
        <TradingPlatformLinks />

        {/* Notifications */}
        <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold">הגדרות התראות</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: 'price_alerts', label: 'התראות מחיר', desc: 'כשמניה מגיעה ליעד מחיר' },
              { key: 'market_news', label: 'חדשות שוק', desc: 'עדכונים ממקורות פיננסיים' },
              { key: 'signal_alerts', label: 'סיגנלי מסחר', desc: 'הזדמנויות מסחר לפי AI' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-slate-200 text-sm font-medium">{label}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${notifications[key as keyof typeof notifications] ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${notifications[key as keyof typeof notifications] ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold">מכשירים פעילים</h3>
          </div>
          <p className="text-slate-500 text-xs mb-4">כל כניסה חדשה תנתק אוטומטית את המכשיר הקודם</p>
          {sessions.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-3">אין מכשירים פעילים</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between bg-slate-800/30 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                    <div>
                      <p className="text-slate-300 text-xs font-medium truncate max-w-xs">{session.user_agent?.slice(0, 50) || 'מכשיר לא ידוע'}...</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-600 text-xs">{formatDate(session.last_seen_at)}</span>
                      </div>
                    </div>
                  </div>
                  {session.is_active && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                      נתק
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save & Logout */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20"
          >
            {saved ? <><CheckCircle className="w-4 h-4" />נשמר!</> : saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />שומר...</> : <><Save className="w-4 h-4" />שמור שינויים</>}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800/50 hover:bg-red-500/15 border border-slate-700/50 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}
