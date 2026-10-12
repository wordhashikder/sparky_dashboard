import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router";
import { Centered } from "@/components/layout/app-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/form";
import { PageLoader } from "@/components/ui/states";
import { staffRoleLabels } from "@/lib/access";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/endpoints";

const POLICY = "At least 10 characters, with a letter and a number.";

/** Joining the team from an emailed invitation: set a name and a password. */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const preview = useQuery({
    queryKey: ["invite", token],
    queryFn: () => authApi.invite(token),
    enabled: token.length > 0,
    retry: false,
  });
  const accept = useMutation({
    mutationFn: (values: { password: string; name: string }) =>
      authApi.acceptInvite(token, values.password, values.name || null),
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const found: Record<string, string> = {};
    if (
      password.length < 10 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    )
      found.password = POLICY;
    if (password !== confirm) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    accept.mutate({
      password,
      name: String(form.get("full_name") ?? "").trim(),
    });
  }

  const generalError =
    accept.isError && !(accept.error instanceof ApiError && accept.error.fields)
      ? accept.error instanceof ApiError
        ? accept.error.message
        : "Something went wrong. Please try again."
      : null;

  return (
    <Centered>
      <div className="w-full max-w-[440px]">
        <img src="/logo.svg" alt="PickASparky" className="mx-auto h-9 w-auto" />
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          {!token || preview.isError ? (
            <>
              <h1 className="text-[22px] font-bold">
                This invitation has expired
              </h1>
              <p className="mt-2 text-sm">
                Invitations last 7 days and work once. Ask the person who
                invited you to send a new one.
              </p>
              <ButtonLink to="/login" variant="outline" className="mt-6">
                Go to sign in
              </ButtonLink>
            </>
          ) : preview.isPending ? (
            <PageLoader label="Checking your invitation…" />
          ) : accept.isSuccess ? (
            <div className="text-center">
              <CheckCircle2
                aria-hidden
                className="mx-auto size-12 text-primary"
                strokeWidth={1.5}
              />
              <h1 className="mt-4 text-[22px] font-bold">
                Welcome to the team
              </h1>
              <p className="mt-2 text-sm">
                Sign in with {preview.data.email} and your new password.
              </p>
              <ButtonLink to="/login" size="lg" className="mt-6 w-full">
                Sign in
              </ButtonLink>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-bold">
                Join the PickASparky team
              </h1>
              <p className="mt-1 text-sm">
                You’ve been invited as{" "}
                <strong className="text-ink">
                  {staffRoleLabels[preview.data.staff_role]}
                </strong>{" "}
                with {preview.data.email}.
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                {generalError ? (
                  <Notice tone="error">{generalError}</Notice>
                ) : null}
                <Field
                  label="Your name"
                  htmlFor="full_name"
                  error={errors.full_name}
                >
                  <Input
                    id="full_name"
                    name="full_name"
                    autoComplete="name"
                    defaultValue={preview.data.full_name ?? ""}
                    maxLength={80}
                  />
                </Field>
                <Field
                  label="Password"
                  htmlFor="password"
                  error={errors.password}
                  hint={POLICY}
                >
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-invalid={!!errors.password || undefined}
                  />
                </Field>
                <Field
                  label="Confirm password"
                  htmlFor="confirm"
                  error={errors.confirm}
                >
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-invalid={!!errors.confirm || undefined}
                  />
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={accept.isPending}
                  icon={<UserPlus aria-hidden className="size-4" />}
                >
                  Join the team
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </Centered>
  );
}
