// In-memory mock store for the MessWise demo.
// Persists in localStorage so the demo survives reloads.

import { useSyncExternalStore } from "react";

export type Role = "student" | "guard" | "admin";

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  walletBalance: number; // only meaningful for students
};

export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";

export type Meal = {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  price: number;
  // lifecycle
  status:
    | "messed-in" // default
    | "cancelled-early" // refund 90% / 10% to uni
    | "released" // available for guard during mess time
    | "claimed" // guard ate it: 40% to student, 50% guard pays, 10% uni
    | "consumed"; // student ate
  claimedByGuardId?: string;
  claimedByGuardName?: string;
};

export type Transaction = {
  id: string;
  ts: number;
  userId: string;
  userName: string;
  type:
    | "monthly-credit"
    | "meal-charge"
    | "refund-early"
    | "refund-claimed"
    | "uni-fee"
    | "guard-payment";
  amount: number; // positive = credit to user, negative = debit
  note: string;
  mealId?: string;
};

type State = {
  users: User[];
  meals: Meal[];
  transactions: Transaction[];
  currentUserId: string | null;
  // demo "now" — defaults to real now; admin can shift to test refund logic
  clockOffsetMs: number;
};

const STORAGE_KEY = "messwise:v1";

const MEAL_PRICE: Record<MealSlot, number> = {
  breakfast: 40,
  lunch: 80,
  snacks: 30,
  dinner: 80,
};

const MEAL_TIMES: Record<MealSlot, { startH: number; endH: number }> = {
  breakfast: { startH: 7, endH: 9 },
  lunch: { startH: 12, endH: 14 },
  snacks: { startH: 16, endH: 17 },
  dinner: { startH: 19, endH: 21 },
};

function todayStr(now: Date) {
  return now.toISOString().slice(0, 10);
}

function seed(): State {
  const users: User[] = [
    {
      id: "s1",
      email: "aarav@uni.edu",
      password: "demo",
      name: "Aarav Sharma",
      role: "student",
      walletBalance: 3000,
    },
    {
      id: "s2",
      email: "meera@uni.edu",
      password: "demo",
      name: "Meera Patel",
      role: "student",
      walletBalance: 2750,
    },
    {
      id: "g1",
      email: "guard1@uni.edu",
      password: "demo",
      name: "Ramesh (Gate 2)",
      role: "guard",
      walletBalance: 0,
    },
    {
      id: "a1",
      email: "admin@uni.edu",
      password: "demo",
      name: "Mess Office",
      role: "admin",
      walletBalance: 0,
    },
  ];
  const today = todayStr(new Date());
  const meals: Meal[] = (["breakfast", "lunch", "snacks", "dinner"] as MealSlot[]).flatMap(
    (slot) =>
      users
        .filter((u) => u.role === "student")
        .map<Meal>((s) => ({
          id: `${s.id}-${today}-${slot}`,
          studentId: s.id,
          studentName: s.name,
          date: today,
          slot,
          price: MEAL_PRICE[slot],
          status: "messed-in",
        })),
  );
  const transactions: Transaction[] = users
    .filter((u) => u.role === "student")
    .map((u) => ({
      id: crypto.randomUUID(),
      ts: Date.now() - 1000 * 60 * 60 * 24 * 3,
      userId: u.id,
      userName: u.name,
      type: "monthly-credit" as const,
      amount: 3000,
      note: "Monthly mess wallet credit",
    }));
  return { users, meals, transactions, currentUserId: null, clockOffsetMs: 0 };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as State;
  } catch {
    return seed();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  persist();
}

