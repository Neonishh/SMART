import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge, SectionLabel } from "../components/ui.jsx";

import { getManualEntrySchemas, submitManualEntry } from "../services/api";

import {
  fieldLabel,
  inputTypeFor,
  LONG_TEXT_FIELDS,
} from "../data/manualEntryFieldMeta";

const TYPES = ["Publication", "Patent", "Thesis", "Grant"];

function emptyPayload(fields) {
  const payload = {};
  fields.forEach((f) => (payload[f] = ""));
  return payload;
}

export default function Contribute() {
  const [schemas, setSchemas] = useState(null);
  const [schemaError, setSchemaError] = useState("");

  const [type, setType] = useState("Publication");
  const [payload, setPayload] = useState({});
  const [submittedBy, setSubmittedBy] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    getManualEntrySchemas()
      .then((res) => setSchemas(res.data.data))
      .catch(() => setSchemaError("Couldn't load the form schema from the server."));
  }, []);

  useEffect(() => {
    if (schemas && schemas[type]) {
      setPayload(emptyPayload(schemas[type]));
    }
  }, [schemas, type]);

  const fields = schemas?.[type] || [];

  function handleFieldChange(field, value) {
    setPayload((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setStatusMessage("");

    try {
      await submitManualEntry({ type, payload, submittedBy, accessCode });
      setStatus("success");
      setStatusMessage(`${type} submitted. It'll show up under "Recently Contributed" on the ${type}s page — it isn't part of the NLP pipeline or knowledge graph yet.`);
      setPayload(emptyPayload(fields));
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err?.response?.data?.message || "Something went wrong submitting this entry."
      );
    }
  }

  return (
    <DashboardLayout
      title="Contribute Data"
      description="Add a record you've verified yourself. Fields match the collected dataset schema exactly, so contributed data stays uniform with scraped data."
    >
      <div className="max-w-3xl">
        <Card className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <SectionLabel>Before you submit</SectionLabel>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                Submitted records are stored separately from the live dashboard data.
                They appear in a clearly labeled "Recently Contributed" section on the
                matching page, but won't be part of analytics, search, or the knowledge
                graph until they're run through the NLP pipeline.
              </p>
            </div>
            <Badge tone="accent">Not yet processed</Badge>
          </div>
        </Card>

        {schemaError && (
          <Card className="mb-6 border-red-200">
            <p className="text-sm text-red-600">{schemaError}</p>
          </Card>
        )}

        <Card>
          <div className="mb-6">
            <SectionLabel>Record type</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-sm text-sm font-medium border transition-colors ${
                    type === t
                      ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]"
                      : "bg-white text-[var(--color-ink)] border-[var(--color-line)] hover:bg-[var(--color-paper-dim)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!schemas ? (
            <p className="text-sm text-[var(--color-muted)]">Loading form…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div
                    key={field}
                    className={LONG_TEXT_FIELDS.has(field) ? "sm:col-span-2" : ""}
                  >
                    <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
                      {fieldLabel(field)}
                    </label>
                    {LONG_TEXT_FIELDS.has(field) ? (
                      <textarea
                        rows={3}
                        value={payload[field] || ""}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                      />
                    ) : (
                      <input
                        type={inputTypeFor(field)}
                        value={payload[field] || ""}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--color-line)] pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
                    Your name (optional)
                  </label>
                  <input
                    type="text"
                    value={submittedBy}
                    onChange={(e) => setSubmittedBy(e.target.value)}
                    className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-1.5">
                    Contributor access code
                  </label>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                  />
                </div>
              </div>

              {statusMessage && (
                <p
                  className={`text-sm ${
                    status === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="px-5 py-2.5 rounded-sm text-sm font-medium bg-[var(--color-navy)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {status === "submitting" ? "Submitting…" : `Submit ${type}`}
              </button>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
