import { dueLabel, fmtDate, inr, type Renewal } from "@/lib/api";

export function RenewalTape({ items, total, animate = false, title = "Coming up" }: { items: Renewal[]; total?: number; animate?: boolean; title?: string }) {
  const sum = total ?? items.reduce((s, r) => s + r.amount, 0);
  return (
    <div className={`tape px-6 py-7 shadow-sm ${animate ? "tape-print" : ""}`}>
      <div className="flex items-baseline justify-between pb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-sm text-ink-soft">{items.length} charges</span>
      </div>
      <ul>
        {items.map((r) => (
          <li key={r.subscription_id} className="tape-row flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.service_name}</p>
              <p className={`text-sm ${r.days_left <= 3 ? "font-semibold text-rose" : "text-ink-soft"}`}>
                {dueLabel(r.days_left)} <span className="text-ink-soft font-normal">· {fmtDate(r.due_date)}</span>
              </p>
            </div>
            <p className="shrink-0 font-bold">{inr(r.amount)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-ink pt-4">
        <span className="font-semibold">Total due</span>
        <span className="font-display text-2xl font-extrabold">{inr(sum)}</span>
      </div>
    </div>
  );
}
