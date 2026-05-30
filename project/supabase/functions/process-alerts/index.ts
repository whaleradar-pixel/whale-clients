import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whaleradar.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  triggered_at: string | null;
  notified_at: string | null;
}

interface AlertWithProfile extends PriceAlert {
  profiles: {
    email: string;
    full_name: string;
    notification_preferences: {
      price_alerts: boolean;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Internal cron-only endpoint — require service role key
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!authHeader.includes(serviceRoleKey)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const finnhubKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubKey) {
      return new Response(
        JSON.stringify({ error: "FINNHUB_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all active, un-triggered alerts with user profile
    const { data: alerts, error: alertsErr } = await supabase
      .from("price_alerts")
      .select(`
        *,
        profiles!inner(email, full_name, notification_preferences)
      `)
      .eq("is_active", true)
      .is("triggered_at", null);

    if (alertsErr || !alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, triggered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique symbols
    const symbols = [...new Set((alerts as AlertWithProfile[]).map((a) => a.symbol))];

    // Fetch current prices from Finnhub
    const prices: Record<string, number> = {};
    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.c && data.c > 0) prices[sym] = data.c;
          }
        } catch {
          // skip symbol on error
        }
      })
    );

    // Check each alert against current price
    const triggered: string[] = [];

    for (const alert of alerts as AlertWithProfile[]) {
      const currentPrice = prices[alert.symbol];
      if (!currentPrice) continue;

      const shouldTrigger =
        (alert.condition === "above" && currentPrice >= alert.target_price) ||
        (alert.condition === "below" && currentPrice <= alert.target_price);

      if (!shouldTrigger) continue;

      // Mark as triggered
      await supabase
        .from("price_alerts")
        .update({ triggered_at: new Date().toISOString(), is_active: false })
        .eq("id", alert.id);

      triggered.push(alert.id);

      // Send email if user has price_alerts enabled
      if (alert.profiles?.notification_preferences?.price_alerts === false) continue;
      if (!alert.profiles?.email) continue;

      // Call send-email edge function
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const condition_he = alert.condition === "above" ? "מעל" : "מתחת ל";
      const direction_emoji = alert.condition === "above" ? "▲" : "▼";

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: alert.profiles.email,
          type: "custom",
          subject: `${direction_emoji} התראת מחיר: ${alert.symbol} ${condition_he} $${alert.target_price}`,
          data: {
            title: `התראת מחיר הופעלה`,
            message: `המניה ${alert.symbol} הגיעה למחיר $${currentPrice.toFixed(2)}, ${condition_he} יעד ההתראה שלך של $${alert.target_price}.\n\nזהו עדכון אוטומטי מ-Whale Radar.`,
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        processed: alerts.length,
        triggered: triggered.length,
        triggered_ids: triggered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-alerts error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
