import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whaleradar.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYMBOLS = {
  mega: ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO"],
  tech: ["AMD", "INTC", "QCOM", "CRM", "NOW", "SNOW", "PLTR", "UBER"],
  finance: ["JPM", "GS", "BAC", "MS", "BLK", "V", "MA"],
  etf: ["SPY", "QQQ", "IWM", "XLF", "SOXX", "ARKK"],
};

const ALL_SYMBOLS = [...SYMBOLS.mega, ...SYMBOLS.tech, ...SYMBOLS.finance, ...SYMBOLS.etf];

const INSTITUTIONS = [
  "BlackRock", "Vanguard", "Fidelity", "Goldman Sachs", "Morgan Stanley",
  "Citadel", "Point72", "Millennium Management", "Renaissance Technologies",
  "Two Sigma", "DE Shaw", "Bridgewater Associates", "Andreessen Horowitz",
  "Tiger Global", "Coatue Management",
];

const TEMPLATES = {
  buy: [
    (sym: string, val: string, inst: string) => `${inst} רכשה ${val} במניות ${sym} — מצביע על אמון לטווח ארוך.`,
    (sym: string, val: string, inst: string) => `רכישה מוסדית משמעותית של ${sym} על ידי ${inst}, צוות ניתוח רואה פוטנציאל.`,
    (sym: string, val: string, _inst: string) => `${sym} ספגה רכישת בלוק של ${val} — אינדיקציה לעמדה אסטרטגית.`,
  ],
  sell: [
    (sym: string, val: string, inst: string) => `${inst} מכרה ${val} במניות ${sym} — ייתכן גיוון תיק.`,
    (sym: string, val: string, _inst: string) => `מכירה מוסדית של ${sym} בסכום ${val} — כדאי לעקוב אחר תגובת השוק.`,
    (sym: string, val: string, inst: string) => `${inst} הקטינה חשיפה ל-${sym} — מכירת ${val}.`,
  ],
  options: [
    (sym: string, val: string, _inst: string) => `פעילות אופציות חריגה ב-${sym} בשווי ${val} — הימור על תנועה משמעותית.`,
    (sym: string, val: string, inst: string) => `${inst} פתחה עמדת Call ב-${sym} — ${val} — ציפייה לעלייה.`,
    (sym: string, val: string, _inst: string) => `עסקת אופציות Put ב-${sym} של ${val} — גידור נגד ירידות.`,
  ],
  block: [
    (sym: string, val: string, inst: string) => `עסקת בלוק ב-${sym} — ${val} עוברים בין ${inst} לגוף מוסדי נוסף.`,
    (sym: string, val: string, _inst: string) => `${sym} רשמה עסקת בלוק ענקית של ${val} — מחליפה ידיים בין ויילים.`,
  ],
};

