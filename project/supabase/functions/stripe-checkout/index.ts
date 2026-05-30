import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://whaleradar.dev",
  "https://www.whaleradar.dev",
  "https://app.whaleradar.dev",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".netlify.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

// Rate limit: 10 checkout attempts per minute per user
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const PRICE_MAP: Record<string, number> = {
  basic: 4900,
  pro: 9900,
  vip: 19900,
};

const PLAN_NAMES: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  vip: "VIP",
};

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const key = `user:${userId}`;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("key", key)
    .eq("function_name", "stripe-checkout")
    .maybeSingle();

  if (error) return true;

  if (!data || new Date(data.window_start) < new Date(windowStart)) {
    await supabase.from("rate_limits").upsert({
      key,
      function_name: "stripe-checkout",
      request_count: 1,
      window_start: new Date().toISOString(),
    }, { onConflict: "key,function_name" });
    return true;
  }

  if (data.request_count >= RATE_LIMIT) return false;

  await supabase
    .from("rate_limits")
    .update({ request_count: data.request_count + 1 })
    .eq("id", data.id);

  return true;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://app.whaleradar.dev";

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      planId,
      billingCycle,
      userId,
      userEmail,
      success_url,
      cancel_url,
    } = body as {
      planId: string;
      billingCycle: "monthly" | "yearly";
      userId: string;
      userEmail: string;
      success_url?: string;
      cancel_url?: string;
    };

    if (!planId || !billingCycle || !userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: planId, billingCycle, userId, userEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["basic", "pro", "vip"].includes(planId)) {
      return new Response(
        JSON.stringify({ error: "Invalid planId. Must be one of: basic, pro, vip" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return new Response(
        JSON.stringify({ error: "Invalid billingCycle. Must be 'monthly' or 'yearly'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit check
    const allowed = await checkRateLimit(supabase, userId);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "יותר מדי ניסיונות. נסה שוב בעוד דקה." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const monthlyPrice = PRICE_MAP[planId];
    // Yearly = 10 months price (2 months free)
    const unitAmount = billingCycle === "yearly"
      ? monthlyPrice * 10
      : monthlyPrice;

    const successUrl = success_url || `${appBaseUrl}?checkout=success&plan=${planId}`;
    const cancelUrl = cancel_url || `${appBaseUrl}?checkout=cancelled`;

    const savedAmount = ((monthlyPrice * 2) / 100).toFixed(0);
    const billingLabel = billingCycle === "yearly"
      ? `שנתי (חיסכון של ₪${savedAmount})`
      : "חודשי";
    const planLabel = `${PLAN_NAMES[planId]} - ${billingLabel}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: unitAmount,
            product_data: {
              name: `Whale Radar - תוכנית ${planLabel}`,
              description: `גישה לתוכנית ${PLAN_NAMES[planId]} ב-Whale Radar`,
              images: [`${appBaseUrl}/logo.png`],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        planId,
        billingCycle,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "he",
      payment_intent_data: {
        metadata: {
          userId,
          planId,
          billingCycle,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[stripe-checkout] Error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
