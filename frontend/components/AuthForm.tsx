"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { Button, Field, inputCls } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isReg = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr("");
    if (isReg && f.password.length < 8) return setErr("Use a password with at least 8 characters.");
    setBusy(true);
    try {
      const res = await api<{ access_token: string; user: { id: number; name: string; email: string } }>(`/api/auth/${mode}`, {
        method: "POST", body: JSON.stringify(isReg ? f : { email: f.email, password: f.password }),
      });
      signIn(res.access_token, res.user);
      router.push("/dashboard");
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo light />
        <div>
          <p className="font-display text-5xl font-extrabold leading-tight">Most people forget at least three subscriptions.</p>
          <p className="mt-4 max-w-md text-lg text-white/70">Let Finora keep the list, predict the dates and point out what to cancel.</p>
        </div>
        <p className="text-sm text-white/50">Your data stays yours. Finora never moves money.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="text-4xl font-extrabold">{isReg ? "Create your account" : "Welcome back"}</h1>
          {isReg && <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} autoComplete="name" /></Field>}
          <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" /></Field>
          <Field label="Password" hint={isReg ? "At least 8 characters." : undefined}>
            <input type="password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete={isReg ? "new-password" : "current-password"} />
          </Field>
          {err && <p role="alert" className="rounded-xl bg-rose-wash px-3.5 py-2.5 text-sm font-semibold text-rose">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full py-3">{busy ? "Please wait…" : isReg ? "Create account" : "Sign in"}</Button>
          <p className="text-center text-sm text-ink-soft">
            {isReg ? "Already registered? " : "New to Finora? "}
            <Link href={isReg ? "/login" : "/register"} className="font-semibold text-cobalt underline">{isReg ? "Sign in" : "Create an account"}</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
