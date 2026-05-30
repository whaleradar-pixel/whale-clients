import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SubscriptionPlan, SubscriptionPlanId, canAccessPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useSubscription() {
  const { profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const prevPlanRef = useRef<SubscriptionPlanId | null>(null);
  const prevExpiryRef = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          setPlans(data.map((p) => ({ ...p, features: p.features as string[] })));
        }
        setLoading(false);
      });
  }, []);

  // Listen for DB-level subscription changes (e.g. after Stripe webhook or admin action)
  // and sync profile when they occur.
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`profile-sub-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          const newPlan = payload.new?.subscription_plan;
          const newExpiry = payload.new?.subscription_expires_at;
          if (
            newPlan !== prevPlanRef.current ||
            newExpiry !== prevExpiryRef.current
          ) {
            refreshProfile();
          }
        }
      )
      .subscribe();

    prevPlanRef.current = profile.subscription_plan;
    prevExpiryRef.current = profile.subscription_expires_at;

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, refreshProfile]);

  // Also refresh when the tab becomes visible again (user switches back after payment)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshProfile();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshProfile]);

  const currentPlan = profile?.subscription_plan ?? 'free';
  const isExpired = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at) < new Date()
    : false;
  const effectivePlan: SubscriptionPlanId = isExpired ? 'free' : currentPlan;

  const hasAccess = (requiredPlan: SubscriptionPlanId) =>
    canAccessPlan(effectivePlan, requiredPlan);

  return { plans, loading, currentPlan: effectivePlan, hasAccess, isExpired };
}
