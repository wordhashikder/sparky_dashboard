import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { ChangePasswordCard } from "@/components/account/change-password";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { staffRoleLabels } from "@/lib/access";
import { useUser } from "@/lib/auth";

/** The signed-in team member's own account. */
export default function AccountPage() {
  const user = useUser();
  return (
    <>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Settings
      </Link>
      <PageHeader title="My account" description="Your sign-in details." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader title="Profile" />
          <CardBody>
            <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-subtle">Name</dt>
              <dd className="text-ink">{user.full_name ?? "—"}</dd>
              <dt className="text-subtle">Email</dt>
              <dd className="break-all text-ink">{user.email}</dd>
              <dt className="text-subtle">Role</dt>
              <dd className="text-ink">
                {user.staff_role ? staffRoleLabels[user.staff_role] : "—"}
              </dd>
            </dl>
            <p className="mt-4 text-xs text-subtle">
              An owner can change your name or role in Users &amp; roles.
            </p>
          </CardBody>
        </Card>
        <ChangePasswordCard />
      </div>
    </>
  );
}
