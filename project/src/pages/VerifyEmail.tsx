import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { ShieldCheck, RotateCcw, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface VerifyEmailProps {
  email: string;
  onVerified: () => void;
}

export default function VerifyEmail({ email, onVerified }: VerifyEmailProps) {
  const { verifyCode, sendVerificationCode } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Send code on first mount so user always receives it, even after page refresh
  useEffect(() => {
    sendVerificationCode(email);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const updateDigit = (index: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = v;
    setDigits(newDigits);
    if (v && index < 5) inputs.current[index + 1]?.focus();
    // Auto submit when all filled
    if (v && index === 5 && newDigits.every((d) => d)) {
      submitCode(newDigits.join(''));
    }
  };

  const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    setLoading(true);
    setError('');
    const { error } = await verifyCode(email, code);
    setLoading(false);
    if (error) {
      setError(error);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } else {
      setSuccess(true);
      setTimeout(onVerified, 1500);
    }
  };

  const handleManualSubmit = () => {
    const code = digits.join('');
    if (code.length < 6) { setError('הזן קוד בן 6 ספרות'); return; }
    submitCode(code);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const result = await sendVerificationCode(email);
    setResendCooldown(60);
    setDigits(['', '', '', '', '', '']);
    if (result.error) {
      setError(result.error);
    } else {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg transition-all duration-500 ${success ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30'}`}>
            {success ? <CheckCircle className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white">אימות אימייל</h1>
          <p className="text-slate-400 mt-2 text-sm">
            שלחנו קוד בן 6 ספרות לכתובת
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-medium text-sm">{email}</span>
          </div>
        </div>

        <div className="bg-[#141929] rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-emerald-400 font-semibold">אומת בהצלחה!</p>
              <p className="text-slate-400 text-sm mt-1">מעביר לדשבורד...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-4 text-center">הזן את הקוד שקיבלת</label>
                <div className="flex gap-3 justify-center" dir="ltr">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => updateDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKey(i, e)}
                      onPaste={handlePaste}
                      disabled={loading}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all duration-200 bg-[#0b0f1a] text-white focus:outline-none ${d ? 'border-cyan-500 shadow-sm shadow-cyan-500/30' : 'border-slate-700 focus:border-cyan-500'} ${loading ? 'opacity-50' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={loading || digits.some((d) => !d)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    בודק...
                  </span>
                ) : 'אמת קוד'}
              </button>

              <div className="mt-5 text-center">
                <span className="text-slate-500 text-sm">לא קיבלת קוד? </span>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:cursor-not-allowed text-sm font-semibold transition"
                >
                  {resendCooldown > 0 ? `שלח שוב (${resendCooldown}s)` : (
                    <span className="flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />שלח שוב
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          מטעמי אבטחה, הקוד תקף ל-10 דקות בלבד
        </p>
      </div>
    </div>
  );
}
