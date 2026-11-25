import { useMutation } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";

/** Site paths are shown from the public website. */
export const imageSrc = (url: string) =>
  url.startsWith("/") ? `${config.siteUrl}${url}` : url;

/** Uploads one image (JPG, PNG or WebP) and hands back its address. */
export function useImageUpload(onUploaded: (url: string) => void) {
  const toast = useToast();
  return useMutation({
    mutationFn: adminApi.uploadMedia,
    onSuccess: (result) => onUploaded(result.url),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't upload the image.",
      ),
  });
}

/** A hidden file input with a button that opens it. */
export function UploadButton({
  label,
  loading,
  onFile,
  variant = "outline",
}: {
  label: string;
  loading: boolean;
  onFile: (file: File) => void;
  variant?: "outline" | "ghost";
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button
        variant={variant}
        size="sm"
        loading={loading}
        onClick={() => input.current?.click()}
        icon={<ImagePlus aria-hidden className="size-4" />}
      >
        {label}
      </Button>
    </>
  );
}

/** A picture with Upload / Remove, for a page's main image or a section's side image. */
export function ImagePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const toast = useToast();
  const upload = useImageUpload((url) => {
    onChange(url);
    toast.success("Image uploaded. Save to use it.");
  });
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
        {value ? (
          <img
            src={imageSrc(value)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs text-subtle">No image</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          label={value ? "Replace image" : "Upload image"}
          loading={upload.isPending}
          onFile={(file) => upload.mutate(file)}
        />
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            icon={<X aria-hidden className="size-4" />}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
