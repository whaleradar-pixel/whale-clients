import { useState, useEffect } from 'react';
import {
  Users, UserPlus, TrendingUp, Crown, Star, Zap,
  Search, Filter, CheckCircle, XCircle,
  Phone, Mail, Shield, ChevronDown, RefreshCw, Download,
  Clock, AlertCircle, Edit2, Trash2, Eye, X, Save, LogOut,
  MessageCircle, Calendar, AlertTriangle, Key, Copy, UserCheck, HelpCircle, Wrench
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import FaqAdmin from '../components/FaqAdmin';
import SupportCenter from '../components/SupportCenter';
import { writeImpersonation } from '../lib/impersonation';

type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected';
type LeadSource = 'website' | 'whatsapp' | 'referral' | 'other';
type PlanId = 'free' | 'basic' | 'pro' | 'vip';

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  national_id: string;
  requested_plan: PlanId;
  status: LeadStatus;
  source: LeadSource;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ClientProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  national_id: string;
  subscription_plan: PlanId;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  is_email_verified: boolean;
  is_blocked: boolean;
  admin_notes: string;
  access_code: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  new:       { label: 'חדש',    color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/20',    icon: Clock },
  contacted: { label: 'בטיפול', color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/20',  icon: Phone },
  converted: { label: 'הומר',   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20', icon: CheckCircle },
  rejected:  { label: 'נדחה',   color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/20',      icon: XCircle },
};

const PLAN_CONFIG: Record<PlanId, { label: string; color: string; icon: typeof Zap; days: number }> = {
  free:  { label: 'חינמי',   color: 'text-slate-400',   icon: Zap,   days: 0 },
  basic: { label: 'בסיסי',   color: 'text-blue-400',    icon: Zap,   days: 30 },
  pro:   { label: 'מקצועי',  color: 'text-emerald-400', icon: Star,  days: 30 },
  vip:   { label: 'VIP',     color: 'text-amber-400',   icon: Crown, days: 30 },
};

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DaysLeftBadge({ expires }: { expires: string | null }) {
  if (!expires) return <span className="text-slate-600 text-xs">ללא הגבלה</span>;
  const days = daysLeft(expires);
  if (days === null) return null;
  if (days < 0) return <span className="text-red-400 text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />פג תוקף</span>;
  if (days <= 7) return <span className="text-orange-400 text-xs font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{days} ימים</span>;
  return <span className="text-emerald-400 text-xs">{days} ימים</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-[#141929] border border-slate-700/40 rounded-xl p-5">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function LeadModal({ lead, onClose, onSave }: { lead: Partial<Lead>; onClose: () => void; onSave: (data: Partial<Lead>) => void }) {
  const [form, setForm] = useState<Partial<Lead>>(lead);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h3 className="text-white font-bold text-lg">{lead?.id ? 'עריכת ליד' : 'ליד חדש'}</h3>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-xl transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">שם מלא *</label>
              <input value={form.full_name || ''} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" placeholder="ישראל ישראלי" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">טלפון *</label>
              <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" placeholder="052-0000000" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">אימייל</label>
              <input value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" placeholder="email@example.com" dir="ltr" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">ת.ז.</label>
              <input value={form.national_id || ''} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" placeholder="000000000" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'requested_plan' as const, label: 'חבילה', options: [['basic','בסיסי'],['pro','מקצועי'],['vip','VIP']] },
              { key: 'status' as const, label: 'סטטוס', options: [['new','חדש'],['contacted','בטיפול'],['converted','הומר'],['rejected','נדחה']] },
              { key: 'source' as const, label: 'מקור', options: [['website','אתר'],['whatsapp','WhatsApp'],['referral','הפנייה'],['other','אחר']] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">{label}</label>
                <select value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition">
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">הערות</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
              className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none" placeholder="הערות פנימיות..." />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-700/50">
          <button onClick={handleSave} disabled={saving || !form.full_name || !form.phone}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            שמור
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-sm">ביטול</button>
        </div>
      </div>
    </div>
  );
}

function ClientModal({ client, onClose, onSave }: { client: ClientProfile; onClose: () => void; onSave: (id: string, data: Partial<ClientProfile>) => void }) {
  const [form, setForm] = useState(client);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'info' | 'message' | 'access'>('info');
  const [msgText, setMsgText] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showImpersonateConfirm, setShowImpersonateConfirm] = useState(false);

  const days = daysLeft(client.subscription_expires_at);
  const expired = days !== null && days < 0;

  const handleSave = async () => {
    setSaving(true);
    await onSave(client.id, {
      subscription_plan: form.subscription_plan,
      subscription_expires_at: form.subscription_expires_at,
      admin_notes: form.admin_notes,
      is_blocked: form.is_blocked,
      phone: form.phone,
      national_id: form.national_id,
    });
    setSaving(false);
    onClose();
  };

  const handleRenew = (months: number) => {
    const base = expired ? new Date() : new Date(client.subscription_expires_at || Date.now());
    base.setMonth(base.getMonth() + months);
    setForm(p => ({ ...p, subscription_expires_at: base.toISOString() }));
  };

  const copyCode = () => {
    if (client.access_code) {
      navigator.clipboard.writeText(client.access_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const waLink = `https://wa.me/972${(form.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=${encodeURIComponent(msgText)}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold">
              {client.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-white font-bold">{client.full_name || 'משתמש'}</h3>
              <p className="text-slate-500 text-xs">{client.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-xl transition"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/50 flex-shrink-0">
          {[
            { id: 'info' as const, label: 'פרטים וניהול' },
            { id: 'access' as const, label: 'גישה והתחזות' },
            { id: 'message' as const, label: 'שלח הודעה' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {tab === 'info' && (
            <>
              {/* Status row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">אימות</p>
                  <span className={`text-xs font-medium flex items-center justify-center gap-1 ${client.is_email_verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {client.is_email_verified ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {client.is_email_verified ? 'מאומת' : 'ממתין'}
                  </span>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">ימים שנותרו</p>
                  <DaysLeftBadge expires={form.subscription_expires_at} />
                </div>
                <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">נרשם</p>
                  <span className="text-slate-400 text-xs">{new Date(client.created_at).toLocaleDateString('he-IL')}</span>
                </div>
              </div>

              {/* Renewal */}
              {(expired || (days !== null && days <= 14)) && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <p className="text-orange-300 text-sm font-semibold">{expired ? 'מנוי פג — חדש עכשיו' : `מנוי מסתיים בעוד ${days} ימים`}</p>
                  </div>
                  <div className="flex gap-2">
                    {[1, 3, 12].map(m => (
                      <button key={m} onClick={() => handleRenew(m)}
                        className="flex-1 py-1.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/20 text-orange-300 rounded-lg transition">
                        +{m} {m === 12 ? 'שנה' : 'חודש'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription plan */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">רמת מנוי</label>
                <select value={form.subscription_plan} onChange={e => setForm(p => ({ ...p, subscription_plan: e.target.value as PlanId }))}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition">
                  {(Object.keys(PLAN_CONFIG) as PlanId[]).filter(p => p !== 'free').map(p => (
                    <option key={p} value={p}>{PLAN_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">תאריך תפוגה</label>
                <input type="date" value={form.subscription_expires_at ? form.subscription_expires_at.split('T')[0] : ''}
                  onChange={e => setForm(p => ({ ...p, subscription_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">טלפון</label>
                  <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" dir="ltr" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">ת.ז.</label>
                  <input value={form.national_id || ''} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))}
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">הערות אדמין</label>
                <textarea value={form.admin_notes || ''} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))} rows={3}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none" placeholder="הערות פנימיות..." />
              </div>

              {/* Block toggle */}
              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div>
                  <p className="text-red-300 text-sm font-medium">חסום חשבון</p>
                  <p className="text-red-400/60 text-xs">מונע כניסה מהמשתמש</p>
                </div>
                <button onClick={() => setForm(p => ({ ...p, is_blocked: !p.is_blocked }))}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form.is_blocked ? 'bg-red-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${form.is_blocked ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </>
          )}

          {tab === 'access' && (
            <div className="space-y-5">
              {/* Access code box */}
              <div className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <p className="text-white font-semibold text-sm">קוד גישה אישי</p>
                </div>
                <p className="text-slate-500 text-xs mb-4">
                  זהו הקוד האישי של הלקוח לכניסה לחשבון. שלח אותו ללקוח בפרטי עם הוראות חיבור.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-white font-mono text-xl font-bold tracking-widest">
                      {client.access_code || '——'}
                    </span>
                    <span className="text-slate-600 text-xs">קוד גישה</span>
                  </div>
                  <button onClick={copyCode} disabled={!client.access_code}
                    className={`p-3 rounded-xl border transition flex items-center gap-1.5 text-sm font-medium ${codeCopied ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    {codeCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {codeCopied ? 'הועתק' : 'העתק'}
                  </button>
                </div>

                {/* WhatsApp with code */}
                {client.access_code && form.phone && (
                  <a href={`https://wa.me/972${(form.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${client.full_name?.split(' ')[0] || ''},\n\nקוד הגישה שלך ל-Whale Radar:\n*${client.access_code}*\n\nהתחבר עם האימייל שלך: ${client.email}\n\nלכל שאלה — נשמח לעזור!\nצוות Whale Radar`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm transition w-full">
                    <MessageCircle className="w-4 h-4" />
                    שלח קוד ללקוח ב-WhatsApp
                  </a>
                )}
              </div>

              {/* Impersonation */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <p className="text-amber-300 font-semibold text-sm">כניסה בשם הלקוח</p>
                </div>
                <p className="text-slate-500 text-xs mb-4">
                  ניתן לצפות בחשבון הלקוח כדי לסייע לו. הפעולה מתועדת ביומן הניהולי. יש לקבל אישור מהלקוח לפני שימוש בפיצ'ר זה.
                </p>

                {!showImpersonateConfirm ? (
                  <button onClick={() => setShowImpersonateConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 rounded-xl text-sm transition font-medium">
                    <Eye className="w-4 h-4" />
                    כנס לחשבון הלקוח
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      <p className="text-amber-300 text-xs font-medium mb-1">אישור נדרש</p>
                      <p className="text-amber-400/70 text-xs">האם קיבלת אישור מ-{client.full_name?.split(' ')[0] || 'הלקוח'} לכניסה לחשבון?</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await supabase.from('admin_impersonation_log').insert({
                            admin_session: sessionStorage.getItem('wr_admin_auth') || 'admin',
                            target_user_id: client.id,
                            action: 'view',
                            note: `כניסה בשם ${client.full_name} (${client.email})`,
                          });
                          // Store signed impersonation token and open app in new tab
                          const impersonationData = {
                            userId: client.id,
                            email: client.email,
                            fullName: client.full_name,
                            plan: client.subscription_plan,
                            accessCode: client.access_code,
                            timestamp: Date.now(),
                          };
                          writeImpersonation(impersonationData).then(() => {
                            const appUrl = window.location.origin + window.location.pathname + '#app-impersonate';
                            window.open(appUrl, '_blank');
                          });
                          setShowImpersonateConfirm(false);
                        }}
                        className="flex-1 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-medium transition">
                        כן, קיבלתי אישור
                      </button>
                      <button onClick={() => setShowImpersonateConfirm(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs transition">
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-slate-500 text-xs font-medium mb-1">פרטי כניסה ידנית:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-xs">אימייל:</span>
                      <span className="text-slate-400 text-xs font-mono">{client.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-xs">קוד גישה:</span>
                      <span className="text-cyan-400 text-xs font-mono font-bold">{client.access_code || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">תוכן ההודעה</label>
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)} rows={6}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none"
                  placeholder={`שלום ${client.full_name?.split(' ')[0] || ''},\n\nאנחנו מ-Whale Radar...`} />
              </div>

              {/* Quick templates */}
              <div>
                <p className="text-slate-500 text-xs mb-2">תבניות מהירות:</p>
                <div className="space-y-2">
                  {[
                    { label: 'חידוש מנוי', text: `שלום ${client.full_name?.split(' ')[0] || ''},\n\nהמנוי שלך ב-Whale Radar עומד לפוג. כדי להמשיך ליהנות מהשירות, ניתן לחדש ישירות באפליקציה.\n\nלכל שאלה — נשמח לעזור!\nצוות Whale Radar` },
                    { label: 'ברוך הבא + קוד גישה', text: `שלום ${client.full_name?.split(' ')[0] || ''},\n\nברוך/ה הבא/ה ל-Whale Radar! חשבונך פעיל ומוכן לשימוש.\n\nפרטי כניסה:\nאימייל: ${client.email}\nקוד גישה: ${client.access_code || '—'}\n\nלכל שאלה אנחנו כאן.\nצוות Whale Radar` },
                    { label: 'תמיכה טכנית', text: `שלום ${client.full_name?.split(' ')[0] || ''},\n\nקיבלנו את פנייתך. נחזור אליך בהקדם האפשרי.\n\nבברכה,\nצוות Whale Radar` },
                  ].map(({ label, text }) => (
                    <button key={label} onClick={() => setMsgText(text)}
                      className="w-full text-right px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/40 rounded-xl text-slate-300 text-xs transition">
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <a href={`mailto:${client.email}?subject=Whale Radar - עדכון&body=${encodeURIComponent(msgText)}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 rounded-xl text-sm transition">
                  <Mail className="w-4 h-4" />
                  שלח מייל
                </a>
                {form.phone && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm transition">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {tab === 'info' && (
          <div className="flex gap-3 p-5 border-t border-slate-700/50 flex-shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              שמור שינויים
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-sm">ביטול</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<'clients' | 'leads' | 'faq' | 'support'>('clients');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<PlanId | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [editLead, setEditLead] = useState<Lead | null | 'new'>(null);
  const [editClient, setEditClient] = useState<ClientProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    const [leadsRes, clientsRes] = await Promise.all([
      supabase.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (clientsRes.data) setClients(clientsRes.data as ClientProfile[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveLead = async (data: Partial<Lead>) => {
    if (data.id) {
      await supabase.from('leads').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id);
    } else {
      await supabase.from('leads').insert({ ...data });
    }
    setEditLead(null);
    fetchData();
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('האם למחוק ליד זה? ניתן לשחזר מהמסד.')) return;
    await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleSaveClient = async (id: string, data: Partial<ClientProfile>) => {
    await supabase.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const filteredLeads = leads.filter(l => {
    const s = search.toLowerCase();
    return (!s || l.full_name?.toLowerCase().includes(s) || l.phone?.includes(s) || l.email?.toLowerCase().includes(s))
      && (statusFilter === 'all' || l.status === statusFilter);
  });

  const filteredClients = clients.filter(c => {
    const s = search.toLowerCase();
    return (!s || c.full_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.phone?.includes(s))
      && (planFilter === 'all' || c.subscription_plan === planFilter);
  });

  const newLeads = leads.filter(l => l.status === 'new').length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;
  const activeClients = clients.filter(c => !c.is_blocked && c.subscription_plan !== 'free').length;
  const expiringClients = clients.filter(c => { const d = daysLeft(c.subscription_expires_at); return d !== null && d >= 0 && d <= 7; }).length;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">טוען דשבורד ניהול...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a]" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#141929]/95 backdrop-blur border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold block leading-none">Whale Radar</span>
              <span className="text-slate-500 text-xs">דשבורד ניהול</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={refreshing} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="hidden sm:flex items-center gap-1.5 bg-red-500/15 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg font-medium">
              <Shield className="w-3.5 h-3.5" />
              ניהול פנימי
            </span>
            <button onClick={() => {
              sessionStorage.removeItem('wr_admin_auth');
              window.location.hash = '';
              window.location.reload();
            }} className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">יציאה</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="לידים חדשים" value={newLeads} sub={`${leads.length} סה"כ בקשות`} color="text-blue-400" />
          <StatCard label="לקוחות משלמים" value={activeClients} sub={`${clients.length} רשומים`} color="text-cyan-400" />
          <StatCard label="מתחדשים השבוע" value={expiringClients} sub="מנוי פג בעוד 7 ימים" color={expiringClients > 0 ? 'text-orange-400' : 'text-slate-400'} />
          <StatCard label="אחוז המרה" value={`${leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0}%`} sub={`${convertedLeads} הומרו`} color="text-emerald-400" />
        </div>

        {/* Expiring alert */}
        {expiringClients > 0 && (
          <div className="mb-5 flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <p className="text-orange-300 text-sm">
              <strong>{expiringClients} לקוחות</strong> עם מנוי שפג בעוד 7 ימים — שקול לשלוח תזכורת חידוש
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { id: 'clients' as const, label: 'לקוחות', count: clients.length, icon: Users },
            { id: 'leads' as const, label: 'בקשות הצטרפות', count: newLeads, badge: newLeads > 0, icon: UserPlus },
            { id: 'support' as const, label: 'תמיכה', count: undefined, badge: false, icon: Wrench },
            { id: 'faq' as const, label: 'שאלות נפוצות', count: undefined, badge: false, icon: HelpCircle },
          ].map(({ id, label, count, badge, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); if (id === 'clients' || id === 'leads') fetchData(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${tab === id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>{count}</span>}
              {badge && id !== tab && <span className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0b0f1a]" />}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'clients' ? 'חפש לקוח...' : 'חפש ליד...'}
              className="w-full bg-[#141929] border border-slate-700/50 rounded-xl py-2.5 pr-9 pl-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition" />
          </div>

          {tab === 'leads' && (
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
                className="bg-[#141929] border border-slate-700/50 rounded-xl py-2.5 pr-9 pl-8 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition appearance-none cursor-pointer">
                <option value="all">כל הסטטוסים</option>
                {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}

          {tab === 'clients' && (
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value as PlanId | 'all')}
                className="bg-[#141929] border border-slate-700/50 rounded-xl py-2.5 pr-9 pl-8 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition appearance-none cursor-pointer">
                <option value="all">כל המנויים</option>
                {(Object.keys(PLAN_CONFIG) as PlanId[]).map(p => <option key={p} value={p}>{PLAN_CONFIG[p].label}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}

          {tab === 'leads' && (
            <button onClick={() => setEditLead('new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium rounded-xl transition shadow-md shadow-cyan-500/20">
              <UserPlus className="w-4 h-4" />
              ליד חדש
            </button>
          )}

          <button onClick={() => {
            const data = tab === 'leads' ? filteredLeads : filteredClients;
            if (!data.length) return;
            const csv = [Object.keys(data[0]).join(','), ...data.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))].join('\n');
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })), download: `whale-${tab}-${new Date().toISOString().split('T')[0]}.csv` });
            a.click();
          }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 text-sm font-medium rounded-xl transition">
            <Download className="w-4 h-4" />
            ייצוא
          </button>
        </div>

        {/* Leads Table */}
        {tab === 'leads' && (
          <div className="bg-[#141929] border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['שם', 'טלפון', 'חבילה', 'סטטוס', 'מקור', 'תאריך', ''].map((h, i) => (
                      <th key={i} className={`text-right text-slate-500 font-medium px-5 py-3.5 ${i > 1 && i < 5 ? 'hidden md:table-cell' : ''} ${i === 1 ? 'hidden sm:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-600"><UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>אין לידים</p></td></tr>
                  ) : filteredLeads.map(lead => {
                    const sc = STATUS_CONFIG[lead.status];
                    const pc = PLAN_CONFIG[lead.requested_plan];
                    const PIcon = pc.icon;
                    return (
                      <tr key={lead.id} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{lead.full_name}</p>
                              <p className="text-slate-500 text-xs">{lead.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <a href={`https://wa.me/972${(lead.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"
                            className="text-slate-300 hover:text-emerald-400 transition font-mono text-xs flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {lead.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${pc.color}`}><PIcon className="w-3.5 h-3.5" />{pc.label}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <select value={lead.status} onChange={e => handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                            className={`text-xs border rounded-lg px-2 py-1 cursor-pointer focus:outline-none transition ${sc.bg} ${sc.color} bg-transparent`}>
                            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
                              <option key={s} value={s} className="bg-[#141929] text-slate-200">{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-slate-500 text-xs">{lead.source === 'website' ? 'אתר' : lead.source === 'whatsapp' ? 'WhatsApp' : lead.source === 'referral' ? 'הפנייה' : 'אחר'}</span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-slate-600 text-xs">{formatDate(lead.created_at)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setEditLead(lead)} className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteLead(lead.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clients Table */}
        {tab === 'clients' && (
          <div className="bg-[#141929] border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['לקוח', 'מנוי', 'ימים שנותרו', 'קוד גישה', 'אימות', 'סטטוס', ''].map((h, i) => (
                      <th key={i} className={`text-right text-slate-500 font-medium px-5 py-3.5 ${i === 3 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-600"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>אין לקוחות</p></td></tr>
                  ) : filteredClients.map(client => {
                    const pc = PLAN_CONFIG[client.subscription_plan || 'free'];
                    const PIcon = pc.icon;
                    const days = daysLeft(client.subscription_expires_at);
                    const isExpired = days !== null && days < 0;
                    return (
                      <tr key={client.id} className={`border-b border-slate-700/20 hover:bg-slate-800/20 transition group ${isExpired ? 'bg-red-500/3' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{client.full_name || 'משתמש'}</p>
                              <p className="text-slate-500 text-xs">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${pc.color}`}><PIcon className="w-3.5 h-3.5" />{pc.label}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <DaysLeftBadge expires={client.subscription_expires_at} />
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-cyan-400 font-mono text-xs font-bold tracking-wider bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                            {client.access_code || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {client.is_email_verified
                            ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3.5 h-3.5" />מאומת</span>
                            : <span className="flex items-center gap-1 text-xs text-amber-400"><AlertCircle className="w-3.5 h-3.5" />ממתין</span>
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          {client.is_blocked
                            ? <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><XCircle className="w-3 h-3" />חסום</span>
                            : isExpired
                              ? <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20"><AlertTriangle className="w-3 h-3" />פג</span>
                              : <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><CheckCircle className="w-3 h-3" />פעיל</span>
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => setEditClient(client)}
                            className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition opacity-0 group-hover:opacity-100">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-slate-700 text-xs mt-6">Whale Radar Admin · {new Date().getFullYear()} · whaleradar@whaleradar.dev</p>
      </div>

      {tab === 'support' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <SupportCenter />
        </div>
      )}

      {tab === 'faq' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <FaqAdmin />
        </div>
      )}

      {editLead !== null && (
        <LeadModal lead={editLead === 'new' ? { requested_plan: 'basic', status: 'new', source: 'website' } : editLead} onClose={() => setEditLead(null)} onSave={handleSaveLead} />
      )}
      {editClient && (
        <ClientModal client={editClient} onClose={() => setEditClient(null)} onSave={handleSaveClient} />
      )}
    </div>
  );
}
