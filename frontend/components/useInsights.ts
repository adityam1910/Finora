"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Insights } from "@/lib/api";

export function useInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setData(await api<Insights>("/api/insights")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't load insights."); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, error, refresh };
}
