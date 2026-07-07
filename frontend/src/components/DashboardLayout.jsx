import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Search,
  Building2,
  Users,
  FileText,
  Landmark,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/search", label: "Search", icon: Search },
  { to: "/dashboard/institutions", label: "Institutions", icon: Building2 },
  { to: "/dashboard/researchers", label: "Researchers", icon: Users },
  { to: "/dashboard/patents", label: "Patents", icon: FileText },
  { to: "/dashboard/grants", label: "Grants", icon: Landmark },
  { to: "/dashboard/chatbot", label: "Ask SMART", icon: MessageSquare },
];

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-6 h-16 border-b border-[var(--color-line-dark)]">
        <span className="font-serif font-bold text-lg text-white tracking-tight">SMART</span>
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-[var(--color-muted-inv)] hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-[var(--color-line-dark)] text-xs text-[var(--color-muted-inv)] font-mono">
        UI preview — backend not yet connected
      </div>
    </>
  );
}

export default function DashboardLayout({ children, title, description }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-paper)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-[var(--color-navy)] fixed inset-y-0 left-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-[var(--color-navy)] flex flex-col">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            className="flex-1 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 md:ml-60 min-w-0">
        <header className="sticky top-0 z-30 bg-[var(--color-paper)]/95 backdrop-blur border-b border-[var(--color-line)] px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
            {description && <p className="text-xs text-[var(--color-muted)]">{description}</p>}
          </div>
          <button
            className="md:hidden p-2 text-[var(--color-ink)]"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
