import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/endpoints";

const POLICY = "At least 10 characters, with a letter and a number.";

/** Change your own password. Other devices are signed out; this one stays in. */
export function ChangePasswordCard() {
  const { adopt } = useAuth();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = useMutation({
    mutationFn: (values: { current: string; next: string }) =>
      authApi.changePassword(values.current, values.next),
    onSuccess: (session) => {
      adopt(session);
      form.current?.reset();
      setErrors({});
      toast.success(
        "Password changed. Your other devices have been signed out.",
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) {
        setErrors({
          current: error.fields.current_password ?? "",
          next: error.fields.new_password ?? "",
        });
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't change the password.",
        );
      }
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const found: Record<string, string> = {};
    if (!current) found.current = "Enter your current password.";
    if (next.length < 10 || !/\p{L}/u.test(next) || !/\p{Nd}/u.test(next))
      found.next = POLICY;
    if (next !== confirm) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (!Object.keys(found).length) change.mutate({ current, next });
  }

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Use a password you don't use anywhere else."
      />
      <CardBody>
        <form
          ref={form}
          onSubmit={onSubmit}
          className="grid max-w-xl gap-4"
          noValidate
        >
          <Field
            label="Current password"
            htmlFor="pw-current"
            error={errors.current}
          >
            <Input
              id="pw-current"
              name="current"
              type="password"
              autoComplete="current-password"
            />
          </Field>
          <Field
            label="New password"
            htmlFor="pw-next"
            error={errors.next}
            hint={POLICY}
          >
            <Input
              id="pw-next"
              name="next"
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Confirm new password"
            htmlFor="pw-confirm"
            error={errors.confirm}
          >
            <Input
              id="pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <div>
            <Button type="submit" loading={change.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
