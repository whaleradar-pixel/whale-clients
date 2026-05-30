import { useState, useEffect } from 'react';
import { Check, Crown, Star, Zap, Sparkles, ShieldCheck, AlertTriangle, Phone, ExternalLink } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionPlan, SubscriptionPlanId } from '../types';

const STRIPE_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PAID_PLANS: SubscriptionPlanId[] = ['basic', 'pro', 'vip'];

const PLAN_ICONS: Record<SubscriptionPlanId, typeof Zap> = {
  free: Zap,
  basic: Zap,
  pro: Star,
  vip: Crown,
};

const PLAN_COLORS: Record<SubscriptionPlanId, { border: string; badge: string; button: string; ring: string }> = {
  free: { border: 'border-slate-600/50', badge: 'bg-slate-500/20 text-slate-300', button: 'bg-slate-700 hover:bg-slate-600 text-white', ring: '' },
  basic: { border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300', button: 'bg-blue-600 hover:bg-blue-500 text-white', ring: 'ring-1 ring-blue-500/30' },
  pro: { border: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-300', button: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white', ring: 'ring-1 ring-emerald-500/40' },
  vip: { border: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-300', button: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white', ring: 'ring-1 ring-amber-500/40' },
};

function PlanCard({ plan, isCurrent, onSelect, billingCycle }: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  onSelect: (planId: SubscriptionPlanId) => void;
  billingCycle: 'monthly' | 'yearly';
}) {
  const Icon = PLAN_ICONS[plan.id as SubscriptionPlanId];
  const colors = PLAN_COLORS[plan.id as SubscriptionPlanId];
  const price = billingCycle === 'monthly' ? plan.price_monthly : Math.round(plan.price_yearly / 12);
  const isVip = plan.id === 'vip';
  const isPro = plan.id === 'pro';

  return (
    <div className={`relative bg-[#141929] border ${colors.border} ${colors.ring} rounded-2xl p-6 flex flex-col transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg`}>
      {plan.badge_text && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${isPro ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap`}>
          {plan.badge_text}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
        {isCurrent && (
          <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            מנוי פעיל
          </span>
        )}
      </div>

      <h3 className="text-white font-bold text-lg mb-1">{plan.name_he}</h3>
      <p className="text-slate-500 text-sm mb-4">{plan.description_he}</p>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-white">₪{price}</span>
          <span className="text-slate-500 text-sm mb-1">/חודש</span>
        </div>
        {billingCycle === 'yearly' && (
          <p className="text-emerald-400 text-xs mt-1 font-medium">
            חיסכון של ₪{(plan.price_monthly * 12 - plan.price_yearly).toFixed(0)} לשנה
          </p>
        )}
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {(plan.features as string[]).map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPro ? 'text-emerald-400' : isVip ? 'text-amber-400' : 'text-blue-400'}`} />
            <span className="text-slate-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id as SubscriptionPlanId)}
        disabled={isCurrent}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${isCurrent ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' : colors.button + ' shadow-md'}`}
      >
        {isCurrent ? 'מנוי נוכחי' : `שדרג ל${plan.name_he}`}
      </button>
    </div>
  );
}

export default function Subscription() {
  const { plans, currentPlan, isExpired } = useSubscription();
  const { profile } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const paidPlans = plans.filter(p => PAID_PLANS.includes(p.id as SubscriptionPlanId));

  const handleSelect = async (planId: SubscriptionPlanId) => {
    if (planId === currentPlan) return;
    setUpgrading(planId);

    if (STRIPE_ENABLED && profile?.id && profile?.email) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            planId,
            billingCycle,
            userId: profile.id,
            userEmail: profile.email,
            success_url: `${window.location.origin}${window.location.pathname}?payment=success`,
            cancel_url: `${window.location.origin}${window.location.pathname}?payment=cancelled`,
          }),
        });
        const { url, error } = await res.json();
        if (url) {
          window.location.href = url;
          return;
        }
        console.error('Stripe error:', error);
      } catch (err) {
        console.error('Stripe checkout failed:', err);
      }
    } else {
      setUpgrading(null);
      setSuccessMsg('לביצוע שדרוג פנה אלינו בווטסאפ: 052-489-9914');
      setTimeout(() => setSuccessMsg(''), 6000);
      return;
    }

    setUpgrading(null);
  };

  // Handle return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setSuccessMsg('התשלום בוצע בהצלחה! המנוי שלך עודכן.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f1a]" dir="rtl">
      {/* Expired banner */}
      {isExpired && (
        <div className="mx-6 mt-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-semibold">המנוי שלך פג תוקף</p>
            <p className="text-red-400/70 text-xs">חדש כעת כדי לשמור על הגישה לתכנים</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-b from-[#141929] to-transparent px-6 py-8 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 text-xs font-medium">שדרג את החוויה שלך</span>
        </div>
        <h1 className="text-white font-bold text-3xl mb-2">בחר את המנוי שמתאים לך</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">גישה לקבוצות מניות, ניתוח AI, וסיגנלים בזמן אמת</p>
      </div>

      {successMsg && (
        <div className="mx-6 mb-4 flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#141929] border border-slate-700/50 rounded-xl p-1 flex gap-1">
          {(['monthly', 'yearly'] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === cycle ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {cycle === 'monthly' ? 'חודשי' : (
                <span className="flex items-center gap-2">
                  שנתי <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">2 חודשים חינם</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div className="px-6 pb-8">
        {upgrading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#141929] border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">מעדכן מנוי...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {paidPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlan === plan.id}
              onSelect={handleSelect}
              billingCycle={billingCycle}
            />
          ))}
        </div>

        {/* Security note */}
        <div className="mt-8 max-w-2xl mx-auto bg-slate-800/30 border border-slate-700/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">מדיניות אבטחה ושימוש</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            המנוי מוגבל לחשבון ומכשיר בודד. כניסה ממכשיר אחר תנתק את המכשיר הקודם אוטומטית.
            שיתוף גישה אסור ויוביל לחסימת החשבון לצמיתות.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 max-w-2xl mx-auto rounded-xl p-4 text-center border border-slate-800/60">
          <p className="text-slate-600 text-xs leading-relaxed">
            המידע המוצג בפלטפורמה הינו למטרות מידע בלבד ואינו מהווה ייעוץ השקעות, המלצת רכישה או מכירה של ניירות ערך.
            כל משתמש אחראי באופן בלעדי על החלטותיו הפיננסיות. Whale Radar אינה אחראית לכל הפסד שייגרם כתוצאה משימוש במידע.
          </p>
        </div>

        {/* Support */}
        <div className="mt-4 max-w-2xl mx-auto text-center">
          <p className="text-slate-600 text-xs">
            שאלות לגבי המנוי?{' '}
            <a href="https://wa.me/972524899914" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition">
              <Phone className="w-3 h-3 inline ml-1" />
              WhatsApp 052-489-9914
            </a>
            {' · '}
            <a href="mailto:whaleradar@whaleradar.dev" className="text-cyan-400 hover:text-cyan-300 transition">
              whaleradar@whaleradar.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
