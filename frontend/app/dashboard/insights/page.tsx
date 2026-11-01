"use client";
import { useEffect, useState } from "react";
import { Lightbulb, Layers } from "lucide-react";
import { Button, Card, Empty } from "@/components/ui";
import { useInsights } from "@/components/useInsights";
import { api, inr, type Assessment, type Metrics } from "@/lib/api";

const tone = {
  cancel: { label: "Consider cancelling", cls: "bg-rose-wash text-rose", bar: "bg-rose" },
  review: { label: "Worth reviewing", cls: "bg-saffron-wash text-[#9a5b00]", bar: "bg-saffron" },
  keep: { label: "Good value", cls: "bg-mint-wash text-mint", bar: "bg-mint" },
  needs_data: { label: "Needs usage info", cls: "bg-mist text-ink-soft", bar: "bg-line" },
} as const;

function AssessmentCard({ a, onCancel }: { a: Assessment; onCancel: () => void }) {
  const t = tone[a.verdict];
  const pct = Math.round((a.waste_probability ?? 0) * 100);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-xl font-bold">{a.service_name}</h3><span className={`mt-1 inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${t.cls}`}>{t.label}</span></div>
        {a.monthly_saving > 0 && <div className="text-right"><p className="text-sm text-ink-soft">Saves</p><p className="font-display text-2xl font-extrabold text-mint">{inr(a.monthly_saving)}<span className="text-sm font-semibold text-ink-soft">/mo</span></p></div>}
      </div>
      {a.waste_probability !== null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm"><span className="text-ink-soft">Chance this is wasted spend</span><span className="font-bold">{pct}%</span></div>
          <div className="h-2.5 rounded-full bg-mist"><div className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{a.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      {a.alternative && <p className="mt-3 rounded-xl bg-cobalt-wash px-3.5 py-2.5 text-sm"><b>Cheaper way:</b> {a.alternative}</p>}
      {(a.verdict === "cancel" || a.verdict === "review") && (
        <div className="mt-4"><Button variant="ghost" onClick={onCancel}>I cancelled it</Button><span className="ml-3 text-xs text-ink-soft">Finora never cancels for you. Do it with the provider, then mark it here.</span></div>
      )}
    </Card>
  );
}

export default function InsightsPage() {
  const { data, error, refresh } = useInsights();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => { api<Metrics>("/api/model-metrics").then(setMetrics).catch(() => {}); }, []);
  if (error) return <p role="alert" className="mt-10 font-semibold text-rose">{error}</p>;
  if (!data) return <p className="mt-10 text-ink-soft">Analysing your subscriptions…</p>;
  if (data.summary.active_count === 0) return <div className="mt-10"><Empty title="Nothing to analyse yet" body="Add subscriptions (or load the demo data from the Overview) and Finora will score each one." /></div>;

  const order = { cancel: 0, review: 1, needs_data: 2, keep: 3 };
  const sorted = [...data.assessments].sort((a, b) => order[a.verdict] - order[b.verdict] || b.monthly_saving - a.monthly_saving);
  const cm = metrics?.cost_model;
  const fi = cm && typeof cm.feature_importance === "object" ? (cm.feature_importance as Record<string, number>) : null;

  return (
    <div className="mt-4 space-y-8">
      <div className="rounded-3xl bg-ink p-8 text-white">
        <p className="text-white/70">If you act on these suggestions</p>
        <p className="font-display text-5xl font-extrabold">{inr(data.summary.potential_yearly_saving)} <span className="text-xl font-semibold text-white/70">saved per year</span></p>
        <p className="mt-2 max-w-xl text-white/70">Based on how often you use each service, what it costs per use, how long it has sat idle and any price rises.</p>
      </div>

      {data.overlaps.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.overlaps.map((o) => (
            <Card key={o.category} className="border-saffron/40 bg-saffron-wash">
              <div className="flex items-center gap-2 font-bold"><Layers size={18} />Overlapping {o.category.toLowerCase()} services</div>
              <p className="mt-1 text-sm">{o.services.join(", ")}</p><p className="mt-2 text-sm">{o.tip}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">{sorted.map((a) => <AssessmentCard key={a.subscription_id} a={a} onCancel={() => api(`/api/subscriptions/${a.subscription_id}/cancel`, { method: "POST" }).then(refresh)} />)}</div>

      <Card>
        <div className="flex items-center gap-2"><Lightbulb size={20} className="text-cobalt" /><h2 className="text-xl font-bold">How Finora decides</h2></div>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">A gradient-boosted decision-tree model estimates the chance that a plan is wasted spend. Its biggest signals are shown below. Verdicts are suggestions with reasons; you decide what to cancel.</p>
        {fi && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(fi).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <li key={k}><div className="flex justify-between text-sm"><span>{k.replace(/_/g, " ")}</span><span className="font-semibold">{Math.round(v * 100)}%</span></div><div className="h-2 rounded-full bg-mist"><div className="h-full rounded-full bg-cobalt" style={{ width: `${v * 100}%` }} /></div></li>))}</ul>}
        {metrics && <p className="mt-4 text-xs text-ink-soft">Held-out test accuracy {String(cm?.accuracy)} · precision {String(cm?.precision)} · recall {String(cm?.recall)} · email detector F1 {String(metrics.detector.f1)}. Measured on synthetic data.</p>}
      </Card>
    </div>
  );
}
