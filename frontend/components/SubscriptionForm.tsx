"use client";
import { useState, type FormEvent } from "react";
import { CATEGORIES, type Cycle, type SubscriptionInput } from "@/lib/api";
import { Button, Field, inputCls } from "./ui";

const todayPlus = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
export const blankSub = (): SubscriptionInput => ({
  service_name: "", category: "Entertainment", amount: 0, billing_cycle: "monthly", next_due_date: todayPlus(30),
  usage_per_month: null, last_used_date: null, price_hike_pct: 0, members: 1,
});

export function SubscriptionForm({ initial, onSave, onCancel, saving }: { initial: SubscriptionInput; onSave: (v: SubscriptionInput) => void; onCancel: () => void; saving: boolean }) {
  const [v, setV] = useState<SubscriptionInput>(initial);
  const [err, setErr] = useState("");
  const set = <K extends keyof SubscriptionInput>(k: K, val: SubscriptionInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s === "" ? null : Number(s));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.service_name.trim()) return setErr("Enter the service name.");
    if (!(v.amount > 0)) return setErr("Enter an amount greater than 0.");
    if (!v.next_due_date) return setErr("Pick the next due date.");
    setErr(""); onSave({ ...v, service_name: v.service_name.trim() });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Service name"><input className={inputCls} value={v.service_name} onChange={(e) => set("service_name", e.target.value)} placeholder="Netflix" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (₹)"><input type="number" min="0" step="0.01" className={inputCls} value={v.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} placeholder="649" /></Field>
        <Field label="Billed"><select className={inputCls} value={v.billing_cycle} onChange={(e) => set("billing_cycle", e.target.value as Cycle)}>
          {["weekly", "monthly", "quarterly", "yearly"].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></Field>
        <Field label="Category"><select className={inputCls} value={v.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Next due date"><input type="date" className={inputCls} value={v.next_due_date} onChange={(e) => set("next_due_date", e.target.value)} /></Field>
      </div>
      <div className="rounded-2xl bg-cobalt-wash/60 p-4">
        <p className="mb-3 text-sm font-semibold">Help Finora judge value <span className="font-normal text-ink-soft">(optional)</span></p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Uses per month"><input type="number" min="0" className={inputCls} value={v.usage_per_month ?? ""} onChange={(e) => set("usage_per_month", num(e.target.value))} placeholder="8" /></Field>
          <Field label="Last used"><input type="date" className={inputCls} value={v.last_used_date ?? ""} onChange={(e) => set("last_used_date", e.target.value || null)} /></Field>
          <Field label="Price rise since signup (%)"><input type="number" min="0" className={inputCls} value={v.price_hike_pct || ""} onChange={(e) => set("price_hike_pct", Number(e.target.value))} placeholder="0" /></Field>
          <Field label="People sharing"><input type="number" min="1" className={inputCls} value={v.members} onChange={(e) => set("members", Math.max(1, Number(e.target.value)))} /></Field>
        </div>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-rose">{err}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save subscription"}</Button>
      </div>
    </form>
  );
}
