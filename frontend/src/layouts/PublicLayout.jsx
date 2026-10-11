import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/#features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "text-brand-700" : "text-mist-700 hover:text-brand-700"}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="sticky top-0 z-40 border-b border-mist-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to="/app/dashboard"><Button size="sm">Open dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/register"><Button size="sm">Sign up free</Button></Link>
              </>
            )}
          </div>
          <button type="button" className="rounded-lg p-2 text-mist-700 hover:bg-mist-100 md:hidden" aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-mist-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
              {user ? (
                <Link to="/app/dashboard" onClick={() => setOpen(false)}><Button className="mt-2 w-full">Open dashboard</Button></Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setOpen(false)}><Button variant="secondary" className="w-full">Log in</Button></Link>
                  <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full">Sign up</Button></Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="border-t border-mist-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-mist-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Quizora AI. Built as a portfolio project.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/about" className="hover:text-brand-700">About</Link>
            <Link to="/contact" className="hover:text-brand-700">Contact</Link>
            <Link to="/privacy" className="hover:text-brand-700">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-700">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
