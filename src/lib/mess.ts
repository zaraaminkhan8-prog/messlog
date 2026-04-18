// Pricing & meal-window logic for MessLog @ GIKI.
// Prices: breakfast Rs 350, lunch Rs 560, dinner Rs 560.
// Lunch & dinner are bundled — students cannot opt for one without the other.
// Logging window: before 10:00 AM for today, or after 10:00 PM for tomorrow.

export type Slot = "breakfast" | "lunch" | "dinner";
export type BundleSlot = "breakfast" | "lunch_dinner";

export const SLOT_PRICE: Record<Slot, number> = {
  breakfast: 350,
  lunch: 560,
  dinner: 560,
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

export function activeLoggingDate(now = new Date()): string | null {
  const h = now.getHours();
  if (h < 10) return todayISO(now);
  if (h >= 22) return tomorrowISO(now);
  return null;
}

export function loggingWindowMessage(now = new Date()): string {
  const date = activeLoggingDate(now);
  if (date) return `Logging window open for ${date}`;
  return "Logging window opens after 10:00 PM (for tomorrow)";
}
