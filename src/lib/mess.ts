// Pricing & meal-window logic for MessLog @ GIKI.
// Prices: breakfast Rs 350, lunch+dinner combined Rs 560 (Rs 280 each).
// Lunch & dinner are bundled — students cannot opt for one without the other.
// Logging window: before 10:00 AM for today, or after 10:00 PM for tomorrow.

export type Slot = "breakfast" | "lunch" | "dinner";
export type BundleSlot = "breakfast" | "lunch_dinner";

export const SLOT_PRICE: Record<Slot, number> = {
  breakfast: 350,
  lunch: 280,
  dinner: 280,
};

export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const BUNDLE_LABEL: Record<BundleSlot, string> = {
  breakfast: "Breakfast",
  lunch_dinner: "Lunch + Dinner",
};

export const BUNDLE_PRICE: Record<BundleSlot, number> = {
  breakfast: SLOT_PRICE.breakfast,
  lunch_dinner: SLOT_PRICE.lunch + SLOT_PRICE.dinner,
};

export const BUNDLE_SLOTS: Record<BundleSlot, Slot[]> = {
  breakfast: ["breakfast"],
  lunch_dinner: ["lunch", "dinner"],
};

export const BUNDLE_ORDER: BundleSlot[] = ["breakfast", "lunch_dinner"];

export const SLOT_ORDER: Slot[] = ["breakfast", "lunch", "dinner"];

export function formatPKR(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}Rs ${Math.abs(Math.round(n)).toLocaleString("en-PK")}`;
}

// Backward-compat alias used elsewhere in the codebase.
export const formatINR = formatPKR;

export function todayISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function tomorrowISO(d = new Date()) {
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  return todayISO(t);
}

// Logging windows (local time):
//   Lunch + Dinner: open 14:30 → 10:00 (next morning). Targets the upcoming serving day.
//   Breakfast:      open 21:00 → 07:00 (next morning). Targets the next morning.
// Outside the window, logging is closed for that bundle.

function minsNow(now: Date) {
  return now.getHours() * 60 + now.getMinutes();
}

export function isBundleWindowOpen(bundle: BundleSlot, now = new Date()): boolean {
  const m = minsNow(now);
  if (bundle === "lunch_dinner") {
    // 14:30 (870) → 10:00 next day (600). Open if m >= 870 OR m < 600.
    return m >= 14 * 60 + 30 || m < 10 * 60;
  }
  // breakfast: 21:00 (1260) → 07:00 next day (420)
  return m >= 21 * 60 || m < 7 * 60;
}

export function bundleLoggingDate(bundle: BundleSlot, now = new Date()): string {
  const m = minsNow(now);
  if (bundle === "lunch_dinner") {
    // After 14:30 → tomorrow's lunch+dinner. Before 10:00 AM → today's.
    return m >= 14 * 60 + 30 ? tomorrowISO(now) : todayISO(now);
  }
  // breakfast: evening window (>=21:00) targets tomorrow; early morning targets today.
  return m >= 21 * 60 ? tomorrowISO(now) : todayISO(now);
}

export function bundleWindowLabel(bundle: BundleSlot): string {
  return bundle === "lunch_dinner" ? "2:30 PM – 10:00 AM" : "9:00 PM – 7:00 AM";
}

// Kept for compatibility.
export function activeLoggingDate(now = new Date()): string {
  return bundleLoggingDate("lunch_dinner", now);
}

export function loggingWindowMessage(): string {
  return `Lunch + Dinner: 2:30 PM–10:00 AM · Breakfast: 9:00 PM–7:00 AM.`;
}
