import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card } from "../components/ui";
import { createContribution, getCurrentUser } from "../services/api";

const f = (key, label, extra = {}) => ({ key, label, ...extra });

const TYPES = {
  Thesis: {
    label: "Thesis", page: "Theses",
    fields: [
      f("thesisId", "Thesis ID", { required: true }),
      f("title", "Title", { required: true }),
      f("researcher", "Researcher", { required: true }),
      f("guide", "Guide", { required: true }),
      f("institution", "Institution", { required: true }),
      f("department", "Department"),
      f("year", "Year", { required: true, type: "number" }),
      f("sourceUrl", "Source URL"),
      f("source", "Source"),
      f("location", "Location"),
      f("abstract", "Abstract", { long: true, rows: 5 }),
      f("keywords", "Keywords", { long: true, rows: 3, placeholder: "AI, Machine Learning, Computer Vision" }),
    ],
  },
  Grant: {
    label: "Grant", page: "Grants",
    fields: [
      f("Project_Title", "Project Title", { required: true }),
      f("PI_Name", "PI Name", { required: true }),
      f("Institution", "Institution", { required: true }),
      f("Department", "Department"),
      f("Sanction_Year", "Sanction Year", { required: true, type: "number" }),
      f("Funding_Agency", "Funding Agency"),
      f("Amount_INR", "Amount (INR)", { type: "number" }),
      f("Amount_Lakhs", "Amount (Lakhs)", { type: "number" }),
      f("Duration", "Duration"),
      f("Program_Scheme", "Program / Scheme"),
      f("Discipline", "Discipline"),
      f("File_Number", "File Number"),
      f("Source", "Source"),
      f("Location", "Location"),
      f("Source_URL", "Source URL", { type: "url" }),
    ],
  },
  Patent: {
    label: "Patent", page: "Patents",
    fields: [
      f("Patent_Title", "Patent Title", { required: true }),
      f("Institution", "Institution", { required: true }),
      f("Location", "Location"),
      f("Application_Number", "Application Number", { required: true }),
      f("Publication_Number", "Publication Number"),
      f("Patent_Status", "Patent Status"),
      f("Application_Filing_Date", "Filing Date", { type: "date" }),
      f("Publication_Date", "Publication Date", { type: "date" }),
      f("Year", "Year", { type: "number" }),
      f("Applicant_Name", "Applicant Name", { required: true }),
      f("Applicant_Address", "Applicant Address"),
      f("Inventor_Name", "Inventor Name(s)", { required: true, placeholder: "Separate with ;" }),
      f("IPC_Code", "IPC Code(s)", { placeholder: "Separate with ;" }),
      f("Field_Of_Invention", "Field Of Invention"),
      f("Abstract", "Abstract", { long: true, rows: 5 }),
    ],
  },
  Publication: {
    label: "Publication", page: "Publications",
    fields: [
      f("Title", "Title", { required: true }),
      f("Authors", "Author(s)", { required: true, placeholder: "Separate with ;" }),
      f("Institution", "Institution", { required: true }),
      f("Location", "Location"),
      f("Domain", "Domain"),
      f("Subdomain", "Subdomain"),
      f("Venue", "Venue"),
      f("Year", "Year", { required: true, type: "number" }),
      f("DOI", "DOI"),
      f("Source_URL", "Source URL", { type: "url" }),
      f("Citations", "Citations", { type: "number" }),
    ],
  },
};

const inputCls =
  "w-full border border-[var(--color-line)] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-[var(--color-ochre)]";
const labelCls =
  "block text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-1.5";

const blank = (type) => ({
  ...Object.fromEntries(TYPES[type].fields.map((x) => [x.key, ""])),
  ...(type === "Thesis" ? { contributorName: "", contributorAccessCode: "" } : {}),
});

export default function Contribute() {
  const [type, setType] = useState("Thesis");
  const [form, setForm] = useState(blank("Thesis"));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const user = getCurrentUser();
  const cfg = TYPES[type];

  const update = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const changeType = (next) => {
    setType(next);
    setForm(blank(next));
    setStatus("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    setSaving(true);
    try {
      const payload =
        type === "Thesis"
          ? { ...form, contributorName: user?.name || form.contributorName }
          : form;
      await createContribution(type, payload);
      setStatus(`${cfg.label} submitted successfully. You can view it on the ${cfg.page} page.`);
      setForm(blank(type));
    } catch (err) {
      console.error(err);
      setStatus(
        err?.response?.data?.error ||
          `Unable to submit the ${cfg.label.toLowerCase()}. Please check the required fields.`
      );
    } finally {
      setSaving(false);
    }
  };

  const short = cfg.fields.filter((x) => !x.long);
  const long = cfg.fields.filter((x) => x.long);

  return (
    <DashboardLayout
      title="Contribute Data"
      description="Add a verified record directly to the SMART knowledge graph."
    >
      <Card className="max-w-5xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono">
            Manual intervention · {cfg.label}
          </p>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] mt-2">
            Add a {cfg.label}
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Enter information you have verified yourself. Your signed-in account is recorded as the contributor.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block sm:w-1/2">
            <span className={labelCls}>Record Type</span>
            <select value={type} onChange={(e) => changeType(e.target.value)} className={inputCls}>
              {Object.entries(TYPES).map(([key, t]) => (
                <option key={key} value={key}>{t.label}</option>
              ))}
            </select>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            {short.map((x) => (
              <label key={x.key} className="block">
                <span className={labelCls}>{x.label}</span>
                <input
                  required={!!x.required}
                  type={x.type || "text"}
                  placeholder={x.placeholder}
                  value={form[x.key] ?? ""}
                  onChange={(e) => update(x.key, e.target.value)}
                  className={inputCls}
                />
              </label>
            ))}
          </div>

          {long.map((x) => (
            <label key={x.key} className="block">
              <span className={labelCls}>{x.label}</span>
              <textarea
                value={form[x.key] ?? ""}
                placeholder={x.placeholder}
                rows={x.rows || 4}
                onChange={(e) => update(x.key, e.target.value)}
                className={inputCls}
              />
            </label>
          ))}

          <div className="border-t border-[var(--color-line)] pt-5 grid sm:grid-cols-2 gap-4">
            <div className="text-xs text-[var(--color-muted)] sm:col-span-2">
              Signed in as <strong>{user?.name || "Guest"}</strong> ({user?.role || "not signed in"})
            </div>
            {type === "Thesis" && (
              <>
                <label className="block">
                  <span className={labelCls}>Your Name (optional)</span>
                  <input
                    value={form.contributorName}
                    onChange={(e) => update("contributorName", e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Contributor Access Code</span>
                  <input
                    required
                    type="password"
                    value={form.contributorAccessCode}
                    onChange={(e) => update("contributorAccessCode", e.target.value)}
                    className={inputCls}
                  />
                </label>
              </>
            )}
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
            {saving ? "Submitting…" : `Submit ${cfg.label}`}
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}