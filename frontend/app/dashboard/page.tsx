"use client";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RenewalTape } from "@/components/RenewalTape";
import { Button, Card, Empty } from "@/components/ui";
import { useInsights } from "@/components/useInsights";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Overview() {
  const { user } = useAuth();
  const { data, error, refresh } = useInsights();
  const [busy, setBusy] = useState(false);

  async function loadDemo() { setBusy(true); await api("/api/demo/seed", { method: "POST" }).catch(() => {}); await refresh(); setBusy(false); }

  if (error) return <p role="alert" className="mt-10 rounded-xl bg-rose-wash p-4 font-semibold text-rose">{error}</p>;
  if (!data) return <p className="mt-10 text-ink-soft">Loading your overview…</p>;

  const s = data.summary;
  if (s.active_count === 0)
    return (
      <div className="mt-10 max-w-2xl">
        <h1 className="mb-6 text-4xl font-extrabold">Hi {user?.name.split(" ")[0]}</h1>
        <Empty title="No subscriptions yet" body="Add your first one, or load a realistic demo set to see the predictions and savings insights."
          action={<div className="flex gap-3"><Button onClick={loadDemo} disabled={busy}>{busy ? "Loading…" : "Load demo data"}</Button>
            <Link href="/dashboard/subscriptions"><Button variant="ghost">Add manually</Button></Link></div>} />
      </div>
    );

  const chart = data.forecast.months.map((m, i) => ({ month: m, "Current plan": data.forecast.current[i], "After cuts": data.forecast.optimised[i] }));
  const maxCat = Math.max(...data.by_category.map((c) => c.monthly));

  return (
    <div className="space-y-8">
      <div className="mt-4">
        <h1 className="text-4xl font-extrabold">Hi {user?.name.split(" ")[0]}</h1>
        <p className="mt-1 text-ink-soft">You have {s.active_count} active recurring payments{s.due_in_7_days ? `, ${s.due_in_7_days} due this week` : ""}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-ink-soft">Every month</p><p className="font-display mt-1 text-3xl font-extrabold">{inr(s.monthly_total)}</p></Card>
        <Card><p className="text-sm text-ink-soft">Every year</p><p className="font-display mt-1 text-3xl font-extrabold">{inr(s.yearly_total)}</p></Card>
        <Card><p className="text-sm text-ink-soft">Due in 7 days</p><p className="font-display mt-1 text-3xl font-extrabold">{s.due_in_7_days}</p></Card>
        <Link href="/dashboard/insights" className="rounded-2xl bg-mint p-6 text-white transition-transform hover:-translate-y-0.5">
          <p className="text-sm text-white/80">You could save</p>
          <p className="font-display mt-1 text-3xl font-extrabold">{inr(s.potential_yearly_saving)}<span className="text-base font-semibold text-white/80"> / year</span></p>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold">Next six months of charges</h2>
            <p className="mb-4 text-sm text-ink-soft">Projected from each due date and billing cycle, with and without the cuts Finora suggests.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#d9dff0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(Number(v))} cursor={{ fill: "#edf0f7" }} />
                  <Legend />
                  <Bar dataKey="Current plan" fill="#2747f5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="After cuts" fill="#0e9f8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-xl font-bold">Where it goes each month</h2>
            <ul className="space-y-3">
              {data.by_category.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.category}</span><span>{inr(c.monthly)}</span></div>
                  <div className="h-2.5 rounded-full bg-mist"><div className="h-full rounded-full bg-cobalt" style={{ width: `${(c.monthly / maxCat) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <RenewalTape items={data.renewals.slice(0, 6)} title="Coming up" />
          {data.flagged.length > 0 && (
            <Card className="bg-saffron-wash border-saffron/40">
              <p className="font-bold">{data.flagged.length} subscriptions look like poor value</p>
              <p className="mt-1 text-sm">Start with {data.flagged[0].service_name}: {data.flagged[0].reasons[0]}</p>
              <Link href="/dashboard/insights" className="mt-3 inline-block text-sm font-semibold text-cobalt-deep underline">See why and what to do</Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