export const messStore = {
  getState: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    state = seed();
    persist();
  },
  now: () => new Date(Date.now() + state.clockOffsetMs),
  setClockOffsetHours: (h: number) =>
    setState((s) => ({ ...s, clockOffsetMs: h * 60 * 60 * 1000 })),

  login: (email: string, password: string): User | null => {
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) return null;
    setState((s) => ({ ...s, currentUserId: user.id }));
    return user;
  },
  logout: () => setState((s) => ({ ...s, currentUserId: null })),
  currentUser: (): User | null =>
    state.users.find((u) => u.id === state.currentUserId) ?? null,

  mealsForStudent: (studentId: string) =>
    state.meals.filter((m) => m.studentId === studentId).sort((a, b) => a.slot.localeCompare(b.slot)),
  releasedMeals: () => state.meals.filter((m) => m.status === "released"),
  allMeals: () => state.meals,
  transactionsFor: (userId: string) =>
    state.transactions.filter((t) => t.userId === userId).sort((a, b) => b.ts - a.ts),
  allTransactions: () => [...state.transactions].sort((a, b) => b.ts - a.ts),

  mealTime: (slot: MealSlot) => MEAL_TIMES[slot],

  // returns minutes until meal start (negative if started)
  minutesUntilMeal: (meal: Meal): number => {
    const now = messStore.now();
    const start = new Date(now);
    start.setHours(MEAL_TIMES[meal.slot].startH, 0, 0, 0);
    return Math.round((start.getTime() - now.getTime()) / 60000);
  },
  isDuringMealTime: (meal: Meal): boolean => {
    const now = messStore.now();
    const h = now.getHours();
    return h >= MEAL_TIMES[meal.slot].startH && h < MEAL_TIMES[meal.slot].endH;
  },

  // Toggle: student opts out of a meal.
  cancelMeal: (mealId: string): { ok: boolean; message: string } => {
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return { ok: false, message: "Meal not found" };
    if (meal.status !== "messed-in")
      return { ok: false, message: "Meal already processed" };

    const minutesLeft = messStore.minutesUntilMeal(meal);
    const during = messStore.isDuringMealTime(meal);

    if (minutesLeft >= 120) {
      // Early cancel: 90% refund to student, 10% to uni
      const refund = Math.round(meal.price * 0.9);
      const uniFee = meal.price - refund;
      setState((s) => ({
        ...s,
        meals: s.meals.map((m) =>
          m.id === mealId ? { ...m, status: "cancelled-early" } : m,
        ),
        users: s.users.map((u) =>
          u.id === meal.studentId
            ? { ...u, walletBalance: u.walletBalance + refund }
            : u,
        ),
        transactions: [
          {
            id: crypto.randomUUID(),
            ts: Date.now(),
            userId: meal.studentId,
            userName: meal.studentName,
            type: "refund-early",
            amount: refund,
            note: `Early cancel: ${meal.slot} (90% refund)`,
            mealId,
          },
          {
            id: crypto.randomUUID(),
            ts: Date.now(),
            userId: "uni",
            userName: "University",
            type: "uni-fee",
            amount: uniFee,
            note: `Service fee: ${meal.studentName} ${meal.slot}`,
            mealId,
          },
          ...s.transactions,
        ],
      }));
      return {
        ok: true,
        message: `Early cancel — ₹${refund} refunded, ₹${uniFee} service fee`,
      };
    }

    if (during || minutesLeft < 120) {
      // Release for guards
      setState((s) => ({
        ...s,
        meals: s.meals.map((m) =>
          m.id === mealId ? { ...m, status: "released" } : m,
        ),
      }));
      return {
        ok: true,
        message: "Released to guards. You'll get 40% if it's claimed.",
      };
    }
    return { ok: false, message: "Cannot cancel" };
  },

  // Guard claims a released meal
  claimMeal: (mealId: string, guardId: string): { ok: boolean; message: string } => {
    const meal = state.meals.find((m) => m.id === mealId);
    const guard = state.users.find((u) => u.id === guardId);
    if (!meal || !guard) return { ok: false, message: "Not found" };
    if (meal.status !== "released") return { ok: false, message: "Already claimed" };

    const guardPays = Math.round(meal.price * 0.5);
    const studentGets = Math.round(meal.price * 0.4);
    const uniGets = meal.price - guardPays - studentGets; // remainder = 10%

    setState((s) => ({
      ...s,
      meals: s.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              status: "claimed",
              claimedByGuardId: guard.id,
              claimedByGuardName: guard.name,
            }
          : m,
      ),
      users: s.users.map((u) =>
        u.id === meal.studentId
          ? { ...u, walletBalance: u.walletBalance + studentGets }
          : u,
      ),
      transactions: [
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          userId: meal.studentId,
          userName: meal.studentName,
          type: "refund-claimed",
          amount: studentGets,
          note: `${guard.name} claimed your ${meal.slot} (40% back)`,
          mealId,
        },
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          userId: guard.id,
          userName: guard.name,
          type: "guard-payment",
          amount: -guardPays,
          note: `Claimed ${meal.studentName}'s ${meal.slot} (paid 50%)`,
          mealId,
        },
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          userId: "uni",
          userName: "University",
          type: "uni-fee",
          amount: uniGets,
          note: `Service fee: ${meal.slot} claim`,
          mealId,
        },
        ...s.transactions,
      ],
    }));
    return { ok: true, message: `Enjoy your ${meal.slot}, ${guard.name}!` };
  },

  // Admin: simulate end-of-day so messed-in meals charge wallets
  chargeMessedInMeals: () => {
    const today = todayStr(messStore.now());
    const toCharge = state.meals.filter(
      (m) => m.date === today && m.status === "messed-in",
    );
    setState((s) => {
      const userDelta = new Map<string, number>();
      const tx: Transaction[] = [];
      for (const m of toCharge) {
        userDelta.set(m.studentId, (userDelta.get(m.studentId) ?? 0) - m.price);
        tx.push({
          id: crypto.randomUUID(),
          ts: Date.now(),
          userId: m.studentId,
          userName: m.studentName,
          type: "meal-charge",
          amount: -m.price,
          note: `Ate ${m.slot}`,
          mealId: m.id,
        });
      }
      return {
        ...s,
        meals: s.meals.map((m) =>
          toCharge.find((t) => t.id === m.id) ? { ...m, status: "consumed" } : m,
        ),
        users: s.users.map((u) =>
          userDelta.has(u.id)
            ? { ...u, walletBalance: u.walletBalance + (userDelta.get(u.id) ?? 0) }
            : u,
        ),
        transactions: [...tx, ...s.transactions],
      };
    });
    return toCharge.length;
  },
};

export function useMessStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    messStore.subscribe,
    () => selector(messStore.getState()),
    () => selector(messStore.getState()),
  );
}

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};
