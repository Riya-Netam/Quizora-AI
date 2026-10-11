import { Link } from "react-router-dom";

export function LogoMark({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#5842D1" />
      <path d="M16 7a9 9 0 1 0 5.4 16.2l3.3 3.3 1.8-1.8-3.3-3.3A9 9 0 0 0 16 7Zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ to = "/", light = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="Quizora AI home">
      <LogoMark />
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-mist-900"}`}>
        Quizora<span className={light ? "text-brand-300" : "text-brand-600"}> AI</span>
      </span>
    </Link>
  );
}
