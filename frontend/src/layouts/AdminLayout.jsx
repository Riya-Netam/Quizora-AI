import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, ClipboardList, Gauge, Inbox, Menu, ScrollText, Users, X } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { NavList } from "./AppLayout";

const nav = [
  { to: "/admin", label: "Overview", icon: Gauge },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/feedback", label: "Feedback", icon: Inbox },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/system", label: "System", icon: ClipboardList },
];

/** Deliberately darker than the student app so admins always know where they are. */
export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const panel = (
    <div className="flex h-full flex-col bg-brand-950 text-white">
      <div className="px-5 py-5"><Logo to="/admin" light /><p className="mt-2 text-xs text-brand-200">Administration</p></div>
      <nav aria-label="Admin" className="flex-1 px-3"><NavList items={nav} tone="dark" onNavigate={() => setOpen(false)} /></nav>
      <div className="border-t border-white/10 p-4">
        <Link to="/app/dashboard" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-100 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to student app
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mist-100 lg:flex">
      <a href="#main" className="skip-link">Skip to main content</a>
      <aside className="hidden w-64 shrink-0 lg:block"><div className="sticky top-0 h-screen">{panel}</div></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between bg-brand-950 px-4 lg:hidden">
          <Logo to="/admin" light />
          <button type="button" className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
              <button type="button" className="absolute right-3 top-4 z-10 rounded-lg p-2 text-white hover:bg-white/10" aria-label="Close admin menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
              {panel}
            </div>
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10"><Outlet /></main>
      </div>
    </div>
  );
}
