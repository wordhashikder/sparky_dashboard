import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Centered } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/states";
import { homeFor, useAuth } from "@/lib/auth";
import { authApi } from "@/lib/endpoints";
import type { AccessSession } from "@/lib/types";

/*
 * One code, one use: React may run the effect twice in development, and the
 * second attempt would burn the code, so attempts are shared per code.
 */
const attempts = new Map<string, Promise<AccessSession>>();

function exchange(code: string) {
  let attempt = attempts.get(code);
  if (!attempt) {
    attempt = authApi.handoff(code);
    attempts.set(code, attempt);
  }
  return attempt;
}

/**
 * Where the public website sends an installer after they sign in there. The
 * address carries a one-minute, single-use code; it is traded for a Dashboard
 * session and the person lands on their Dashboard without signing in again.
 */
export function SsoPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code") ?? "";
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Wait for the first session check so it cannot overwrite the new session.
    if (auth.status === "loading" || started.current) return;
    started.current = true;
    if (!code) {
      setFailed(true);
      return;
    }
    exchange(code)
      .then((session) => {
        auth.adopt(session);
        navigate(homeFor(session.user), { replace: true });
      })
      .catch(() => setFailed(true));
  }, [auth, code, navigate]);

  if (failed) {
    // A session that already exists is still good: just open it.
    if (auth.status === "signed-in") return <Navigate to="/" replace />;
    return (
      <Centered>
        <div className="w-full max-w-[420px] text-center">
          <img
            src="/logo.svg"
            alt="PickASparky"
            className="mx-auto h-9 w-auto"
          />
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-[22px] font-bold">
              That sign-in link has expired
            </h1>
            <p className="mt-2 text-sm">
              It only works once, for a minute. Sign in to open your dashboard.
            </p>
            <ButtonLink to="/login" size="lg" className="mt-6 w-full">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <PageLoader label="Opening your dashboard…" />
    </Centered>
  );
}
