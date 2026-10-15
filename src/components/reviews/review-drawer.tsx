import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import { reviewStatusLabels } from "@/lib/labels";
import type { AdminReview, ReviewStatus } from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";

const STATUSES = Object.keys(reviewStatusLabels) as ReviewStatus[];

/** Search installers by name and pick one. */
function InstallerPicker({
  value,
  selectedName,
  onChange,
  error,
}: {
  value: string;
  selectedName?: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const results = useQuery({
    queryKey: ["admin", "installer-picker", q],
    queryFn: () => adminApi.installers(1, { q }),
    enabled: q.length >= 2,
  });
  const items = results.data?.items ?? [];
  const known = items.some((item) => item.id === value);
  return (
    <Field
      label="Installer"
      htmlFor={id}
      error={error}
      hint="Type at least two letters of the business name."
    >
      <Input
        id={`${id}-search`}
        aria-label="Search installers"
        placeholder="Search installers…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        id={id}
        className="mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="">Choose an installer…</option>
        {value && !known ? (
          <option value={value}>{selectedName ?? "Selected installer"}</option>
        ) : null}
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.business_name} · {item.town}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Add a review by hand, or edit an existing one (any status). */
export function ReviewDrawer({
  open,
  review,
  onClose,
}: {
  open: boolean;
  review: AdminReview | null;
  onClose: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [installerId, setInstallerId] = useState(review?.installer_id ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);

  const save = useMutation({
    mutationFn: (body: {
      installer_id: string;
      rating: number;
      title: string;
      body: string;
      author_name: string;
      author_location: string | null;
      status: ReviewStatus;
    }) =>
      review
        ? adminApi.updateReview(review.id, body)
        : adminApi.createReview(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(review ? "Review saved." : "Review added.");
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't save the review.",
      );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "").trim();
    if (!installerId) {
      setErrors({ installer_id: "Choose an installer." });
      return;
    }
    setErrors({});
    save.mutate({
      installer_id: installerId,
      rating,
      title: get("title"),
      body: get("body"),
      author_name: get("author_name"),
      author_location: get("author_location") || null,
      status: get("status") as ReviewStatus,
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={review ? "Edit review" : "Add review"}
      description={
        review
          ? "Changes to a published review go live straight away."
          : "For a review received outside the website. It is not marked as a verified job."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} loading={save.isPending}>
            {review ? "Save review" : "Add review"}
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={onSubmit}
        className="grid gap-4"
        noValidate
      >
        <InstallerPicker
          value={installerId}
          selectedName={review?.installer_name}
          onChange={setInstallerId}
          error={errors.installer_id}
        />
        <Field label="Rating" htmlFor={`${id}-rating`} error={errors.rating}>
          <Select
            id={`${id}-rating`}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} {value === 1 ? "star" : "stars"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor={`${id}-title`} error={errors.title}>
          <Input
            id={`${id}-title`}
            name="title"
            maxLength={80}
            defaultValue={review?.title}
          />
        </Field>
        <Field label="Review" htmlFor={`${id}-body`} error={errors.body}>
          <Textarea
            id={`${id}-body`}
            name="body"
            rows={6}
            maxLength={1500}
            defaultValue={review?.body}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Reviewer name"
            htmlFor={`${id}-author`}
            error={errors.author_name}
          >
            <Input
              id={`${id}-author`}
              name="author_name"
              maxLength={60}
              defaultValue={review?.author_name}
            />
          </Field>
          <Field
            label="Town (optional)"
            htmlFor={`${id}-where`}
            error={errors.author_location}
          >
            <Input
              id={`${id}-where`}
              name="author_location"
              maxLength={60}
              defaultValue={review?.author_location ?? ""}
            />
          </Field>
        </div>
        <Field label="Status" htmlFor={`${id}-status`} error={errors.status}>
          <Select
            id={`${id}-status`}
            name="status"
            defaultValue={review?.status ?? "published"}
          >
            {STATUSES.map((key) => (
              <option key={key} value={key}>
                {reviewStatusLabels[key]}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Drawer>
  );
}
