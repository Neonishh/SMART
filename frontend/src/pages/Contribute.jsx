import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card } from "../components/ui";
import { createThesis, getCurrentUser } from "../services/api";

const initialForm = {
  thesisId: "",
  title: "",
  researcher: "",
  guide: "",
  institution: "",
  department: "",
  year: "",
  abstract: "",
  sourceUrl: "",
  source: "",
  location: "",
  keywords: "",
  contributorName: "",
  contributorAccessCode: "",
};

const fields = [
  ["thesisId", "Thesis ID"],
  ["title", "Title"],
  ["researcher", "Researcher"],
  ["guide", "Guide"],
  ["institution", "Institution"],
  ["department", "Department"],
  ["year", "Year"],
  ["sourceUrl", "Source URL"],
  ["source", "Source"],
  ["location", "Location"],
];

export default function Contribute() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const user = getCurrentUser();

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    setSaving(true);

    try {
      await createThesis({ ...form, contributorName: user?.name || form.contributorName });
      setStatus("Thesis submitted successfully. You can view it on the Theses page.");
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setStatus(
        err?.response?.data?.error ||
        "Unable to submit the thesis. Please check the required fields."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Contribute Data"
      description="Add a verified thesis record directly to the SMART knowledge graph."
    >
      <Card className="max-w-5xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono">
            Manual intervention · Thesis
          </p>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] mt-2">
            Add a Thesis
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Enter information you have verified yourself. Your signed-in account is recorded as the contributor.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map(([key, label]) => (
              <label key={key} className="block">
                <span className="block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5">
                  {label}
                </span>
                <input
                  required={!["department", "sourceUrl", "source", "location"].includes(key)}
                  type={key === "year" ? "number" : "text"}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5">
              Abstract
            </span>
            <textarea
              value={form.abstract}
              onChange={(e) => update("abstract", e.target.value)}
              rows={5}
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </label>

          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5">
              Keywords
            </span>
            <textarea
              value={form.keywords}
              onChange={(e) => update("keywords", e.target.value)}
              placeholder="AI, Machine Learning, Computer Vision"
              rows={3}
              className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
            />
          </label>

          <div className="border-t border-[var(--color-line)] pt-5 grid sm:grid-cols-2 gap-4">
            <div className="text-xs text-[var(--color-muted)] sm:col-span-2">Signed in as <strong>{user?.name || "Guest"}</strong> ({user?.role || "not signed in"})</div>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5">
                Your Name (optional)
              </span>
              <input
                value={form.contributorName}
                onChange={(e) => update("contributorName", e.target.value)}
                className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
              />
            </label>

            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5">
                Contributor Access Code
              </span>
              <input
                required
                type="password"
                value={form.contributorAccessCode}
                onChange={(e) => update("contributorAccessCode", e.target.value)}
                className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]"
              />
            </label>
          </div>

          {status && (
            <div className="text-sm px-3 py-2.5 rounded-sm border border-[var(--color-line)] bg-[var(--color-paper-dim)] text-[var(--color-ink)]">
              {status}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-navy)] text-white text-sm font-medium px-5 py-2.5 rounded-sm disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit Thesis"}
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
