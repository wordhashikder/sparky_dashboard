import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onSessionExpired, refreshSession, setAccessToken } from "./api";
import { authApi } from "./endpoints";
import type { AccessSession, Me } from "./types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "signed-out"; user: null; expired?: boolean }
  | { status: "signed-in"; user: Me };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
  /** Adopt a session returned by the API (e.g. after a password change). */
  adopt: (session: AccessSession) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Restores the session from the refresh cookie on load and keeps it fresh. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });
  const queryClient = useQueryClient();

  const adopt = useCallback((session: AccessSession) => {
    setAccessToken(session.access_token);
    setState({ status: "signed-in", user: session.user });
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((session) => {
        if (cancelled) return;
        if (session) adopt(session);
        else setState({ status: "signed-out", user: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "signed-out", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  // Renew the access token shortly before it expires while the tab is open.
  useEffect(() => {
    if (state.status !== "signed-in") return;
    const timer = window.setInterval(
      () => {
        refreshSession()
          .then((session) => {
            if (session) setState({ status: "signed-in", user: session.user });
          })
          .catch(() => undefined);
      },
      12 * 60 * 1000,
    );
    return () => window.clearInterval(timer);
  }, [state.status]);

  useEffect(
    () =>
      onSessionExpired(() => {
        setAccessToken(null);
        queryClient.clear();
        setState({ status: "signed-out", user: null, expired: true });
      }),
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      queryClient.clear();
      adopt(session);
      return session.user;
    },
    [adopt, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      queryClient.clear();
      setState({ status: "signed-out", user: null });
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ ...state, login, logout, adopt }),
    [state, login, logout, adopt],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** The signed-in user (only call under a route that requires sign-in). */
export function useUser(): Me {
  const auth = useAuth();
  if (auth.status !== "signed-in") throw new Error("Not signed in");
  return auth.user;
}

export const homeFor = (user: Me) =>
  user.role === "admin" ? "/admin" : "/leads";
