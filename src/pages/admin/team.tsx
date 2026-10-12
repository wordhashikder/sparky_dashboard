import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, MailPlus, RotateCcw, Save, Send, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Notice, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Toggle } from "@/components/ui/switch";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { isOwner, staffRoleLabels } from "@/lib/access";
import { ApiError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { adminApi } from "@/lib/endpoints";
import { formatDate, initials, timeAgo } from "@/lib/format";
import type { Module, RoleMatrix, StaffRole, TeamMember } from "@/lib/types";

const ROLES = Object.keys(staffRoleLabels) as StaffRole[];

export default function TeamPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "roles" ? "roles" : "members";
  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Who is on the PickASparky team, and what each role can see and change in the dashboard."
      />
      <Tabs
        label="Show"
        value={tab}
        onChange={(value) =>
          setParams(value === "members" ? {} : { tab: value })
        }
        tabs={[
          { value: "members", label: "Team members" },
          { value: "roles", label: "Role Matrix" },
        ]}
      />
      {tab === "members" ? <Members /> : <Matrix />}
    </>
  );
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? (Object.values(error.fields ?? {})[0] ?? error.message)
    : fallback;
}

function Members() {
  const user = useUser();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "team"],
    queryFn: adminApi.team,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof adminApi.updateMember>[1];
    }) => adminApi.updateMember(id, body),
    onSuccess: () => {
      void invalidate();
      toast.success("Team member updated.");
    },
    onError: (error) => toast.error(errorText(error, "Couldn't update.")),
  });
  const resend = useMutation({
    mutationFn: adminApi.resendInvite,
    onSuccess: (member) =>
      toast.success(`Invitation sent again to ${member.email}.`),
    onError: (error) => toast.error(errorText(error, "Couldn't send.")),
  });
  const withdraw = useMutation({
    mutationFn: adminApi.withdrawInvite,
    onSuccess: () => {
      void invalidate();
      toast.success("Invitation withdrawn.");
    },
    onError: (error) => toast.error(errorText(error, "Couldn't withdraw.")),
  });

  const owner = isOwner(user);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Team members"
        description="People invited here sign in to this dashboard with their own email and password."
        actions={
          <Button
            onClick={() => setInviting(true)}
            icon={<UserPlus aria-hidden className="size-4" />}
          >
            Invite someone
          </Button>
        }
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No team members yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last sign-in</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {query.data.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManageOwners={owner}
                busy={update.isPending}
                onRole={(staff_role) =>
                  update.mutate({ id: member.id, body: { staff_role } })
                }
                onActive={(is_active) =>
                  update.mutate({ id: member.id, body: { is_active } })
                }
                onResend={() => resend.mutate(member.id)}
                onWithdraw={() => {
                  if (
                    window.confirm(
                      `Withdraw the invitation for ${member.email}?`,
                    )
                  )
                    withdraw.mutate(member.id);
                }}
              />
            ))}
          </tbody>
        </Table>
      )}
      <InviteDrawer
        open={inviting}
        onClose={() => setInviting(false)}
        canInviteOwner={owner}
      />
    </Card>
  );
}

function MemberRow({
  member,
  canManageOwners,
  busy,
  onRole,
  onActive,
  onResend,
  onWithdraw,
}: {
  member: TeamMember;
  canManageOwners: boolean;
  busy: boolean;
  onRole: (role: StaffRole) => void;
  onActive: (active: boolean) => void;
  onResend: () => void;
  onWithdraw: () => void;
}) {
  const name = member.full_name ?? member.email;
  const locked = member.staff_role === "owner" && !canManageOwners;
  return (
    <Tr>
      <Td>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-forest">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {name}{" "}
              {member.is_you ? (
                <span className="text-xs text-subtle">(you)</span>
              ) : null}
            </p>
            <p className="text-xs text-subtle">{member.email}</p>
          </div>
        </div>
      </Td>
      <Td>
        <label htmlFor={`role-${member.id}`} className="sr-only">
          Role for {name}
        </label>
        <Select
          id={`role-${member.id}`}
          value={member.staff_role}
          disabled={busy || locked || member.is_you}
          onChange={(event) => onRole(event.target.value as StaffRole)}
          className="h-9 w-auto text-[13px]"
        >
          {ROLES.filter(
            (role) =>
              role !== "owner" ||
              canManageOwners ||
              member.staff_role === "owner",
          ).map((role) => (
            <option key={role} value={role}>
              {staffRoleLabels[role]}
            </option>
          ))}
        </Select>
      </Td>
      <Td>
        {!member.joined ? (
          <Badge tone="amber">Invited</Badge>
        ) : member.is_active ? (
          <Badge tone="green">Active</Badge>
        ) : (
          <Badge tone="red">Deactivated</Badge>
        )}
      </Td>
      <Td className="whitespace-nowrap">
        {member.last_login_at
          ? timeAgo(member.last_login_at)
          : member.joined
            ? "—"
            : `Invited ${formatDate(member.created_at)}`}
      </Td>
      <Td className="text-right whitespace-nowrap">
        {!member.joined ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResend}
              icon={<Send aria-hidden className="size-3.5" />}
            >
              Resend
            </Button>
            {!locked ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={onWithdraw}
              >
                Withdraw
              </Button>
            ) : null}
          </div>
        ) : !member.is_you && !locked ? (
          <Button
            variant="ghost"
            size="sm"
            className={member.is_active ? "text-red-600 hover:bg-red-50" : ""}
            disabled={busy}
            onClick={() => {
              if (
                !member.is_active ||
                window.confirm(
                  `Deactivate ${name}? They will no longer be able to sign in.`,
                )
              )
                onActive(!member.is_active);
            }}
          >
            {member.is_active ? "Deactivate" : "Reactivate"}
          </Button>
        ) : null}
      </Td>
    </Tr>
  );
}

