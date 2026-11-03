"use client";
import Script from "next/script";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Razorpay: any } }

export function UpgradeButton({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  async function pay() {
    try {
      const o = await api<{ order_id: string; amount: number; currency: string; key_id: string }>("/api/billing/create-order", { method: "POST" });
      const rzp = new window.Razorpay({
        key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id,
        name: "Finora", description: "Finora Pro", theme: { color: "#2747f5" },
        prefill: { name: user?.name, email: user?.email },
        handler: async (r: object) => {
          await api("/api/billing/verify", { method: "POST", body: JSON.stringify(r) });
          onDone?.();
        },
      });
      rzp.open();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Payment could not start.");
    }
  }
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Button onClick={pay}>Upgrade to Pro · ₹149</Button>
    </>
  );
}