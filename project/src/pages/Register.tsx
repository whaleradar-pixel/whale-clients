import { useState, FormEvent } from 'react';
import { TrendingUp, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterProps {
  onSwitch: () => void;
  onSuccess: () => void;
}

export default function Register({ onSwitch, onSuccess }: RegisterProps) {
  const { signUp, signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (p: string) => {
    if (p.length < 8) return 'הסיסמה חייבת להכיל לפחות 8 תווים';
    if (!/[A-Z]/.test(p)) return 'הסיסמה חייבת להכיל לפחות אות גדולה אחת';
    if (!/[0-9]/.test(p)) return 'הסיסמה חייבת להכיל לפחות ספרה אחת';
    return null;
  };

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][strength - 1] ?? 'bg-slate-700';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) { setError('נא למלא את כל השדות'); return; }
    const passErr = validatePassword(password);
    if (passErr) { setError(passErr); return; }
    if (password !== confirmPassword) { setError('הסיסמאות אינן תואמות'); return; }

    setError('');
    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) {
      const msgs: Record<string, string> = {
        'User already registered': 'כתובת האימייל כבר רשומה',
        'Password should be at least 6 characters': 'הסיסמה קצרה מדי',
      };
      setError(msgs[signUpError] || signUpError);
      setLoading(false);
      return;
    }

    // Auto sign in after registration
    const { error: signInError } = await signIn(email, password);
    if (!signInError) {
      onSuccess();
    } else {
      setError('נרשמת בהצלחה! אנא התחבר.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/30">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Whale Radar</h1>
          <p className="text-slate-400 mt-1 text-sm">צור חשבון חינמי</p>
        </div>

        <div className="bg-[#141929] rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">הרשמה</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">שם מלא</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                  placeholder="ישראל ישראלי"
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                  placeholder="מינימום 8 תווים"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-slate-700'}`} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">אימות סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#0b0f1a] border rounded-xl py-3 pr-10 pl-10 text-white placeholder-slate-500 focus:outline-none transition ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30'}`}
                  placeholder="הזן שוב את הסיסמה"
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  יוצר חשבון...
                </span>
              ) : 'צור חשבון'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
            <span className="text-slate-400 text-sm">יש לך כבר חשבון? </span>
            <button onClick={onSwitch} className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition">כניסה</button>
          </div>
        </div>
      </div>
    </div>
  );
}
