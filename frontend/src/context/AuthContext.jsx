import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/services";
import { setSessionExpiredHandler } from "../api/client";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cookies survive page refreshes, so asking the server who we are restores the session.
  useEffect(() => {
    let active = true;
    authApi.me()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    setSessionExpiredHandler(() => setUser(null));
    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials) => { const u = await authApi.login(credentials); setUser(u); return u; }, []);
  const register = useCallback(async (payload) => { const u = await authApi.register(payload); setUser(u); return u; }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { setUser(null); } }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, logout, isAdmin: user?.role === "admin" }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
