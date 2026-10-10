import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Button } from "./button";

export function Pagination({
  page,
  pages,
  total,
  onChange,
  noun = "results",
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  if (total === 0) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px]"
    >
      <p>
        {formatNumber(total)} {noun}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>
      {pages > 1 ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            icon={<ChevronLeft aria-hidden className="size-4" />}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
          >
            Next
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
