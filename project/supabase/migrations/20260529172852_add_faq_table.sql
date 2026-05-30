/*
  # Add FAQ table for dynamic SupportBot content

  1. New Table
    - `faq_items`
      - `id` (uuid, primary key)
      - `question` (text) — the question text shown to users and matched via free text
      - `answer` (text) — full answer shown in chat
      - `followup_keys` (text[]) — array of question keys for follow-up options
      - `is_menu_item` (boolean) — whether shown in main menu
      - `sort_order` (integer) — display order
      - `is_active` (boolean) — soft delete / disable
      - `created_at`, `updated_at`

  2. Security
    - Enable RLS
    - Admins (service role) can do all CRUD
    - Authenticated users can only SELECT active items
    - Public (anon) can SELECT active items (needed for Landing page SupportBot)

  3. Seed
    - Insert default FAQ items matching the hardcoded ones
*/

CREATE TABLE IF NOT EXISTS faq_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question        text NOT NULL,
  answer          text NOT NULL,
  followup_keys   text[] DEFAULT '{}',
  is_menu_item    boolean DEFAULT false,
  sort_order      integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active FAQ items"
  ON faq_items FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage FAQ items"
  ON faq_items FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update FAQ items"
  ON faq_items FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can delete FAQ items"
  ON faq_items FOR DELETE
  TO service_role
  USING (true);

-- Index for ordering
CREATE INDEX IF NOT EXISTS faq_items_sort_order_idx ON faq_items(sort_order, created_at);

-- Seed default items
INSERT INTO faq_items (question, answer, followup_keys, is_menu_item, sort_order) VALUES
(
  'לא מצליח להתחבר',
  'בעיות כניסה נפוצות:

1. ודא שאתה משתמש באימייל הנכון
2. קוד הגישה שלך צריך להגיע ב-WhatsApp מהאדמין
3. ניסיון כניסה ממכשיר אחר יכול לחסום גישה

אם הבעיה נמשכת — צור קשר ישיר.',
  ARRAY['איך מאפסים סיסמה?', 'שלח לאדמין WhatsApp', 'בעיה אחרת'],
  true, 10
),
(
  'בעיה עם מנוי',
  'לגבי מנויים:

• מנוי פג תוקף? — לחץ על "חדש מנוי" בפרופיל שלך
• חיוב שגוי? — שלח פרטים לאדמין
• שדרוג/שינוי חבילה — ניתן דרך עמוד המנויים',
  ARRAY['שדרג מנוי', 'בעיה בתשלום', 'שלח לאדמין WhatsApp'],
  true, 20
),
(
  'מחירים ותוכניות',
  'התוכניות שלנו:

בסיסי — 49 שקל לחודש
3 קבוצות מניות, מחירים בזמן אמת

מקצועי — 99 שקל לחודש
6 קבוצות + AI מתקדם + TradingView

VIP — 199 שקל לחודש
כל הגישות + ייעוץ אישי + קבוצה פרטית',
  ARRAY['איך משדרגים?', 'מה ההבדל בין תוכניות?', 'חזור לתפריט ראשי'],
  true, 30
),
(
  'בעיה טכנית',
  'לפתרון בעיות טכניות:

1. רענן את הדף (F5 או Ctrl+R)
2. נסה דפדפן אחר
3. נקה קוקיז ו-Cache
4. ודא חיבור אינטרנט תקין

אם הבעיה נמשכת — שלח לנו צילום מסך.',
  ARRAY['עדיין לא עובד', 'שלח לאדמין WhatsApp', 'חזור לתפריט ראשי'],
  true, 40
),
(
  'מידע על נתונים',
  'הנתונים בפלטפורמה:

• מחירי מניות מתעדכנים כל 15-30 שניות בזמן מסחר
• ניתוח AI מבוסס על נתונים היסטוריים ומגמות
• פעילות לווייתנים — עסקאות מוסדיות גדולות

חשוב: המידע הינו למטרות מידע בלבד ואינו ייעוץ השקעות.',
  ARRAY['מה זה פעילות לווייתנים?', 'חזור לתפריט ראשי'],
  true, 50
),
(
  'איך מאפסים סיסמה?',
  'לאיפוס סיסמה:

1. לחץ על "שכחתי סיסמה" בדף הכניסה
2. הזן את האימייל הרשום שלך
3. קבל אימייל עם קישור לאיפוס

אם האימייל לא מגיע — בדוק תיקיית ספאם.',
  ARRAY['עדיין לא עובד', 'חזור לתפריט ראשי'],
  false, 60
),
(
  'מה זה פעילות לווייתנים?',
  'פעילות לווייתנים (Whale Activity) מציגה עסקאות גדולות של משקיעים מוסדיים — בנקים, קרנות גידור, חברות ביטוח.

עסקאות כאלה יכולות לרמוז על תנועות שוק עתידיות. זמין מתוכנית בסיסי ומעלה.',
  ARRAY['חזור לתפריט ראשי'],
  false, 70
),
(
  'איך משדרגים?',
  'שדרוג מנוי:

1. לחץ על "מנוי" בסרגל הצד
2. בחר את התוכנית הרצויה
3. השלם תשלום

או שלח לנו WhatsApp ונסייע לך ישירות.',
  ARRAY['שלח לאדמין WhatsApp', 'חזור לתפריט ראשי'],
  false, 80
),
(
  'מה ההבדל בין תוכניות?',
  'ההבדלים העיקריים:

• בסיסי: 3 קבוצות מניות, ניתוח AI בסיסי
• מקצועי: 6 קבוצות, AI מתקדם, TradingView, רשימת מעקב
• VIP: הכל + ייעוץ אישי + קבוצה VIP פרטית + תמיכה 24/7',
  ARRAY['איך משדרגים?', 'חזור לתפריט ראשי'],
  false, 90
),
(
  'בעיה בתשלום',
  'לבעיות תשלום:

• חיוב שגוי — שמור קבלה ושלח לאדמין
• כרטיס נדחה — נסה שיטת תשלום אחרת
• רוצה החזר — נבדוק לפי תנאי השימוש

שלח לנו WhatsApp עם פרטי העסקה.',
  ARRAY['שלח לאדמין WhatsApp', 'חזור לתפריט ראשי'],
  false, 100
),
(
  'עדיין לא עובד',
  'מצטערים לשמוע! הצוות שלנו ישמח לעזור ישירות.

שלח לנו תיאור קצר של הבעיה ב-WhatsApp ונחזור אליך בהקדם.',
  ARRAY['שלח לאדמין WhatsApp'],
  false, 110
),
(
  'בעיה אחרת',
  'אשמח לעזור! בחר נושא מהאפשרויות, או שלח הודעה חופשית.',
  ARRAY['לא מצליח להתחבר', 'בעיה עם מנוי', 'בעיה טכנית', 'שלח לאדמין WhatsApp'],
  false, 120
),
(
  'שדרג מנוי',
  'שדרוג מנוי:

1. לחץ על "מנוי" בסרגל הצד
2. בחר את התוכנית הרצויה
3. השלם תשלום

או שלח לנו WhatsApp ונסייע לך ישירות.',
  ARRAY['שלח לאדמין WhatsApp', 'חזור לתפריט ראשי'],
  false, 130
)
ON CONFLICT DO NOTHING;
