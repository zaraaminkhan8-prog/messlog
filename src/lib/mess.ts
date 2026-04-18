// Pricing & meal-window logic for MessLog.
// Prices: breakfast ₹350, lunch ₹560, dinner ₹560.
// Logging window: a meal for date D is opt-in until either
//   - 10:00 on D (for breakfast/lunch/dinner the same day-before rule)
// Per spec: "before 10am or after 10pm for the next day".
// We interpret it as: to log meals for date D you must do so
// either before 10:00 on D (same day morning) OR after 22:00 on D-1.

export type Slot = "breakfast" | "lunch" | "dinner";

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

export const SLOT_ORDER: Slot[] = ["breakfast", "lunch", "dinner"];

export function formatINR(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(n))}`;
}

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

// Returns the date (ISO) you can currently log for, or null if outside window.
export function activeLoggingDate(now = new Date()): string | null {
  const h = now.getHours();
  if (h < 10) return todayISO(now); // before 10am — log for today
  if (h >= 22) return tomorrowISO(now); // after 10pm — log for tomorrow
  return null;
}

export function loggingWindowMessage(now = new Date()): string {
  const date = activeLoggingDate(now);
  if (date) return `Logging window open for ${date}`;
  return "Logging window opens after 10:00 PM (for tomorrow)";
}
