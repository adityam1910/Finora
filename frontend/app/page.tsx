import Link from "next/link";
import { BellRing, Brain, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RenewalTape } from "@/components/RenewalTape";
import type { Renewal } from "@/lib/api";

const sample: Renewal[] = [
  { subscription_id: 1, service_name: "Spotify", amount: 119, due_date: "2026-11-02", days_left: 1, prediction: null },
  { subscription_id: 2, service_name: "Netflix", amount: 649, due_date: "2026-11-04", days_left: 3, prediction: null },
  { subscription_id: 3, service_name: "ChatGPT Plus", amount: 1999, due_date: "2026-11-07", days_left: 6, prediction: null },
  { subscription_id: 4, service_name: "Cult.fit", amount: 1500, due_date: "2026-11-06", days_left: 5, prediction: null },
  { subscription_id: 5, service_name: "Notion", amount: 800, due_date: "2026-11-23", days_left: 22, prediction: null },
];

const features = [
  { icon: Brain, t: "Predicts every renewal", d: "A regression model learns each service's real billing rhythm, so odd cycles and shifted dates don't catch you out." },
  { icon: Sparkles, t: "Finds money you're wasting", d: "A boosted-tree model scores each plan on cost per use, idle days and price rises, then tells you why in plain words." },
  { icon: BellRing, t: "Reminds you in time", d: "Alerts three days, one day and on the day, before the charge lands." },
  { icon: ShieldCheck, t: "You stay in control", d: "No bank login, no inbox access needed. Finora never pays or cancels for you." },
];

export default function Landing() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/login" className="rounded-xl px-4 py-2 hover:bg-paper">Sign in</Link>
          <Link href="/register" className="rounded-xl bg-ink px-4 py-2 text-white hover:bg-cobalt-deep">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">Know what leaves your account before it does.</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Finora gathers your OTT plans, gym fees, EMIs and premiums in one place, predicts each renewal, and points out the subscriptions that aren&apos;t earning their keep.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-cobalt px-6 py-3.5 font-semibold text-white hover:bg-cobalt-deep">Create free account</Link>
            <Link href="/login" className="rounded-xl border border-line bg-paper px-6 py-3.5 font-semibold hover:bg-white/60">I already have one</Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Tip: after signing up, load the demo data to see every feature working.</p>
        </div>
        <div className="mx-auto w-full max-w-sm lg:rotate-2">
          <RenewalTape items={sample} animate title="This week" />
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-px px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {features.map(({ icon: I, t, d }) => (
            <div key={t}>
              <I className="mb-4 text-cobalt" size={26} />
              <h2 className="text-xl font-bold">{t}</h2>
              <p className="mt-2 text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-ink-soft">
        Finora · B.Tech project, Department of Computer and Communication Engineering, Manipal University Jaipur
      </footer>
    </main>
  );
}
