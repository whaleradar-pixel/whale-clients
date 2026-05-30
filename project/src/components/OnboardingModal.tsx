import { useState } from 'react';
import { BarChart2, Bell, Brain, Crown, ChevronLeft, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: BarChart2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'ברוך הבא ל-Whale Radar',
    body: 'פלטפורמה חכמה למעקב אחר תנועות כסף גדולות בשוק ההון. תראה בזמן אמת מה הגופים המוסדיים קונים ומוכרים.',
  },
  {
    icon: Bell,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'התראות מחיר בזמן אמת',
    body: 'הגדר התראות לכל מחיר שתרצה — מקבל עדכון מיידי למייל ברגע שהמניה מגיעה ליעד שהגדרת.',
  },
  {
    icon: Brain,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'ניתוח AI לכל מניה',
    body: 'לחץ על כל מניה וקבל ניתוח טכני מיידי מ-AI בעברית — סיגנל, מומנטום וכיוון המגמה.',
  },
  {
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'שדרג לגישה מלאה',
    body: 'בתוכנית חינמית יש גישה ל-5 מניות. שדרג ל-Basic, Pro או VIP לגישה מלאה לנתוני ויילים, סיגנלים ופעילות מוסדית.',
  },
];

const ONBOARDING_KEY = 'wr_onboarding_done';

export function shouldShowOnboarding(): boolean {
  return !localStorage.getItem(ONBOARDING_KEY);
}

export function markOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

interface OnboardingModalProps {
  onDone: () => void;
}

export default function OnboardingModal({ onDone }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleDone = () => {
    markOnboardingDone();
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-cyan-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${current.bg}`}>
            <Icon className={`w-7 h-7 ${current.color}`} />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl leading-snug">{current.title}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{current.body}</p>
          </div>

          {/* Step indicator */}
          <p className="text-slate-600 text-xs">{step + 1} / {STEPS.length}</p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 transition text-sm font-medium"
              >
                <ChevronRight className="w-4 h-4" />
                הקודם
              </button>
            )}
            <button
              onClick={isLast ? handleDone : () => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-md"
            >
              {isLast ? 'מתחילים!' : (
                <>
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={handleDone}
            className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-slate-700/50 text-slate-600 hover:text-slate-400 text-xs transition"
          >
            <X className="w-3 h-3" />
            דלג
          </button>
        )}
      </div>
    </div>
  );
}
