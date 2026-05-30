import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whaleradar.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "בסיסי",
  pro: "מקצועי",
  vip: "VIP",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find users expiring in 7 days and 3 days (send once per threshold)
    const now = new Date();

    const thresholds = [
      { days: 7, label: "7" },
      { days: 3, label: "3" },
    ];

    let totalNotified = 0;

    for (const { days } of thresholds) {
      // Window: exactly this many days (±12 hours window to avoid missing runs)
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() + days);
      windowStart.setHours(windowStart.getHours() - 12);

      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + days);
      windowEnd.setHours(windowEnd.getHours() + 12);

      const { data: expiringUsers, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, subscription_plan, subscription_expires_at")
        .neq("subscription_plan", "free")
        .gte("subscription_expires_at", windowStart.toISOString())
        .lte("subscription_expires_at", windowEnd.toISOString())
        .is("deleted_at", null)
        .eq("is_blocked", false);

      if (error) {
        console.error(`[send-expiry-notifications] DB error for ${days}-day threshold:`, error);
        continue;
      }

      for (const user of expiringUsers ?? []) {
        const firstName = user.full_name?.split(" ")[0] || "לקוח";
        const planLabel = PLAN_LABELS[user.subscription_plan] || user.subscription_plan;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              type: "subscription_expiring",
              to: user.email,
              data: {
                name: firstName,
                planName: planLabel,
                daysLeft: days,
              },
            }),
          });
          totalNotified++;
          console.log(`[send-expiry-notifications] Notified ${user.email} (${days} days left)`);
        } catch (emailErr) {
          console.error(`[send-expiry-notifications] Failed to notify ${user.email}:`, emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: totalNotified }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[send-expiry-notifications] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
