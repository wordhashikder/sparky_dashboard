import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Search, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["admin", "customers", { page, q }],
    queryFn: () => adminApi.customers(page, q),
    placeholderData: keepPreviousData,
  });
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong.",
    );
  const sendLink = useMutation({
    mutationFn: (id: string) => adminApi.sendCustomerLink(id),
    onSuccess: (result) => toast.success(result.message),
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      toast.success("Customer deleted. Their requests stay, anonymously.");
    },
    onError,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Homeowners who asked for quotes. Each one signs in with an emailed link, with no password. You can send them a fresh link or erase their details."
      />
      <div className="relative mb-4 max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
        />
        <Input
          aria-label="Search customers"
          placeholder="Search by name or email"
          className="pl-9"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <Card>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Requests</Th>
                <Th>Quotes received</Th>
                <Th>Last signed in</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((customer) => (
                <Tr key={customer.id}>
                  <Td>
                    <p className="font-semibold text-ink">
                      {customer.first_name}
                    </p>
                    <p className="text-xs text-subtle">{customer.email}</p>
                  </Td>
                  <Td>{customer.requests}</Td>
                  <Td>{customer.quotes_received}</Td>
                  <Td>
                    {customer.last_login_at
                      ? formatDateTime(customer.last_login_at)
                      : "Never"}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Send aria-hidden className="size-3.5" />}
                        loading={
                          sendLink.isPending &&
                          sendLink.variables === customer.id
                        }
                        onClick={() => sendLink.mutate(customer.id)}
                      >
                        Send link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${customer.first_name}`}
                        icon={<Trash2 aria-hidden className="size-3.5" />}
                        loading={
                          remove.isPending && remove.variables === customer.id
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `Erase ${customer.first_name} (${customer.email})? They lose access to their quotes. This cannot be undone.`,
                            )
                          )
                            remove.mutate(customer.id);
                        }}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {query.data ? (
          <Pagination
            page={page}
            pages={query.data.pages}
            total={query.data.total}
            onChange={setPage}
            noun="customers"
          />
        ) : null}
      </Card>
    </>
  );
}
