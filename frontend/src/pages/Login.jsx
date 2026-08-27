import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import { loginUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      localStorage.setItem("smart_token", res.data.token);
      localStorage.setItem("smart_user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-sm px-6 py-24">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] mb-2">
          Log in to SMART
        </h1>
        <p className="text-sm text-[var(--color-muted)] mb-8">
          Sign in to contribute research data and manage entries.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@institution.edu"
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </div>

          {error && (
            <div className="text-sm px-3 py-2.5 rounded-sm border border-red-200 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-navy)] text-white text-sm font-medium py-2.5 rounded-sm disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-7 border border-[var(--color-line)] bg-[var(--color-paper-dim)] p-4 rounded-sm text-xs text-[var(--color-muted)] space-y-2">
          <p className="font-semibold text-[var(--color-ink)]">Demo accounts</p>
          <p><strong>Admin:</strong> admin@smart.com / admin123</p>
          <p><strong>Contributor:</strong> contributor@smart.com / user123</p>
        </div>

        <p className="text-xs text-[var(--color-muted)] mt-6">
          Need to return to the public site?{" "}
          <Link to="/" className="text-[var(--color-ochre)] font-medium">Home</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
