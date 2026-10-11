import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "border border-mist-300 bg-white text-mist-800 hover:border-brand-300 hover:bg-brand-50 disabled:text-mist-400",
  ghost: "text-mist-700 hover:bg-mist-100 disabled:text-mist-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className = "", children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
