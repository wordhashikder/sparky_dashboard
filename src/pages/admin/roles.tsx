import { useQuery } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { Fragment } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th } from "@/components/ui/table";
import { adminApi } from "@/lib/endpoints";

export default function RolesPage() {
  const query = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: adminApi.roles,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <>
      <PageHeader
        title="Role Matrix"
        description="What each kind of account can do. Access is enforced by the API; plan rules decide what an installer's account includes."
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {query.data.roles.map((role) => (
              <Card key={role.role}>
                <CardBody>
                  <h2 className="text-[15px] font-semibold">{role.label}</h2>
                  <p className="mt-1 text-sm">{role.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Permission</Th>
                  {query.data.roles.map((role) => (
                    <Th key={role.role} className="w-32 text-center">
                      {role.label}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupByArea(query.data.permissions).map(([area, rows]) => (
                  <Fragment key={area}>
                    <tr>
                      <td
                        colSpan={query.data.roles.length + 1}
                        className="border-b border-line bg-mint-soft px-4 py-2 text-xs font-semibold tracking-wide text-forest uppercase"
                      >
                        {area}
                      </td>
                    </tr>
                    {rows.map((permission) => (
                      <tr key={permission.key}>
                        <Td className="text-ink">{permission.label}</Td>
                        {query.data.roles.map((role) => (
                          <Td key={role.role} className="text-center">
                            {permission.roles.includes(role.role) ? (
                              <Check
                                aria-label="Allowed"
                                className="mx-auto size-4 text-primary"
                              />
                            ) : (
                              <Minus
                                aria-label="Not allowed"
                                className="mx-auto size-4 text-subtle"
                              />
                            )}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}

function groupByArea<T extends { area: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(item.area, [...(groups.get(item.area) ?? []), item]);
  }
  return [...groups.entries()];
}
