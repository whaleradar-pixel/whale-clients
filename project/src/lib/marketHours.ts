/**
 * NYSE/NASDAQ market hours calculator.
 * All logic is based on US Eastern Time (America/New_York).
 * Regular session: 09:30 – 16:00 ET, Mon–Fri, excluding US market holidays.
 */

// Returns a Date object set to midnight ET on a given year/month(1-based)/day
function etDate(year: number, month: number, day: number): Date {
  // We use a UTC string that we know is midnight in ET during standard time.
  // Instead we just use Intl to determine the ET offset at any given moment.
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`);
}

// Get the ET hour/minute for a given UTC Date
function toET(date: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    weekday: weekdayMap[get('weekday')] ?? -1,
  };
}

// Get Israel time string for a given UTC Date
function toILTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} IL`;
}

// nth weekday of a month in a year (e.g. 3rd Monday of January)
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getMonth() !== month - 1) break;
    if (dt.getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return 1;
}

// Last weekday of a month
function lastWeekday(year: number, month: number, weekday: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = daysInMonth; d >= 1; d--) {
    if (new Date(year, month - 1, d).getDay() === weekday) return d;
  }
  return 1;
}

// NYSE official holidays for a given year (returns Set of "YYYY-MM-DD" strings in ET)
function getNYSEHolidays(year: number): Set<string> {
  const holidays: Set<string> = new Set();

  const add = (m: number, d: number) => {
    const dt = new Date(year, m - 1, d);
    // Observed rule: if holiday falls on Saturday → Friday; if Sunday → Monday
    const day = dt.getDay();
    let observed = d;
    if (day === 6) observed = d - 1;
    else if (day === 0) observed = d + 1;
    holidays.add(`${year}-${String(m).padStart(2, '0')}-${String(new Date(year, m - 1, observed).getDate()).padStart(2, '0')}`);
  };

  // New Year's Day – Jan 1
  add(1, 1);

  // Martin Luther King Jr. Day – 3rd Monday of January
  add(1, nthWeekday(year, 1, 1, 3));

  // Presidents' Day – 3rd Monday of February
  add(2, nthWeekday(year, 2, 1, 3));

  // Good Friday – Friday before Easter
  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  holidays.add(
    `${goodFriday.getFullYear()}-${String(goodFriday.getMonth() + 1).padStart(2, '0')}-${String(goodFriday.getDate()).padStart(2, '0')}`
  );

  // Memorial Day – last Monday of May
  add(5, lastWeekday(year, 5, 1));

  // Juneteenth – June 19
  add(6, 19);

  // Independence Day – July 4
  add(7, 4);

  // Labor Day – 1st Monday of September
  add(9, nthWeekday(year, 9, 1, 1));

  // Thanksgiving – 4th Thursday of November
  add(11, nthWeekday(year, 11, 4, 4));

  // Christmas – Dec 25
  add(12, 25);

  return holidays;
}

