import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./Button";

export function Spinner({ label = "Loading" }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-mist-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-mist-200 ${className}`} />;
}

export function CardSkeletons({ count = 3 }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto h-9 w-9 text-brand-400" aria-hidden="true" />}
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-mist-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-red-900">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

const tones = {
  neutral: "bg-mist-100 text-mist-700",
  brand: "bg-brand-100 text-brand-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
};
export function Badge({ tone = "neutral", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export const difficultyTone = { easy: "green", medium: "amber", hard: "red" };