const SIGNAL_TEMPLATES = [
  {
    signal_type: "bullish",
    plan_required: "pro",
    templates: [
      { title: "זרימה מוסדית חיובית ב-NASDAQ", body: "ניתוח זרימות הכסף מצביע על קניות נטו של מוסדיים בסקטור הטכנולוגיה. SPY ו-QQQ רשמו יתרת קניות חיובית ב-3 ימי המסחר האחרונים." },
      { title: "אפטיב ETF ויילים לונג", body: "ETF ויילים מציגים עמדות לונג מוגדלות בסקטור הטכנולוגיה. NVDA, AAPL ו-MSFT מובילים בנפח הקנייה המוסדית." },
      { title: "רמת תמיכה מוסדית חזקה ב-S&P 500", body: "מוסדיים ממהרים לרכוש בכל ירידה לאזור 5,200–5,250 ב-SPY. זרם הכסף הגדול מצביע על רצפה חזקה." },
    ],
  },
  {
    signal_type: "bearish",
    plan_required: "pro",
    templates: [
      { title: "מכירת ויילים בסקטור הפיננסי", body: "ניתוח עסקאות בלוק מגלה מכירות נטו בסקטור הפיננסי. JPM ו-GS רשמו יציאת מוסדיים שמציינת זהירות." },
      { title: "ירידה בנפח מוסדי — אות זהירות", body: "נפח המסחר המוסדי ירד ב-18% בשבוע האחרון. היסטורית, הפחתה כזו קדמה לתיקון של 3–5%." },
    ],
  },
  {
    signal_type: "neutral",
    plan_required: "vip",
    templates: [
      { title: "שוק בהמתנה — מוסדיים ניטרליים", body: "אין כיוון ברור בזרימות הכסף הגדול. הרוב המוחלט של ויילים ממתינים לפרסום נתוני מאקרו לפני קביעת עמדה." },
      { title: "VIX בעלייה — מוסדיים מגדרים", body: "עלייה בפעילות האופציות לגידור מצביעה שויילים מוכנים לתנודתיות. רכישות Put בנפח גבוה ב-SPY ו-QQQ." },
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatValue(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  return `$${(usd / 1_000).toFixed(0)}K`;
}

function generateActivity() {
  const types = ["buy", "sell", "options", "block"] as const;
  // Weight towards buy/sell
  const weightedTypes: (typeof types[number])[] = ["buy", "buy", "buy", "sell", "sell", "options", "block"];
  const activity_type = pickRandom(weightedTypes);
  const symbol = pickRandom(ALL_SYMBOLS);
  const institution = pickRandom(INSTITUTIONS);

  // Value ranges by type
  const valueRanges = {
    buy: [5_000_000, 500_000_000],
    sell: [5_000_000, 300_000_000],
    options: [1_000_000, 50_000_000],
    block: [50_000_000, 2_000_000_000],
  };
  const [min, max] = valueRanges[activity_type];
  const value_usd = randInt(min / 1_000_000, max / 1_000_000) * 1_000_000;

  const template = pickRandom(TEMPLATES[activity_type]);
  const notes_he = template(symbol, formatValue(value_usd), institution);

  // Plan required based on value
  const plan_required = value_usd >= 500_000_000 ? "vip" : value_usd >= 100_000_000 ? "pro" : "basic";

  // occurred_at: random in last 4 hours
  const minutesAgo = randInt(5, 240);
  const occurred_at = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  return { symbol, activity_type, value_usd, institution, notes_he, plan_required, occurred_at, is_active: true };
}

function generateSignal() {
  const group = pickRandom(SIGNAL_TEMPLATES);
  const tmpl = pickRandom(group.templates);
  return {
    title_he: tmpl.title,
    body_he: tmpl.body,
    signal_type: group.signal_type,
    plan_required: group.plan_required,
    is_active: true,
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

    // How many to generate (default: 5 activities + 1 signal)
    const url = new URL(req.url);
    const activityCount = parseInt(url.searchParams.get("activities") ?? "5");
    const signalCount = parseInt(url.searchParams.get("signals") ?? "1");

    // Deactivate old entries (keep last 100 activities, 10 signals)
    // Insert new activities
    const activities = Array.from({ length: activityCount }, generateActivity);
    const { error: actErr } = await supabase.from("whale_activities").insert(activities);

    // Insert new signals
    const signals = Array.from({ length: signalCount }, generateSignal);
    const { error: sigErr } = await supabase.from("whale_market_signals").insert(signals);

    // Cleanup: deactivate entries older than 48 hours
    await supabase
      .from("whale_activities")
      .update({ is_active: false })
      .lt("occurred_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    await supabase
      .from("whale_market_signals")
      .update({ is_active: false })
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (actErr || sigErr) {
      console.error("Insert errors:", actErr, sigErr);
      return new Response(
        JSON.stringify({ error: "Failed to insert data", actErr, sigErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, generated: { activities: activityCount, signals: signalCount } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-whale-activity error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
