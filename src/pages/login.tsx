import { Lock } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Centered } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice, PasswordInput } from "@/components/ui/form";
import { PageLoader } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { siteLinks } from "@/lib/config";
import type { Me } from "@/lib/types";

/**
 * Only same-app paths are followed after sign-in (open-redirect protection).
 * Pages the person may not open send them to their own home.
 */
function safeNext(value: string | null, user: Me) {
  if (!value?.startsWith("/") || value.startsWith("//") || value === "/login")
    return homeFor(user);
  return value;
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (auth.status === "loading") {
    return (
      <Centered>
        <PageLoader />
      </Centered>
    );
  }
  if (auth.status === "signed-in") {
    return <Navigate to={safeNext(params.get("next"), auth.user)} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const user = await auth.login(
        String(form.get("email") ?? "").trim(),
        String(form.get("password") ?? ""),
      );
      navigate(safeNext(params.get("next"), user), { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Centered>
      <div className="w-full max-w-[420px]">
        <img src="/logo.svg" alt="PickASparky" className="mx-auto h-9 w-auto" />
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-[22px] font-bold">Sign in to your dashboard</h1>
          <p className="mt-1 text-sm">
            For PickASparky installers and the PickASparky team.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {params.get("expired") ? (
              <Notice tone="info">
                Your session ended. Please sign in again.
              </Notice>
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={pending}
              icon={<Lock aria-hidden className="size-4" />}
            >
              Sign in
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between gap-2 text-[13px]">
            <a
              href={siteLinks.forgotPassword}
              className="font-medium text-primary hover:underline"
            >
              Forgotten your password?
            </a>
            <a
              href={siteLinks.join}
              className="font-medium text-primary hover:underline"
            >
              Join as an installer
            </a>
          </div>
        </div>
      </div>
    </Centered>
  );
}