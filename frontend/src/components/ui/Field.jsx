import { forwardRef, useId } from "react";

const base =
  "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-mist-900 placeholder:text-mist-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-mist-100";

function Wrapper({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-mist-800">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-mist-600">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

const describe = (id, hint, error) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = forwardRef(function Input({ label, hint, error, className = "", ...props }, ref) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input ref={ref} id={id} aria-invalid={!!error} aria-describedby={describe(id, hint, error)}
        className={`${base} ${error ? "border-red-400" : "border-mist-300"} ${className}`} {...props} />
    </Wrapper>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, className = "", rows = 5, ...props }, ref) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <textarea ref={ref} id={id} rows={rows} aria-invalid={!!error} aria-describedby={describe(id, hint, error)}
        className={`${base} ${error ? "border-red-400" : "border-mist-300"} ${className}`} {...props} />
    </Wrapper>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, options, className = "", ...props }, ref) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select ref={ref} id={id} aria-invalid={!!error} aria-describedby={describe(id, hint, error)}
        className={`${base} ${error ? "border-red-400" : "border-mist-300"} ${className}`} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrapper>
  );
});