function InviteDrawer({
  open,
  onClose,
  canInviteOwner,
}: {
  open: boolean;
  onClose: () => void;
  canInviteOwner: boolean;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: adminApi.roles,
  });
  const invite = useMutation({
    mutationFn: adminApi.invite,
    onSuccess: (member) => {
      toast.success(`Invitation sent to ${member.email}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      setErrors({});
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else toast.error(errorText(error, "Couldn't send the invitation."));
    },
  });
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    invite.mutate({
      email: String(form.get("email") ?? "").trim(),
      full_name: String(form.get("full_name") ?? "").trim() || null,
      staff_role: String(form.get("staff_role")) as StaffRole,
    });
  }
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite a team member"
      description="They get an email with a link (valid for 7 days) to set their password."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={`${id}-form`}
            loading={invite.isPending}
            icon={<MailPlus aria-hidden className="size-4" />}
          >
            Send invitation
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <Field label="Email" htmlFor={`${id}-email`} error={errors.email}>
          <Input id={`${id}-email`} name="email" type="email" required />
        </Field>
        <Field label="Name" htmlFor={`${id}-name`} error={errors.full_name}>
          <Input id={`${id}-name`} name="full_name" maxLength={80} />
        </Field>
        <Field label="Role" htmlFor={`${id}-role`} error={errors.staff_role}>
          <Select id={`${id}-role`} name="staff_role" defaultValue="editor">
            {ROLES.filter((role) => role !== "owner" || canInviteOwner).map(
              (role) => (
                <option key={role} value={role}>
                  {staffRoleLabels[role]}
                </option>
              ),
            )}
          </Select>
        </Field>
        {roles.data ? (
          <ul className="space-y-1.5 rounded-xl bg-surface p-3 text-xs">
            {roles.data.roles.map((role) => (
              <li key={role.role}>
                <strong className="text-ink">{role.label}:</strong>{" "}
                {role.description}
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </Drawer>
  );
}

function Matrix() {
  const user = useUser();
  const toast = useToast();
  const queryClient = useQueryClient();
  const owner = isOwner(user);
  const query = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: adminApi.roles,
  });
  const [access, setAccess] = useState<RoleMatrix["access"] | null>(null);
  useEffect(() => {
    if (query.data) setAccess(structuredClone(query.data.access));
  }, [query.data]);
  const save = useMutation({
    mutationFn: (value: RoleMatrix["access"]) => adminApi.saveRoles(value),
    onSuccess: (matrix) => {
      queryClient.setQueryData(["admin", "roles"], matrix);
      toast.success(
        "Role Matrix saved. Changes apply on the next page load for each member.",
      );
    },
    onError: (error) => toast.error(errorText(error, "Couldn't save.")),
  });

  if (query.isPending || !access) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const matrix = query.data;
  const dirty = JSON.stringify(access) !== JSON.stringify(matrix.access);

  const toggle = (role: StaffRole, module: Module) =>
    setAccess((current) => {
      if (!current) return current;
      const list = current[role];
      return {
        ...current,
        [role]: list.includes(module)
          ? list.filter((m) => m !== module)
          : [...list, module],
      };
    });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Role Matrix"
        description={
          owner
            ? "Turn each part of the dashboard on or off for each role. Owners always have everything."
            : "What each role can use. Only owners can change this."
        }
        actions={
          owner ? (
            <>
              {dirty ? (
                <Button
                  variant="ghost"
                  onClick={() => setAccess(structuredClone(matrix.access))}
                  icon={<RotateCcw aria-hidden className="size-4" />}
                >
                  Discard
                </Button>
              ) : null}
              <Button
                disabled={!dirty}
                loading={save.isPending}
                onClick={() => save.mutate(access)}
                icon={<Save aria-hidden className="size-4" />}
              >
                Save changes
              </Button>
            </>
          ) : null
        }
      />
      {!owner ? (
        <Notice tone="info" className="m-4">
          You can see the matrix; ask an owner to change it.
        </Notice>
      ) : null}
      <Table>
        <thead>
          <tr>
            <Th className="min-w-56">Area</Th>
            {matrix.roles.map((role) => (
              <Th key={role.role} className="text-center">
                {role.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.modules.map((module) => (
            <Tr key={module.key}>
              <Td>
                <p className="font-medium text-ink">{module.label}</p>
                <p className="text-xs text-subtle">{module.description}</p>
              </Td>
              {matrix.roles.map((role) => {
                const on = access[role.role].includes(module.key);
                const editable = owner && role.editable;
                return (
                  <Td key={role.role} className="text-center align-middle">
                    {role.editable ? (
                      <Toggle
                        on={on}
                        disabled={!editable}
                        label={`${role.label}: ${module.label}`}
                        onChange={() => toggle(role.role, module.key)}
                      />
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-subtle"
                        title="Owners always have access"
                      >
                        <Lock aria-hidden className="size-3.5" /> Always
                      </span>
                    )}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