// Computus algorithm for Easter (Gregorian)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// NYSE early-close days (1:00 PM ET): day before Independence Day, Thanksgiving, Christmas
function getNYSEEarlyCloseDays(year: number): Set<string> {
  const early: Set<string> = new Set();

  const addEarlyClose = (m: number, d: number) => {
    const dt = new Date(year, m - 1, d);
    const day = dt.getDay();
    // If falls on weekend, no early close that week
    if (day === 0 || day === 6) return;
    early.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  // July 3 (day before Independence Day) — unless July 4 is observed on a different day
  addEarlyClose(7, 3);

  // Day before Thanksgiving (Wednesday)
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  addEarlyClose(11, thanksgiving - 1);

  // Christmas Eve (Dec 24)
  addEarlyClose(12, 24);

  return early;
}

export type MarketStatus =
  | 'open'          // Regular session 09:30–16:00
  | 'early_close'   // Early close day, currently open (before 13:00)
  | 'pre_market'    // 04:00–09:30
  | 'after_hours'   // 16:00–20:00
  | 'closed_holiday'
  | 'closed_weekend'
  | 'closed_today'; // Closed, weekday, not holiday (shouldn't happen normally)

export interface MarketInfo {
  status: MarketStatus;
  isOpen: boolean;
  label: string;          // Short Hebrew label shown in UI
  detail: string;         // Longer Hebrew explanation
  nextOpen: string;       // Hebrew: when market opens next
  etTime: string;         // Current ET time formatted
  ilTime: string;         // Current Israel time formatted
  nextEventLabel: string; // e.g. "סגירה בעוד 2:15"
  minutesToEvent: number; // minutes until next status change
}

export function getMarketInfo(now: Date = new Date()): MarketInfo {
  const et = toET(now);
  const dateKey = `${et.year}-${String(et.month).padStart(2, '0')}-${String(et.day).padStart(2, '0')}`;
  const holidays = getNYSEHolidays(et.year);
  const earlyClose = getNYSEEarlyCloseDays(et.year);
  const isHoliday = holidays.has(dateKey);
  const isWeekend = et.weekday === 0 || et.weekday === 6;
  const isEarlyCloseDay = earlyClose.has(dateKey);
  const etMinutes = et.hour * 60 + et.minute;

  const OPEN = 9 * 60 + 30;   // 09:30
  const CLOSE = isEarlyCloseDay ? 13 * 60 : 16 * 60; // 13:00 or 16:00
  const PRE_START = 4 * 60;   // 04:00
  const AFTER_END = 20 * 60;  // 20:00

  const fmtET = `${String(et.hour).padStart(2, '0')}:${String(et.minute).padStart(2, '0')} ET`;
  const ilTime = toILTime(now);
  const weekdayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const minsUntil = (target: number) => {
    const diff = target - etMinutes;
    return diff >= 0 ? diff : diff + 24 * 60;
  };

  const fmtMins = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min} דק'`;
    if (min === 0) return `${h} שע'`;
    return `${h}:${String(min).padStart(2, '0')} שע'`;
  };

  if (isWeekend) {
    const daysToMonday = et.weekday === 6 ? 2 : 1;
    return {
      status: 'closed_weekend',
      isOpen: false,
      label: 'סגור — סוף שבוע',
      detail: `NYSE סגור בסופ"ש. נפתח ביום ${weekdayNames[1]} בשעה 09:30 ET`,
      nextOpen: `יום ${weekdayNames[1]} 09:30 ET`,
      etTime: fmtET,
      ilTime,
      nextEventLabel: `פתיחה בעוד ${daysToMonday} ימים`,
      minutesToEvent: daysToMonday * 24 * 60 - etMinutes + OPEN,
    };
  }

  if (isHoliday) {
    return {
      status: 'closed_holiday',
      isOpen: false,
      label: 'סגור — חג אמריקאי',
      detail: 'NYSE סגור היום עקב חג פדרלי. נפתח ביום המסחר הבא ב-09:30 ET',
      nextOpen: 'יום המסחר הבא 09:30 ET',
      etTime: fmtET,
      ilTime,
      nextEventLabel: 'סגור כל היום',
      minutesToEvent: 0,
    };
  }

  // Weekday, not holiday
  if (etMinutes >= PRE_START && etMinutes < OPEN) {
    const mins = minsUntil(OPEN);
    return {
      status: 'pre_market',
      isOpen: false,
      label: 'פרה-מרקט',
      detail: `מסחר פרה-מרקט פעיל. הפתיחה הרשמית (NYSE) ב-09:30 ET`,
      nextOpen: `09:30 ET היום`,
      etTime: fmtET,
      ilTime,
      nextEventLabel: `פתיחה בעוד ${mins}`,
      minutesToEvent: minsUntil(OPEN),
    };
  }

  if (etMinutes >= OPEN && etMinutes < CLOSE) {
    const mins = minsUntil(CLOSE);
    const label = isEarlyCloseDay ? 'פתוח — סגירה מוקדמת 13:00' : 'פתוח — מסחר פעיל';
    return {
      status: isEarlyCloseDay ? 'early_close' : 'open',
      isOpen: true,
      label,
      detail: isEarlyCloseDay
        ? `יום סגירה מוקדמת ב-NYSE. הפגישה מסתיימת ב-13:00 ET`
        : `NYSE/NASDAQ פתוחים. מסחר רשמי עד 16:00 ET`,
      nextOpen: 'פתוח כעת',
      etTime: fmtET,
      ilTime,
      nextEventLabel: `סגירה בעוד ${mins}`,
      minutesToEvent: minsUntil(CLOSE),
    };
  }

  if (etMinutes >= CLOSE && etMinutes < AFTER_END) {
    const mins = minsUntil(AFTER_END);
    return {
      status: 'after_hours',
      isOpen: false,
      label: 'אחרי שעות — After Hours',
      detail: `המסחר הרשמי הסתיים ב-${isEarlyCloseDay ? '13:00' : '16:00'} ET. מסחר After Hours פעיל עד 20:00 ET`,
      nextOpen: 'מחר 09:30 ET',
      etTime: fmtET,
      ilTime,
      nextEventLabel: `After Hours נגמר בעוד ${mins}`,
      minutesToEvent: minsUntil(AFTER_END),
    };
  }

  // Before pre-market (00:00–04:00) or after after-hours (20:00–24:00)
  const minsToPreMarket = etMinutes < PRE_START ? PRE_START - etMinutes : (24 * 60 - etMinutes + PRE_START);
  return {
    status: 'closed_today',
    isOpen: false,
    label: 'סגור',
    detail: 'השוק סגור. פרה-מרקט מתחיל ב-04:00 ET',
    nextOpen: `04:00 ET (פרה-מרקט)`,
    etTime: fmtET,
    ilTime,
    nextEventLabel: `פרה-מרקט בעוד ${fmtMins(minsToPreMarket)}`,
    minutesToEvent: minsToPreMarket,
  };
}
