"use client";
import { CheckCheck, Pencil, Plus, Trash2, Ban } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { blankSub, SubscriptionForm } from "@/components/SubscriptionForm";
import { Button, Empty, Modal } from "@/components/ui";
import { api, dueLabel, fmtDate, inr, type Subscription, type SubscriptionInput } from "@/lib/api";

const daysUntil = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);

function SubscriptionsInner() {
  const params = useSearchParams();
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [adding, setAdding] = useState<SubscriptionInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(() => api<Subscription[]>("/api/subscriptions").then(setSubs).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (params.get("name")) setAdding({ ...blankSub(), service_name: params.get("name") ?? "", amount: Number(params.get("amount") ?? 0), category: params.get("category") ?? "Other",
      billing_cycle: (params.get("cycle") as SubscriptionInput["billing_cycle"]) ?? "monthly", next_due_date: params.get("due") ?? blankSub().next_due_date });
  }, [params]);

  async function save(v: SubscriptionInput) {
    setSaving(true); setError("");
    try {
      await api(editing ? `/api/subscriptions/${editing.id}` : "/api/subscriptions", { method: editing ? "PUT" : "POST", body: JSON.stringify(v) });
      setEditing(null); setAdding(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save."); } finally { setSaving(false); }
  }
  const act = async (path: string, method = "POST", body?: object) => { await api(path, { method, body: body ? JSON.stringify(body) : undefined }).catch((e) => setError(e.message)); load(); };

  const list = (subs ?? []).filter((s) => showCancelled || s.status === "active");
  return (
    <div className="mt-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-extrabold">Subscriptions</h1><p className="text-ink-soft">Everything that bills you on a schedule.</p></div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />Show cancelled</label>
          <Button onClick={() => setAdding(blankSub())}><Plus size={16} />Add subscription</Button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-wash p-3 text-sm font-semibold text-rose">{error}</p>}
      {subs && list.length === 0 && <Empty title="Nothing here yet" body="Add a subscription by hand, or paste a billing email on the Detect page." action={<Button onClick={() => setAdding(blankSub())}>Add subscription</Button>} />}
      <ul className="space-y-3">
        {list.map((s) => {
          const d = daysUntil(s.next_due_date);
          return (
            <li key={s.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper p-4 ${s.status !== "active" ? "opacity-55" : ""}`}>
              <div className="min-w-[160px] flex-1">
                <p className="font-bold">{s.service_name} {s.status !== "active" && <span className="ml-1 rounded-md bg-mist px-2 py-0.5 text-xs">Cancelled</span>}</p>
                <p className="text-sm text-ink-soft">{s.category} · {s.billing_cycle}{s.members > 1 ? ` · split ${s.members} ways` : ""}</p>
              </div>
              <div className="w-28 text-right"><p className="font-bold">{inr(s.amount)}</p>{s.members > 1 && <p className="text-xs text-ink-soft">{inr(s.amount / s.members)} each</p>}</div>
              <div className="w-36"><p className={`text-sm font-semibold ${d <= 3 && s.status === "active" ? "text-rose" : ""}`}>{dueLabel(d)}</p><p className="text-xs text-ink-soft">{fmtDate(s.next_due_date)}</p></div>
              {s.status === "active" && (
                <div className="flex gap-1.5">
                  <Button variant="soft" onClick={() => act(`/api/subscriptions/${s.id}/pay`, "POST", { mode_of_payment: "UPI" })} title="I've paid this - move to the next due date"><CheckCheck size={16} />Paid</Button>
                  <Button variant="ghost" aria-label={`Edit ${s.service_name}`} onClick={() => setEditing(s)}><Pencil size={16} /></Button>
                  <Button variant="ghost" aria-label={`Mark ${s.service_name} cancelled`} title="Mark as cancelled (do this after cancelling with the provider)" onClick={() => confirm(`Mark ${s.service_name} as cancelled? Cancel it with the provider too.`) && act(`/api/subscriptions/${s.id}/cancel`)}><Ban size={16} /></Button>
                  <Button variant="danger" aria-label={`Delete ${s.service_name}`} onClick={() => confirm(`Delete ${s.service_name} and its history?`) && act(`/api/subscriptions/${s.id}`, "DELETE")}><Trash2 size={16} /></Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Modal open={!!adding || !!editing} onClose={() => { setAdding(null); setEditing(null); }} title={editing ? `Edit ${editing.service_name}` : "Add subscription"}>
        {(adding || editing) && <SubscriptionForm initial={editing ?? adding!} onSave={save} saving={saving} onCancel={() => { setAdding(null); setEditing(null); }} />}
      </Modal>
    </div>
  );
}

export default function Page() { return <Suspense><SubscriptionsInner /></Suspense>; }
