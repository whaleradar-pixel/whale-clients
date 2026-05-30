export type SubscriptionPlanId = 'free' | 'basic' | 'pro' | 'vip';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name_he: string;
  description_he: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  color: string;
  badge_text: string | null;
  sort_order: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  subscription_plan: SubscriptionPlanId;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  is_email_verified: boolean;
  notification_preferences: {
    price_alerts: boolean;
    market_news: boolean;
    signal_alerts: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface MarketGroup {
  id: string;
  name_he: string;
  description_he: string;
  icon: string;
  required_plan: SubscriptionPlanId;
  symbols: string[];
  color: string;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  sort_order: number;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_fingerprint: string;
  user_agent: string;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface VerificationCode {
  id: string;
  user_id: string;
  email: string;
  code: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  attempts: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
}

const PLAN_ORDER: Record<SubscriptionPlanId, number> = { free: 0, basic: 1, pro: 2, vip: 3 };

export function canAccessPlan(userPlan: SubscriptionPlanId, requiredPlan: SubscriptionPlanId): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[requiredPlan];
}
