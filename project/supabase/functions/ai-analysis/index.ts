import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

// Rate limit: 20 requests per minute per user
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

interface AnalysisRequest {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface AnalysisResult {
  symbol: string;
  analysis_he: string;
  signal: "bullish" | "bearish" | "neutral";
  momentum: string;
  volume_note: string;
  trend: string;
  cached: boolean;
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const key = `user:${userId}`;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("key", key)
    .eq("function_name", "ai-analysis")
    .maybeSingle();

  if (error) return true; // allow on DB error

  if (!data || new Date(data.window_start) < new Date(windowStart)) {
    // New window — upsert with count=1
    await supabase.from("rate_limits").upsert({
      key,
      function_name: "ai-analysis",
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const allowed = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AnalysisRequest = await req.json();
    const { symbol, price, change, changePercent, volume } = body;

    if (!symbol || price === undefined) {
      return new Response(
        JSON.stringify({ error: "symbol and price are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache — if analysis exists and is < 30 minutes old, return it
    const { data: cached } = await supabase
      .from("ai_analysis_cache")
      .select("*")
      .eq("symbol", symbol)
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      const result = generateRuleBasedAnalysis(symbol, price, change, changePercent, volume);
      await cacheAnalysis(supabase, symbol, price, changePercent, result);
      return new Response(
        JSON.stringify({ ...result, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI
    const prompt = buildPrompt(symbol, price, change, changePercent, volume);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `אתה אנליסט שוק הון מנוסה. תפקידך לספק ניתוח טכני קצר ומדויק בעברית לפעילות מסחר.
הפלט חייב להיות JSON בלבד עם השדות הבאים:
- analysis_he: ניתוח קצר ב-2 משפטים בעברית (מקסימום 120 תווים)
- signal: "bullish" | "bearish" | "neutral"
- momentum: "חזק" | "מתון" | "חלש"
- volume_note: "גבוה" | "ממוצע" | "נמוך"
- trend: "עולה" | "יורד" | "צידי"
אל תוסיף שום דבר מחוץ ל-JSON.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!openaiRes.ok) {
      const result = generateRuleBasedAnalysis(symbol, price, change, changePercent, volume);
      await cacheAnalysis(supabase, symbol, price, changePercent, result);
      return new Response(
        JSON.stringify({ ...result, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "";

    let parsed: Omit<AnalysisResult, "symbol" | "cached">;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = generateRuleBasedAnalysis(symbol, price, change, changePercent, volume);
    }

    await cacheAnalysis(supabase, symbol, price, changePercent, parsed);

    return new Response(
      JSON.stringify({ symbol, ...parsed, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-analysis error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPrompt(symbol: string, price: number, change: number, changePercent: number, volume?: number): string {
  const direction = changePercent >= 0 ? "עלייה" : "ירידה";
  const absChange = Math.abs(changePercent).toFixed(2);
  const absChangeUsd = Math.abs(change).toFixed(2);
  const vol = volume ? `נפח מסחר: ${(volume / 1_000_000).toFixed(1)}M מניות. ` : "";
  return `נתח את המניה ${symbol}. מחיר נוכחי: $${price.toFixed(2)}. ${direction} של ${absChangeUsd}$ (${absChange}%). ${vol}ספק ניתוח טכני קצר.`;
}

function generateRuleBasedAnalysis(
  symbol: string,
  price: number,
  change: number,
  changePercent: number,
  volume?: number
): Omit<AnalysisResult, "symbol" | "cached"> {
  const isUp = changePercent >= 0;
  const absChange = Math.abs(changePercent);
  const isStrong = absChange > 2;
  const isMild = absChange > 0.5 && absChange <= 2;

  let signal: "bullish" | "bearish" | "neutral";
  let momentum: string;
  let trend: string;
  let analysis_he: string;

  if (isUp && isStrong) {
    signal = "bullish";
    momentum = "חזק";
    trend = "עולה";
    analysis_he = `${symbol} מציג מומנטום עולה חזק עם עלייה של ${Math.abs(changePercent).toFixed(1)}%. נפח מסחר מעיד על עניין מוסדי.`;
  } else if (isUp && isMild) {
    signal = "bullish";
    momentum = "מתון";
    trend = "עולה";
    analysis_he = `${symbol} נסחר בעלייה מתונה. המגמה חיובית אך יש לעקוב אחר נפח לאישור.`;
  } else if (!isUp && isStrong) {
    signal = "bearish";
    momentum = "חלש";
    trend = "יורד";
    analysis_he = `${symbol} ספג לחץ מכירה משמעותי של ${Math.abs(changePercent).toFixed(1)}%. מומלץ המתנה לייצוב לפני כניסה.`;
  } else if (!isUp && isMild) {
    signal = "bearish";
    momentum = "מתון";
    trend = "יורד";
    analysis_he = `${symbol} מציג ירידה מתונה. כדאי לעקוב אחר רמות תמיכה מרכזיות.`;
  } else {
    signal = "neutral";
    momentum = "מתון";
    trend = "צידי";
    analysis_he = `${symbol} נסחר ביציבות יחסית. אין כיוון ברור — המתנה לפריצת טווח מסחר.`;
  }

  const volume_note =
    volume && volume > 10_000_000 ? "גבוה" :
    volume && volume > 3_000_000 ? "ממוצע" : "נמוך";

  return { analysis_he, signal, momentum, volume_note, trend };
}

async function cacheAnalysis(
  supabase: ReturnType<typeof createClient>,
  symbol: string,
  price: number,
  changePercent: number,
  result: Omit<AnalysisResult, "symbol" | "cached">
) {
  await supabase.from("ai_analysis_cache").insert({
    symbol,
    price,
    change_percent: changePercent,
    analysis_he: result.analysis_he,
    signal: result.signal,
    momentum: result.momentum,
    volume_note: result.volume_note,
    trend: result.trend,
  });
}
