"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { api, inr, type Detection } from "@/lib/api";

const samples = [
  "Your Netflix subscription of Rs.649 will renew on 15 Nov 2026. Manage your plan anytime.",
  "Auto-debit of ₹1,999 for ChatGPT Plus scheduled on 2026-11-20. Maintain balance to avoid failure.",
  "482913 is your one time password for login. Do not share it with anyone.",
];

export default function DetectPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [res, setRes] = useState<Detection | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await api<Detection>("/api/detect", { method: "POST", body: JSON.stringify({ text }) })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Detection failed."); } finally { setBusy(false); }
  }
  function useResult() {
    if (!res) return;
    const f = res.fields;
    const q = new URLSearchParams({ name: f.service_name ?? "", amount: String(f.amount ?? ""), category: f.category, cycle: f.billing_cycle });
    if (f.next_due_date) q.set("due", f.next_due_date);
    router.push(`/dashboard/subscriptions?${q}`);
  }

  return (
    <div className="mt-4 max-w-3xl">
      <h1 className="text-4xl font-extrabold">Detect from email or SMS</h1>
      <p className="mt-1 text-ink-soft">Paste a billing message. Finora checks whether it is a recurring payment and pulls out the details. Nothing is stored until you save it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste an email or SMS here…" className="mt-6 w-full rounded-2xl border border-line bg-paper p-4 text-sm focus:border-cobalt focus:outline-none" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={busy || text.trim().length < 5}>{busy ? "Reading…" : "Analyse message"}</Button>
        <span className="text-sm text-ink-soft">Try:</span>
        {samples.map((s, i) => <button key={i} onClick={() => setText(s)} className="rounded-lg bg-cobalt-wash px-2.5 py-1 text-xs font-semibold text-cobalt-deep hover:bg-[#d3dbff]">Sample {i + 1}</button>)}
      </div>
      {err && <p role="alert" className="mt-4 font-semibold text-rose">{err}</p>}
      {res && (
        <Card className="mt-6">
          <div className="flex items-center gap-3">
            {res.is_subscription ? <CheckCircle2 className="text-mint" size={28} /> : <XCircle className="text-rose" size={28} />}
            <div><p className="text-lg font-bold">{res.message}</p><p className="text-sm text-ink-soft">Model confidence {Math.round(res.confidence * 100)}%</p></div>
          </div>
          {res.is_subscription && (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[["Service", res.fields.service_name], ["Amount", res.fields.amount ? inr(res.fields.amount) : null], ["Billed", res.fields.billing_cycle], ["Next due", res.fields.next_due_date]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-xs text-ink-soft">{k}</dt><dd className={`font-semibold ${v ? "" : "text-rose"}`}>{v ?? "Not found"}</dd></div>))}
              </dl>
              {res.missing_fields.length > 0 && <p className="mt-3 text-sm text-ink-soft">Some details weren&apos;t found. You can fill them in on the next screen.</p>}
              <Button className="mt-5" onClick={useResult}>Review and add</Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
