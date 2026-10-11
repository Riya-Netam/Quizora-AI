import { Link } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-mist-50">
      <header className="px-4 py-5 sm:px-8"><Logo /></header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-mist-600">{subtitle}</p>}
          <div className="card mt-7 p-6 sm:p-7">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-mist-600">{footer}</p>}
          <p className="mt-8 text-center text-xs text-mist-500">
            <Link to="/privacy" className="hover:text-brand-700">Privacy</Link> · <Link to="/terms" className="hover:text-brand-700">Terms</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
