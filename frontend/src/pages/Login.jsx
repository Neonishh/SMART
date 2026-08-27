import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import client from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await client.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-sm px-6 py-24">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] mb-2">
          Log in to SMART
        </h1>
        <p className="text-sm text-[var(--color-muted)] mb-8">
          Access your dashboard, saved searches, and reports.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
              Email
            </label>
            <input
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[var(--color-navy)] text-white text-sm font-medium py-2.5 rounded-sm"
          >
            Log in
          </button>
        </form>

        <p className="text-xs text-[var(--color-muted)] mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-[var(--color-ochre)] font-medium">
            Create one
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}