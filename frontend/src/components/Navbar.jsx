import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { to: "/about", label: "About" },
  { to: "/who-we-serve", label: "Who we serve" },
  { to: "/resources", label: "Resources" },
  { to: "/knowledge-graph", label: "Knowledge Graph" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[var(--color-navy)] text-white relative z-20">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="font-serif font-bold text-xl tracking-tight">SMART</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `transition-colors hover:text-white ${
                  isActive ? "text-white" : "text-[var(--color-muted-inv)]"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/login" className="text-[var(--color-muted-inv)] hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/help" className="text-[var(--color-muted-inv)] hover:text-white transition-colors">
            Help
          </Link>
          <Link
            to="/dashboard"
            className="bg-white text-[var(--color-navy)] text-sm font-medium px-4 py-2 rounded-sm hover:bg-[var(--color-paper-dim)] transition-colors"
          >
            Enter Platform
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-line-dark)] px-6 py-4 flex flex-col gap-4 text-sm">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-[var(--color-muted-inv)]">
              {l.label}
            </Link>
          ))}
          <Link to="/login" onClick={() => setOpen(false)} className="text-[var(--color-muted-inv)]">Login</Link>
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="bg-white text-[var(--color-navy)] text-sm font-medium px-4 py-2 rounded-sm w-fit"
          >
            Enter Platform
          </Link>
        </div>
      )}
    </header>
  );
}
