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

// Breakfast: log/cancel anytime, no surcharge. Targets today's date.
// Lunch+Dinner: log anytime; before 14:30 counts for today, 14:30+ rolls to tomorrow.
export function bundleLoggingDate(bundle: BundleSlot, now = new Date()): string {
  if (bundle === "breakfast") return todayISO(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 14 * 60 + 30 ? tomorrowISO(now) : todayISO(now);
}

// Kept for compatibility — lunch+dinner cutoff drives the "active" date.
export function activeLoggingDate(now = new Date()): string {
  return bundleLoggingDate("lunch_dinner", now);
}

export function loggingWindowMessage(now = new Date()): string {
  const ld = bundleLoggingDate("lunch_dinner", now);
  return `Lunch + Dinner logs apply to ${ld}. Breakfast can be logged anytime, no surcharge.`;
}
