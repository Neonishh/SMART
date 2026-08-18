import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel } from "../components/ui";
import {
  downloadTechnologyReport,
  generateTechnologyReport,
  getTrendAnalytics,
  listTechnologyDomains,
} from "../services/api";

function saveBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function getFileNameFromHeaders(headers, fallback) {
  const disposition = headers["content-disposition"] || "";
  const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
  return match?.[1] || fallback;
}

export default function Reports() {
  const [domains, setDomains] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [technology, setTechnology] = useState("");
  const [year, setYear] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");

  const canGenerate = technology && year && !loading;

  const researcherRows = useMemo(() => report?.top_researchers || [], [report]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setBooting(true);
        const [domainResponse, trendResponse] = await Promise.all([
          listTechnologyDomains(),
          getTrendAnalytics(),
        ]);

        if (!mounted) return;

        const domainList = domainResponse.data?.data || [];
        setDomains(domainList);
        setTechnology(domainList[0] || "");

        const byYear = trendResponse.data?.data?.researchOutput?.byYear || [];
        const years = byYear.map((row) => row.year).sort((a, b) => b - a);
        setAvailableYears(years);
        setYear(years[0] || "");
      } catch (bootstrapError) {
        if (mounted) setError(bootstrapError.message || "Failed to load report filters.");
      } finally {
        if (mounted) setBooting(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleGenerate() {
    if (!technology || !year) return;

    try {
      setLoading(true);
      setError("");

      const response = await generateTechnologyReport(technology, Number(year));
      setReport(response.data?.report || null);

      if (response.data?.warning) {
        setError(response.data.warning);
      }
    } catch (generateError) {
      setError(generateError?.response?.data?.message || generateError.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(format) {
    try {
      setLoading(true);
      const response = await downloadTechnologyReport(technology, Number(year), format);
      const fallbackName = `${technology.toLowerCase().replace(/\s+/g, "_")}_${year}.${format}`;
      const fileName = getFileNameFromHeaders(response.headers || {}, fallbackName);
      saveBlob(response.data, fileName);
    } catch (downloadError) {
      setError(downloadError?.response?.data?.message || downloadError.message || "Failed to download report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout
      title="Reports"
      description="Generate technology-specific research reports with trend and NLP signals"
    >
      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <SectionLabel>Technology</SectionLabel>
          <select
            value={technology}
            onChange={(e) => setTechnology(e.target.value)}
            className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm"
            disabled={booting}
          >
            <option value="">Select technology</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <SectionLabel>Year</SectionLabel>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm"
            disabled={booting}
          >
            <option value="">Select year</option>
            {availableYears.map((entryYear) => (
              <option key={entryYear} value={entryYear}>
                {entryYear}
              </option>
            ))}
          </select>
        </Card>

        <Card className="lg:col-span-2">
          <SectionLabel>Actions</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || booting}
              className="px-4 py-2 rounded-sm bg-[var(--color-navy)] text-white text-sm disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("json")}
              disabled={!report || loading}
              className="px-4 py-2 rounded-sm border border-[var(--color-line-dark)] text-[var(--color-navy)] text-sm disabled:opacity-50"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={() => handleDownload("pdf")}
              disabled={!report || loading}
              className="px-4 py-2 rounded-sm border border-[var(--color-line-dark)] text-[var(--color-navy)] text-sm disabled:opacity-50"
            >
              Download PDF
            </button>
          </div>
        </Card>
      </div>

      {error ? (
        <Card className="mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {!report ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Select a technology and year, then generate a report to view executive summary, output totals, growth metrics, researchers, and recommendations.
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="lg:col-span-2">
            <SectionLabel>Executive Summary</SectionLabel>
            <p className="text-sm leading-7 text-[var(--color-ink)]">{report.executive_summary}</p>
          </Card>

          <Card>
            <SectionLabel>Research Output Totals</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>Publications: <span className="font-semibold">{report.publication_statistics?.publications ?? 0}</span></div>
              <div>Patents: <span className="font-semibold">{report.publication_statistics?.patents ?? 0}</span></div>
              <div>Grants: <span className="font-semibold">{report.publication_statistics?.grants ?? 0}</span></div>
              <div>Theses: <span className="font-semibold">{report.publication_statistics?.theses ?? 0}</span></div>
              <div className="col-span-2">Total Output: <span className="font-semibold">{report.publication_statistics?.total_output ?? 0}</span></div>
            </div>
          </Card>

          <Card>
            <SectionLabel>Growth Metrics</SectionLabel>
            <p className="text-sm text-[var(--color-muted)] mb-1">
              YoY Growth: <span className="text-[var(--color-ink)] font-semibold">{report.growth_statistics?.yoy_growth_percent ?? 0}%</span>
            </p>
            <p className="text-sm text-[var(--color-muted)] mb-1">
              CAGR: <span className="text-[var(--color-ink)] font-semibold">{report.growth_statistics?.cagr_percent ?? 0}%</span>
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              Avg Grant Impact: <span className="text-[var(--color-ink)] font-semibold">{report.grant_statistics?.average_impact_score ?? 0}</span>
            </p>
          </Card>

          <Card>
            <SectionLabel>Top Researchers</SectionLabel>
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--color-line)] text-[var(--color-muted)]">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Institution</th>
                    <th className="py-2 pr-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {researcherRows.map((row, index) => (
                    <tr key={`${row.researcher}-${index}`} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-3">{row.researcher}</td>
                      <td className="py-2 pr-3">{row.institution}</td>
                      <td className="py-2 pr-3">{row.research_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionLabel>Recommendations</SectionLabel>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--color-ink)]">
              {(report.recommendations || []).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
