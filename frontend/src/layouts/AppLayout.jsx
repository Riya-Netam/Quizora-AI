import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, History, LayoutDashboard, Library, LogOut, Menu, Settings, ShieldCheck, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/generate", label: "Create", icon: Sparkles },
  { to: "/app/study-sets", label: "Study sets", icon: Library },
  { to: "/app/attempts", label: "Quiz history", icon: History },
  { to: "/app/analytics", label: "Progress", icon: BarChart3 },
  { to: "/app/settings", label: "Account", icon: Settings },
];

function NavList({ items, onNavigate, tone = "light" }) {
  const base = tone === "light" ? "text-mist-700 hover:bg-brand-50 hover:text-brand-800" : "text-brand-100 hover:bg-white/10";
  const active = tone === "light" ? "bg-brand-100 text-brand-800" : "bg-white/15 text-white";
  return (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink to={to} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? active : base}`}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const items = isAdmin ? [...nav, { to: "/admin", label: "Admin area", icon: ShieldCheck }] : nav;

  const onLogout = async () => {
    await logout();
    toast.success("You've been logged out");
    navigate("/", { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo to="/app/dashboard" /></div>
      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3"><NavList items={items} onNavigate={() => setOpen(false)} /></nav>
      <div className="border-t border-mist-200 p-4">
        <p className="truncate text-sm font-semibold">{user?.name}</p>
        <p className="truncate text-xs text-mist-600">{user?.email}</p>
        <button type="button" onClick={onLogout} className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-mist-700 hover:bg-mist-100">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="skip-link">Skip to main content</a>
      <aside className="hidden w-64 shrink-0 border-r border-mist-200 bg-white lg:block"><div className="sticky top-0 h-screen">{sidebar}</div></aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-mist-200 bg-white px-4 lg:hidden">
          <Logo to="/app/dashboard" />
          <button type="button" className="rounded-lg p-2 text-mist-700 hover:bg-mist-100" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-mist-900/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-lift">
              <button type="button" className="absolute right-3 top-4 rounded-lg p-2 text-mist-700 hover:bg-mist-100" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10"><Outlet /></main>
      </div>
    </div>
  );
}

export { NavList };
