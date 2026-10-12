import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import type { AdminBlogPost, BlogPostInput, BlogPostStatus } from "@/lib/types";

/** `datetime-local` value in the browser's time zone. */
function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function BlogEditorPage() {
  const { postId } = useParams();
  const query = useQuery({
    queryKey: ["admin", "blog-post", postId],
    queryFn: () => adminApi.blogPost(postId ?? ""),
    enabled: !!postId,
  });
  if (postId && query.isPending) return <PageLoader />;
  if (postId && query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  return <Editor key={postId ?? "new"} post={query.data} />;
}

function Editor({ post }: { post?: AdminBlogPost }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const cover = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    post?.seo_description ?? "",
  );
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) setErrors(error.fields);
    toast.error(error instanceof ApiError ? error.message : "Couldn't save.");
  };
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "blog"] });

  const save = useMutation({
    mutationFn: (body: BlogPostInput) => {
      if (!post) return adminApi.createBlogPost(body);
      // On an update a blank address or date means "keep the current one".
      const { slug, published_at, ...rest } = body;
      return adminApi.updateBlogPost(post.id, {
        ...rest,
        ...(slug ? { slug } : {}),
        ...(published_at ? { published_at } : {}),
      });
    },
    onSuccess: (saved) => {
      setErrors({});
      void refresh();
      queryClient.setQueryData(["admin", "blog-post", saved.id], saved);
      toast.success(post ? "Article saved." : "Article created.");
      if (!post) navigate(`/blog/${saved.id}`, { replace: true });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteBlogPost(post?.id ?? ""),
    onSuccess: () => {
      void refresh();
      toast.success("Article deleted.");
      navigate("/blog");
    },
    onError,
  });
  const upload = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadBlogCover(
        post?.id ?? "",
        file,
        post?.cover_image_alt ?? "",
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin", "blog-post", saved.id], saved);
      void refresh();
      toast.success("Cover image uploaded.");
    },
    onError,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const publishedAt = value("published_at");
    save.mutate({
      title: value("title"),
      slug: value("slug") || null,
      excerpt: value("excerpt"),
      body: String(form.get("body") ?? ""),
      category: value("category"),
      author_name: value("author_name") || "PickASparky Team",
      cover_image_url: value("cover_image_url") || null,
      cover_image_alt: value("cover_image_alt") || null,
      seo_title: value("seo_title") || null,
      seo_description: value("seo_description") || null,
      is_featured: form.get("is_featured") === "on",
      status: value("status") as BlogPostStatus,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
    });
  }

  const coverSrc = post?.cover_image_url
    ? post.cover_image_url.startsWith("/")
      ? `${config.siteUrl}${post.cover_image_url}`
      : post.cover_image_url
    : null;

  return (
    <>
      <Link
        to="/blog"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All articles
      </Link>
      <PageHeader
        title={post ? "Edit article" : "New article"}
        description="Articles are written in Markdown: ## for headings, - for lists, **bold**, [links](https://…)."
        actions={
          post ? (
            <Button
              variant="outline"
              loading={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${post.title}”? This can't be undone.`,
                  )
                )
                  remove.mutate();
              }}
              icon={<Trash2 aria-hidden className="size-4" />}
            >
              Delete
            </Button>
          ) : null
        }
      />
      <form
        onSubmit={onSubmit}
        className="grid gap-6 xl:grid-cols-[1fr_340px]"
        noValidate
      >
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <Field label="Title" htmlFor="title" error={errors.title}>
                <Input
                  id="title"
                  name="title"
                  defaultValue={post?.title}
                  maxLength={160}
                  required
                />
              </Field>
              <Field
                label="Web address"
                htmlFor="slug"
                error={errors.slug}
                hint="Lowercase words joined by hyphens. Leave blank to make one from the title."
              >
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={post?.slug}
                  maxLength={120}
                  placeholder="how-much-does-a-home-charger-cost"
                />
              </Field>
              <Field
                label="Excerpt"
                htmlFor="excerpt"
                error={errors.excerpt}
                aside={`${excerpt.length}/300`}
                hint="One or two sentences for the blog listing (20–300 characters)."
              >
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  rows={2}
                  maxLength={300}
                  value={excerpt}
                  onChange={(event) => setExcerpt(event.target.value)}
                />
              </Field>
              <Field label="Article" htmlFor="body" error={errors.body}>
                <Textarea
                  id="body"
                  name="body"
                  rows={22}
                  defaultValue={post?.body}
                  className="font-mono text-[13px]"
                />
              </Field>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Search appearance"
              description="Leave blank to use the title and excerpt."
            />
            <CardBody className="space-y-4">
              <Field
                label="SEO title"
                htmlFor="seo_title"
                error={errors.seo_title}
                aside={`${seoTitle.length}/70`}
              >
                <Input
                  id="seo_title"
                  name="seo_title"
                  maxLength={70}
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                />
              </Field>
              <Field
                label="Meta description"
                htmlFor="seo_description"
                error={errors.seo_description}
                aside={`${seoDescription.length}/160`}
              >
                <Textarea
                  id="seo_description"
                  name="seo_description"
                  rows={2}
                  maxLength={160}
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-4">
              <Field label="Status" htmlFor="status" error={errors.status}>
                <Select
                  id="status"
                  name="status"
                  defaultValue={post?.status ?? "draft"}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
              <Field
                label="Publish date"
                htmlFor="published_at"
                error={errors.published_at}
                hint="Blank publishes now. A future date schedules the article."
              >
                <Input
                  id="published_at"
                  name="published_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(post?.published_at ?? null)}
                />
              </Field>
              <Checkbox
                name="is_featured"
                defaultChecked={post?.is_featured}
                label="Feature at the top of the blog"
              />
              <Button type="submit" className="w-full" loading={save.isPending}>
                {post ? "Save article" : "Create article"}
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <Field
                label="Category"
                htmlFor="category"
                error={errors.category}
              >
                <Input
                  id="category"
                  name="category"
                  defaultValue={post?.category}
                  maxLength={60}
                  placeholder="Costs & Grants"
                />
              </Field>
              <Field
                label="Author"
                htmlFor="author_name"
                error={errors.author_name}
              >
                <Input
                  id="author_name"
                  name="author_name"
                  defaultValue={post?.author_name ?? "PickASparky Team"}
                  maxLength={80}
                />
              </Field>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Cover image" />
            <CardBody className="space-y-4">
              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt=""
                  className="aspect-video w-full rounded-lg object-cover"
                />
              ) : null}
              {post ? (
                <>
                  <input
                    ref={cover}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload.mutate(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    loading={upload.isPending}
                    onClick={() => cover.current?.click()}
                    icon={<Upload aria-hidden className="size-4" />}
                  >
                    Upload image
                  </Button>
                </>
              ) : (
                <p className="text-xs">
                  Save the article first to upload a file.
                </p>
              )}
              <Field
                label="Image address"
                htmlFor="cover_image_url"
                error={errors.cover_image_url}
                hint="Or paste an https:// address or a site path."
              >
                <Input
                  id="cover_image_url"
                  name="cover_image_url"
                  defaultValue={post?.cover_image_url ?? ""}
                />
              </Field>
              <Field
                label="Alt text"
                htmlFor="cover_image_alt"
                error={errors.cover_image_alt}
              >
                <Input
                  id="cover_image_alt"
                  name="cover_image_alt"
                  maxLength={160}
                  defaultValue={post?.cover_image_alt ?? ""}
                />
              </Field>
            </CardBody>
          </Card>
        </div>
      </form>
    </>
  );
}
