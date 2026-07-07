import { Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";

export default function Login() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-sm px-6 py-24">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] mb-2">
          Log in to SMART
        </h1>
        <p className="text-sm text-[var(--color-muted)] mb-8">
          Access your dashboard, saved searches, and reports.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="you@institution.edu"
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--color-navy)] text-white text-sm font-medium py-2.5 rounded-sm"
          >
            Log in
          </button>
        </form>

        <p className="text-xs text-[var(--color-muted)] mt-6">
          This form is a UI placeholder — no authentication is wired up yet.
          Go straight to the{" "}
          <Link to="/dashboard" className="text-[var(--color-ochre)] font-medium">
            dashboard
          </Link>{" "}
          to explore.
        </p>
      </div>
    </PublicLayout>
  );
}
