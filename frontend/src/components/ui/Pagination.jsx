import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <p className="text-sm text-mist-600">Page {page} of {pages} <span className="text-mist-400">({total} total)</span></p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
