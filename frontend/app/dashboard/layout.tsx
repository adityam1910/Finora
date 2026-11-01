"use client";
import { Bell, LayoutDashboard, LogOut, Mail, Sparkles, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: WalletCards },
  { href: "/dashboard/insights", label: "AI insights", icon: Sparkles },
  { href: "/dashboard/detect", label: "Detect from email", icon: Mail },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [alerts, setAlerts] = useState<{ message: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (user) api<{ message: string }[]>("/api/notifications").then(setAlerts).catch(() => {}); }, [user, path]);

  if (loading || !user) return <div className="grid min-h-screen place-items-center text-ink-soft">Loading…</div>;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-paper p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center justify-between lg:block"><Logo />
          <div className="flex gap-2 lg:hidden">
            <button onClick={signOut} className="rounded-lg p-2 hover:bg-mist" aria-label="Sign out"><LogOut size={18} /></button>
          </div></div>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-10 lg:flex-col">
          {nav.map(({ href, label, icon: I }) => {
            const on = href === "/dashboard" ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${on ? "bg-cobalt text-white" : "text-ink-soft hover:bg-mist"}`}>
                <I size={18} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden lg:absolute lg:bottom-6 lg:left-6 lg:right-6 lg:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
          <button onClick={() => { signOut(); router.push("/"); }} className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="relative flex justify-end px-6 pt-5 lg:px-10">
          <button onClick={() => setOpen(!open)} className="relative rounded-xl border border-line bg-paper p-2.5 hover:bg-mist" aria-label={`Notifications, ${alerts.length} new`}>
            <Bell size={18} />
            {alerts.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">{alerts.length}</span>}
          </button>
          {open && (
            <div className="absolute right-6 top-16 z-40 w-80 rounded-2xl border border-line bg-paper p-4 shadow-xl lg:right-10">
              <p className="mb-2 font-bold">Reminders</p>
              {alerts.length === 0 ? <p className="text-sm text-ink-soft">Nothing is due in the next 3 days.</p> :
                <ul className="space-y-2">{alerts.map((a, i) => <li key={i} className="rounded-xl bg-saffron-wash px-3 py-2 text-sm font-medium">{a.message}</li>)}</ul>}
            </div>
          )}
        </div>
        <main className="px-6 pb-16 pt-2 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
