import { useState, FormEvent } from 'react';
import { TrendingUp, Lock, Eye, EyeOff, Shield, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export default function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('נא למלא את כל השדות'); return; }
    setError('');
    setLoading(true);

    try {
      // Sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        setError('אימייל או סיסמה שגויים');
        setLoading(false);
        return;
      }

      // Verify user is in admin_users table
      const { data: adminRecord, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (adminError || !adminRecord) {
        await supabase.auth.signOut();
        setError('אין לך הרשאות גישה לפאנל הניהול');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('wr_admin_auth', 'true');
      sessionStorage.setItem('wr_admin_role', adminRecord.role);
      onAuthenticated();
    } catch {
      setError('אירעה שגיאה. נסה שוב.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold">Whale Radar</span>
          </div>
          <h1 className="text-white font-bold text-xl">כניסה לפאנל ניהול</h1>
          <p className="text-slate-500 text-sm mt-1">גישה מוגבלת לצוות בלבד</p>
        </div>

        <div className="bg-[#141929] border border-slate-700/50 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition"
                  placeholder="admin@example.com"
                  dir="ltr"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-3 pr-10 pl-10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Lock className="w-4 h-4" />כניסה</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          גישה לאזור ניהול בלבד · Whale Radar © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
