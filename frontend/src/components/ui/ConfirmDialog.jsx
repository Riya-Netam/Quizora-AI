import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

/** Accessible confirmation modal: focus moves in, Escape cancels, focus returns on close. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, loading = false, onConfirm, onCancel }) {
  const titleId = useId();
  const cancelRef = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previous.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous.current?.focus?.(); };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-mist-900/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-mist-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
