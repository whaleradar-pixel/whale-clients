import { useState, FormEvent } from 'react';
import {
  TrendingUp, Shield, Zap, Crown, Star,
  Check, ChevronLeft, BarChart2, Brain, Bell,
  Lock, Users, ArrowLeft, Menu, X, Mail,
  CheckCircle, AlertCircle, Clock, MessageCircle,
  FileText, Eye, ExternalLink, Award, Target, Globe2, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LandingProps {
  onEnterApp: () => void;
}

const PLANS = [
  {
    id: 'basic', name: 'בסיסי', price: 49, icon: Zap, color: 'blue',
    features: ['3 קבוצות מניות', 'מחירים בזמן אמת', 'ניתוח AI בסיסי', 'התראות מחיר', 'תמיכה בשעות פעילות'],
    cta: 'בחר בסיסי',
  },
  {
    id: 'pro', name: 'מקצועי', price: 99, icon: Star, color: 'emerald', badge: 'הכי פופולרי',
    features: ['6 קבוצות מניות', 'ניתוח AI מתקדם', 'סיגנלי מסחר', 'גרפי TradingView', 'רשימת מעקב אישית', 'תמיכה מועדפת'],
    cta: 'בחר מקצועי',
  },
  {
    id: 'vip', name: 'VIP', price: 199, icon: Crown, color: 'amber',
    features: ['כל קבוצות המניות', 'ניתוח AI פרמיום', 'סיגנלים בזמן אמת', 'ייעוץ אישי', 'קבוצת VIP פרטית', 'תמיכה 24/7'],
    cta: 'הצטרפו ל-VIP',
  },
];

const FEATURES = [
  { icon: BarChart2, title: 'מחירים בזמן אמת', desc: 'עקוב אחר מניות מובילות מהשוק האמריקאי עם עדכונים שניות ספורות' },
  { icon: Brain, title: 'ניתוח AI חכם', desc: 'אלגוריתמים מתקדמים מנתחים מגמות ומספקים סיגנלים מדויקים' },
  { icon: Bell, title: 'התראות חכמות', desc: 'קבל התראות על הזדמנויות מסחר בזמן הנכון ישירות לנייד' },
  { icon: Shield, title: 'אבטחה מקסימלית', desc: 'כניסה ממכשיר בודד, אימות OTP, והצפנה מקצה לקצה' },
  { icon: Lock, title: 'גישה מוגבלת לפי מנוי', desc: 'כל קבוצת מניות נעולה לפי רמת המנוי — הגנה על ערך המידע' },
  { icon: Users, title: 'קהילת סוחרים', desc: 'חברי VIP מקבלים גישה לקבוצה פרטית עם ניתוחים בלעדיים' },
];

function ContactForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', requested_plan: 'pro' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.full_name.trim().replace(/[<>'"]/g, '');
    const phone = form.phone.trim().replace(/[^0-9+\-() ]/g, '');
    const email = form.email.trim().toLowerCase();
    if (!name || !phone) { setError('נא למלא שם וטלפון'); return; }
    if (name.length < 2 || name.length > 100) { setError('שם חייב להיות בין 2 ל-100 תווים'); return; }
    if (phone.length < 7 || phone.length > 20) { setError('מספר טלפון לא תקין'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('כתובת אימייל לא תקינה'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.from('leads').insert({
      full_name: name,
      phone,
      email: email || null,
      requested_plan: form.requested_plan,
      source: 'website',
      status: 'new',
    });
    setLoading(false);
    if (err) { setError('שגיאה בשליחה, נסה שוב'); return; }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-300 text-xs font-medium mb-1.5">שם מלא *</label>
          <input
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition placeholder-slate-600"
            placeholder="ישראל ישראלי"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-xs font-medium mb-1.5">טלפון *</label>
          <input
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition placeholder-slate-600"
            placeholder="052-4899914"
            dir="ltr"
          />
        </div>
      </div>
      <div>
        <label className="block text-slate-300 text-xs font-medium mb-1.5">אימייל</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition placeholder-slate-600"
          placeholder="you@example.com"
          dir="ltr"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-xs font-medium mb-1.5">חבילה מבוקשת</label>
        <select
          value={form.requested_plan}
          onChange={e => setForm(p => ({ ...p, requested_plan: e.target.value }))}
          className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition"
        >
          <option value="basic">בסיסי — ₪49/חודש</option>
          <option value="pro">מקצועי — ₪99/חודש</option>
          <option value="vip">VIP — ₪199/חודש</option>
        </select>
      </div>

      {/* Disclaimer consent */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
        <p className="text-slate-500 text-xs leading-relaxed">
          בשליחת הטופס אני מאשר/ת שקראתי את{' '}
          <button type="button" onClick={() => document.getElementById('legal')?.scrollIntoView({ behavior: 'smooth' })} className="text-cyan-400 hover:underline">תנאי השימוש</button>
          {' '}ומדיניות הפרטיות, ומבין/ה שהמידע בפלטפורמה אינו מהווה ייעוץ השקעות.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><span>שלח בקשת הצטרפות</span><ChevronLeft className="w-4 h-4" /></>
        }
      </button>
    </form>
  );
}

export default function Landing({ onEnterApp }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'disclaimer'>('terms');

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white" dir="rtl">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0b0f1a]/90 backdrop-blur border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-base block leading-none tracking-tight">Whale Radar</span>
              <span className="text-slate-500 text-xs">פלטפורמת מסחר</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#about" className="hover:text-white transition">מי אנחנו</a>
            <a href="#features" className="hover:text-white transition">יתרונות</a>
            <a href="#pricing" className="hover:text-white transition">מחירים</a>
            <a href="#contact" className="hover:text-white transition">הצטרפות</a>
            <a href="#support" className="hover:text-white transition">תמיכה</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onEnterApp} className="text-slate-300 hover:text-white text-sm transition px-3 py-2 hover:bg-slate-800/50 rounded-lg">
              כניסה
            </button>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-cyan-500/20"
            >
              התחל עכשיו
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg transition">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4 space-y-1 border-t border-slate-800/60 pt-3">
            {['#about:מי אנחנו', '#features:יתרונות', '#pricing:מחירים', '#contact:הצטרפות', '#support:תמיכה'].map(item => {
              const [href, label] = item.split(':');
              return (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition text-sm">
                  {label}
                </a>
              );
            })}
            <div className="flex gap-2 pt-2">
              <button onClick={onEnterApp} className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-sm hover:bg-slate-800 transition">כניסה</button>
              <button onClick={() => { setMobileMenuOpen(false); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-semibold">הצטרפו</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 left-1/3 w-48 h-48 bg-blue-500/8 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-xs font-medium">שוק פתוח · עדכון בזמן אמת</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Whale Radar
            </span>
            <br />
            <span className="text-3xl sm:text-4xl lg:text-5xl text-slate-200 font-semibold">פלטפורמת מסחר מתקדמת</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            עקוב אחר מיליוני מניות מהשוק האמריקאי בזמן אמת, עם ניתוח AI, סיגנלים ברורים — הכל במסך אחד.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl transition shadow-lg shadow-cyan-500/30 text-base w-full sm:w-auto justify-center"
            >
              הצטרפו עכשיו
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button onClick={onEnterApp} className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium px-6 py-3.5 rounded-xl transition text-base w-full sm:w-auto justify-center">
              כניסה לחשבון קיים
            </button>
          </div>

          {/* Disclaimer banner */}
          <p className="text-slate-600 text-xs max-w-lg mx-auto">
            המידע בפלטפורמה הינו למטרות מידע בלבד ואינו ייעוץ השקעות. כל משתמש אחראי על החלטותיו.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {[
              { value: '8,000+', label: 'מניות אמריקאיות' },
              { value: '8+', label: 'קבוצות שוק' },
              { value: '3', label: 'רמות מנוי' },
              { value: '100%', label: 'מאובטח' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 sm:py-24 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-400 text-xs font-medium">הסיפור שלנו</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">מי אנחנו</h2>
            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
              קבוצת סוחרים ישראלים עם ניסיון מצטבר של שנים רבות בשוק ההון האמריקאי — שהחליטה לשנות את הכללים
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
            <div className="space-y-6">
              <p className="text-slate-300 text-lg leading-relaxed">
                אנחנו קבוצה של סוחרים ישראלים עם שנות וותק בשוק ההון האמריקאי. לאורך השנים — מסחר יומי, ניתוח מניות, מעקב אחר חדשות בזמן אמת — הכרנו היטב את העולם הזה מבפנים.
              </p>
              <p className="text-slate-400 leading-relaxed">
                אבל יותר מכל, זיהינו דפוס חוזר: הסוחר הישראלי רוצה להשקיע, רוצה להיכנס לשוק — אבל נתקל בחסמים אמיתיים. גרפים שלא מובנים, נתונים באנגלית, פחד מהשוק הזר, וחוסר ידע בסיסי שמונע ממנו לפעול. בסוף הוא מחכה "לזמן הנכון" שלא מגיע אף פעם.
              </p>
              <p className="text-slate-400 leading-relaxed">
                מעבר לכך — מי שכן מחפש ללמוד נתקל בקורסים שעולים אלפי שקלים, עם תוצאות מפוקפקות. זה לא הוגן, ואנחנו רצינו לשנות את זה.
              </p>
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-5">
                <p className="text-cyan-300 font-semibold text-lg mb-2">לכן בנינו את Whale Radar</p>
                <p className="text-slate-400 leading-relaxed text-sm">
                  פלטפורמה שמרכזת הכל במקום אחד — מחירים בזמן אמת, ניתוח ברור, סיגנלים בעברית — כדי שכל ישראלי יוכל לסחור בביטחון ובידע, בלי לבזבז אלפים על קורסים.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Award, label: 'שנות ניסיון', value: '10+', desc: 'בשוק האמריקאי', color: 'cyan' },
                { icon: Globe2, label: 'שוק מוכר', value: 'NYSE & NASDAQ', desc: 'כל המניות המובילות', color: 'blue' },
                { icon: Target, label: 'משתמשים פעילים', value: '500+', desc: 'ישראלים סוחרים', color: 'emerald' },
                { icon: BookOpen, label: 'חיסכון למשתמש', value: '₪3,000+', desc: 'לעומת קורסים', color: 'amber' },
              ].map(({ icon: Icon, label, value, desc, color }) => {
                const colorMap: Record<string, string> = {
                  cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                };
                const iconColor: Record<string, string> = {
                  cyan: 'text-cyan-400', blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400',
                };
                return (
                  <div key={label} className={`bg-[#141929] border ${colorMap[color].split(' ')[1]} rounded-2xl p-5 flex flex-col gap-3`}>
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
                      <Icon className={`w-5 h-5 ${iconColor[color]}`} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-xl">{value}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pain points row */}
          <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 sm:p-8">
            <h3 className="text-white font-bold text-lg mb-6 text-center">האתגרים שהסוחר הישראלי מכיר</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'פחד מהשפה', desc: 'כל הנתונים, הניתוחים והחדשות — באנגלית. לא כולם שולטים בשפה ברמה הדרושה למסחר.' },
                { title: 'גרפים מבלבלים', desc: 'פתחת TradingView ולא ידעת מאיפה להתחיל? זה מוכר. גרפים דורשים לימוד ממושך.' },
                { title: 'עומס מידע', desc: 'יש כל כך הרבה מניות, נתונים וחדשות — קשה לדעת על מה להתמקד.' },
                { title: 'פחד מהשוק הזר', desc: 'השוק האמריקאי נתפס כמסוכן ומורכב לאלה שלא מכירים אותו מספיק.' },
                { title: 'קורסים יקרים', desc: 'קורסי מסחר עולים אלפי שקלים — ורבים לא מספקים את הערך המובטח.' },
                { title: '"אחכה לזמן הנכון"', desc: 'המשפט הנפוץ ביותר. ובינתיים, הזמן עובר והכסף לא עובד.' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
                  <div className="w-2 h-2 bg-red-400/60 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-slate-200 font-semibold text-sm mb-1">{title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                <span className="text-cyan-400 font-semibold">Whale Radar</span> נבנתה בדיוק בשביל לפתור את כל אלה — בפלטפורמה אחת, בעברית, במחיר הוגן.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">למה Whale Radar?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">פלטפורמה שנבנתה במיוחד עבור סוחרים שרוצים יתרון אמיתי בשוק</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 hover:border-slate-600/60 transition group">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">תוכניות מחיר</h2>
            <p className="text-slate-400">מנוי חודשי. ביטול בכל עת. ללא התחייבות.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isPopular = plan.id === 'pro';
              const borderMap: Record<string, string> = { blue: 'border-blue-500/40', emerald: 'border-emerald-500/50', amber: 'border-amber-500/50' };
              const iconMap: Record<string, string> = { blue: 'bg-blue-500/15 text-blue-400', emerald: 'bg-emerald-500/15 text-emerald-400', amber: 'bg-amber-500/15 text-amber-400' };
              const btnMap: Record<string, string> = {
                blue: 'bg-blue-600 hover:bg-blue-500 text-white',
                emerald: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white',
                amber: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white',
              };
              const checkMap: Record<string, string> = { blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400' };
              return (
                <div key={plan.id} className={`relative bg-[#141929] border ${borderMap[plan.color]} rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${isPopular ? 'shadow-lg shadow-emerald-500/10' : ''}`}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconMap[plan.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{plan.name}</h3>
                  <div className="mb-5">
                    <span className="text-3xl font-bold text-white">₪{plan.price}</span>
                    <span className="text-slate-500 text-sm">/חודש</span>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${checkMap[plan.color]}`} />
                        <span className="text-slate-300 text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${btnMap[plan.color]}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-center text-slate-600 text-xs mt-6">
            כל המנויים מוגבלים למכשיר ומשתמש בודד · שיתוף גישה מוביל לחסימת חשבון
          </p>
        </div>
      </section>

      {/* Contact / Join Form */}
      <section id="contact" className="py-16 sm:py-24 border-t border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">הצטרפו עכשיו</h2>
            <p className="text-slate-400">השאירו פרטים ונחזור אליכם תוך 24 שעות</p>
          </div>
          <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 sm:p-8">
            {formSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">הבקשה התקבלה!</h3>
                <p className="text-slate-400 mb-6">ניצור איתך קשר בהקדם האפשרי</p>
                <button onClick={onEnterApp} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition">
                  כנס לאפליקציה
                </button>
              </div>
            ) : (
              <ContactForm onSuccess={() => setFormSuccess(true)} />
            )}
          </div>
        </div>
      </section>

      {/* Support */}
      <section id="support" className="py-12 sm:py-16 border-t border-slate-800/60 bg-[#141929]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">שירות לקוחות</h2>
            <p className="text-slate-400 text-sm">אנחנו כאן לעזור בכל שאלה</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition group">
              <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold mb-1">WhatsApp</h3>
              <p className="text-slate-500 text-xs mb-3">מענה מהיר בשעות פעילות</p>
              <a
                href="https://wa.me/972524899914"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-2 rounded-xl transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                052-489-9914
              </a>
            </div>

            <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 text-center hover:border-cyan-500/30 transition group">
              <div className="w-12 h-12 bg-cyan-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Mail className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-white font-bold mb-1">אימייל</h3>
              <p className="text-slate-500 text-xs mb-3">מענה תוך יום עסקים</p>
              <a
                href="mailto:whaleradar@whaleradar.dev"
                className="inline-flex items-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 text-sm font-medium px-4 py-2 rounded-xl transition"
              >
                <Mail className="w-3.5 h-3.5" />
                שלח אימייל
              </a>
            </div>

            <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 text-center hover:border-slate-600/60 transition group">
              <div className="w-12 h-12 bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-white font-bold mb-1">שעות פעילות</h3>
              <p className="text-slate-500 text-xs mb-1">ימים א׳–ו׳</p>
              <p className="text-slate-300 text-sm font-semibold">09:00 – 15:00</p>
              <p className="text-slate-600 text-xs mt-1">מחוץ לשעות — WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal */}
      <section id="legal" className="py-12 sm:py-16 border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">מסמכים משפטיים</h2>
            <p className="text-slate-500 text-sm">קרא את התנאים לפני השימוש בפלטפורמה</p>
          </div>

          <div className="flex gap-2 mb-6 justify-center flex-wrap">
            {([
              { id: 'terms' as const, label: 'תנאי שימוש', icon: FileText },
              { id: 'privacy' as const, label: 'מדיניות פרטיות', icon: Eye },
              { id: 'disclaimer' as const, label: 'כתב ויתור', icon: Shield },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setLegalTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${legalTab === id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 bg-[#141929] border border-slate-700/40'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 sm:p-8 text-slate-400 text-sm leading-loose">
            {legalTab === 'terms' && (
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">תנאי שימוש — Whale Radar</h3>
                <p><strong className="text-slate-300">1. כללי:</strong> השימוש בפלטפורמה Whale Radar מהווה הסכמה לתנאים אלו. הפלטפורמה מיועדת למשתמשים בגירים מעל גיל 18.</p>
                <p><strong className="text-slate-300">2. מנוי אישי:</strong> כל מנוי מוגבל לחשבון ומכשיר אחד בלבד. אין להעביר, לשתף או למכור פרטי גישה לאחרים. הפרת תנאי זה תגרור חסימת חשבון ללא החזר כספי.</p>
                <p><strong className="text-slate-300">3. תשלום:</strong> התשלום הינו חודשי/שנתי ומחדש אוטומטית. ניתן לבטל בכל עת לפני תחילת חיוב הבא.</p>
                <p><strong className="text-slate-300">4. תוכן:</strong> כל המידע, הניתוחים, והסיגנלים בפלטפורמה הינם למטרות מידע בלבד. אין הם מהווים ייעוץ השקעות מורשה.</p>
                <p><strong className="text-slate-300">5. אחריות:</strong> Whale Radar אינה אחראית לכל הפסד כספי שייגרם כתוצאה משימוש במידע המוצג.</p>
                <p><strong className="text-slate-300">6. שינויים:</strong> אנו שומרים לעצמנו הזכות לשנות את התנאים בכל עת עם הודעה מוקדמת של 7 ימים.</p>
                <p className="text-slate-600 text-xs">עדכון אחרון: ינואר 2026</p>
              </div>
            )}
            {legalTab === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">מדיניות פרטיות — Whale Radar</h3>
                <p><strong className="text-slate-300">1. מידע שנאסף:</strong> שם, כתובת אימייל, מספר טלפון, כתובת IP, מזהה מכשיר וזמני שימוש.</p>
                <p><strong className="text-slate-300">2. שימוש במידע:</strong> המידע משמש לאימות זהות, מניעת שיתוף גישה, שיפור השירות ויצירת קשר.</p>
                <p><strong className="text-slate-300">3. אחסון:</strong> המידע מאוחסן בשרתי Supabase (בענן האמריקאי) ומוגן בהצפנה.</p>
                <p><strong className="text-slate-300">4. שיתוף:</strong> אנו לא מוכרים ולא משתפים מידע אישי עם צדדים שלישיים, למעט כנדרש על פי חוק.</p>
                <p><strong className="text-slate-300">5. עוגיות:</strong> אנו משתמשים בעוגיות לניהול session ושיפור חוויית המשתמש.</p>
                <p><strong className="text-slate-300">6. זכויות:</strong> בהתאם לחוק הגנת הפרטיות הישראלי, יש לך הזכות לעיין, לתקן ולמחוק מידע אישי שלך. לבקשות: <a href="mailto:whaleradar@whaleradar.dev" className="text-cyan-400">whaleradar@whaleradar.dev</a></p>
                <p className="text-slate-600 text-xs">עדכון אחרון: ינואר 2026</p>
              </div>
            )}
            {legalTab === 'disclaimer' && (
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">כתב ויתור — אחריות</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-300 font-semibold text-base mb-2">חשוב — קראו בעיון</p>
                  <p className="text-amber-200/80">כל המידע המופיע בפלטפורמה Whale Radar, לרבות ניתוחים, סיגנלים, מחירים ומגמות, הינו למטרות מידע ולימוד בלבד.</p>
                </div>
                <p><strong className="text-slate-300">אין ייעוץ השקעות:</strong> המידע אינו מהווה ייעוץ השקעות, המלצה לרכישה, מכירה, או החזקה של ניירות ערך כלשהם, ואינו מחליף ייעוץ מאת יועץ השקעות מורשה.</p>
                <p><strong className="text-slate-300">אחריות אישית:</strong> כל משתמש אחראי באופן בלעדי ומוחלט על החלטותיו הפיננסיות, ועל כל פעולה שיבצע בשוק ההון. Whale Radar אינה אחראית לכל הפסד, ישיר או עקיף, שייגרם.</p>
                <p><strong className="text-slate-300">סיכוני שוק:</strong> השקעות בשוק ההון כרוכות בסיכון. ערך ניירות הערך עשוי לרדת ואף להתאפס. ביצועי עבר אינם מעידים על ביצועים עתידיים.</p>
                <p><strong className="text-slate-300">דיוק המידע:</strong> אנו שואפים לדיוק מקסימלי, אך לא נוכל לערוב לנכונות מוחלטת של הנתונים בכל עת.</p>
                <p className="text-slate-600 text-xs">האמור לעיל מנוסח בלשון זכר מטעמי נוחות בלבד, אך מתייחס לכל המשתמשים ללא הבחנה. בשימוש בפלטפורמה הנך מאשר/ת שקראת והבנת את כתב הויתור המלא.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">Whale Radar</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">פלטפורמת ניטור שוק מניות מקצועית לסוחרים ישראלים</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-semibold text-sm mb-3">פלטפורמה</h4>
              <div className="space-y-2">
                <button onClick={onEnterApp} className="block text-slate-500 hover:text-slate-300 text-xs transition">כניסה לאפליקציה</button>
                <a href="#pricing" className="block text-slate-500 hover:text-slate-300 text-xs transition">מחירים</a>
                <a href="#features" className="block text-slate-500 hover:text-slate-300 text-xs transition">יתרונות</a>
              </div>
            </div>
            <div>
              <h4 className="text-slate-300 font-semibold text-sm mb-3">משפטי</h4>
              <div className="space-y-2">
                <button onClick={() => { setLegalTab('terms'); document.getElementById('legal')?.scrollIntoView({ behavior: 'smooth' }); }} className="block text-slate-500 hover:text-slate-300 text-xs transition text-right">תנאי שימוש</button>
                <button onClick={() => { setLegalTab('privacy'); document.getElementById('legal')?.scrollIntoView({ behavior: 'smooth' }); }} className="block text-slate-500 hover:text-slate-300 text-xs transition text-right">מדיניות פרטיות</button>
                <button onClick={() => { setLegalTab('disclaimer'); document.getElementById('legal')?.scrollIntoView({ behavior: 'smooth' }); }} className="block text-slate-500 hover:text-slate-300 text-xs transition text-right">כתב ויתור</button>
              </div>
            </div>
            <div>
              <h4 className="text-slate-300 font-semibold text-sm mb-3">צור קשר</h4>
              <div className="space-y-2">
                <a href="https://wa.me/972524899914" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 text-xs transition">
                  <MessageCircle className="w-3.5 h-3.5" />
                  052-489-9914
                </a>
                <a href="mailto:whaleradar@whaleradar.dev" className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 text-xs transition">
                  <Mail className="w-3.5 h-3.5" />
                  whaleradar@whaleradar.dev
                </a>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  א׳–ו׳ 09:00–15:00
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} Whale Radar · כל הזכויות שמורות</p>
            <p>המידע אינו ייעוץ השקעות · כל משתמש אחראי על עצמו בלבד</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
