"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "./api";

interface User { id: number; name: string; email: string }
interface Ctx { user: User | null; loading: boolean; signIn: (t: string, u: User) => void; signOut: () => void }
const AuthCtx = createContext<Ctx>({ user: null, loading: true, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api<User>("/api/auth/me").then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((t: string, u: User) => { tokenStore.set(t); setUser(u); }, []);
  const signOut = useCallback(() => { tokenStore.clear(); setUser(null); }, []);
  return <AuthCtx.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
