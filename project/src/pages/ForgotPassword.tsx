import { useState, FormEvent } from 'react';
import { TrendingUp, Mail, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) { setError('נא להזין כתובת אימייל'); return; }
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#reset-password`,
    });

    setLoading(false);
    if (err) {
      setError('אירעה שגיאה. נסה שוב.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/30">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Whale Radar</h1>
          <p className="text-slate-400 mt-1 text-sm">שחזור סיסמה</p>
        </div>

        <div className="bg-[#141929] rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">נשלח!</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-1">
                אם הכתובת <span className="text-cyan-400 font-medium">{email}</span> רשומה במערכת,
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                תקבל אימייל עם קישור לאיפוס סיסמה תוך מספר דקות.
              </p>
              <p className="text-slate-500 text-xs mb-6">לא קיבלת? בדוק בתיקיית ספאם.</p>
              <button
                onClick={onBack}
                className="flex items-center gap-2 mx-auto text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לכניסה
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">שכחת סיסמה?</h2>
              <p className="text-slate-400 text-sm mb-6">הזן את האימייל שלך ונשלח קישור לאיפוס.</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">כתובת אימייל</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      שולח...
                    </span>
                  ) : 'שלח קישור לאיפוס'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
                <button onClick={onBack} className="flex items-center gap-1.5 mx-auto text-slate-400 hover:text-slate-200 text-sm transition">
                  <ArrowRight className="w-3.5 h-3.5" />
                  חזרה לכניסה
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
