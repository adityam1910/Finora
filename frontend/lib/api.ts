export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Cycle = "weekly" | "monthly" | "quarterly" | "yearly";
export const CATEGORIES = ["Entertainment", "Music", "Productivity", "Cloud", "Fitness", "Education", "Insurance", "Finance", "News", "Gaming", "Utilities", "Other"];

export interface Subscription {
  id: number; service_name: string; category: string; amount: number; billing_cycle: Cycle;
  next_due_date: string; usage_per_month: number | null; last_used_date: string | null;
  price_hike_pct: number; members: number; status: string; start_date: string;
}
export type SubscriptionInput = Omit<Subscription, "id" | "status" | "start_date">;

export interface Assessment {
  subscription_id: number; service_name: string; verdict: "cancel" | "review" | "keep" | "needs_data";
  waste_probability: number | null; monthly_saving: number; reasons: string[]; alternative: string | null;
}
export interface Renewal {
  subscription_id: number; service_name: string; amount: number; due_date: string; days_left: number;
  prediction: { predicted_date: string | null; confidence: number; method: string } | null;
}
export interface Insights {
  summary: { active_count: number; monthly_total: number; yearly_total: number; potential_monthly_saving: number; potential_yearly_saving: number; due_in_7_days: number };
  by_category: { category: string; monthly: number }[];
  forecast: { months: string[]; current: number[]; optimised: number[] };
  assessments: Assessment[]; flagged: Assessment[];
  overlaps: { category: string; services: string[]; monthly_cost: number; tip: string }[];
  renewals: Renewal[];
}
export interface Detection {
  is_subscription: boolean; confidence: number; message: string; missing_fields: string[];
  fields: { service_name: string | null; category: string; amount: number | null; billing_cycle: Cycle; next_due_date: string | null };
}
export interface Metrics {
  detector: Record<string, number | string>;
  cost_model: Record<string, number | string | Record<string, number>>;
}

const TOKEN_KEY = "finora_token";
export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the Finora server. Check that the backend is running.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: { msg: string }) => d.msg).join(", ") : "Something went wrong.";
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const inr = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const dueLabel = (days: number) =>
  days < 0 ? `${-days}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
