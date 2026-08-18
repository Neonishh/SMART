import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel } from "../components/ui";
import { getTrendAnalytics } from "../services/api";

const NAVY = "#16143f";
const OCHRE = "#a9762f";
const MUTED = "#6f6c7f";

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const byYear = analytics?.researchOutput?.byYear || [];
    return byYear.map((row) => row.year);
  }, [analytics]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const params = {};
        if (selectedDomain) params.technology = selectedDomain;
        if (selectedYear) params.year = Number(selectedYear);

        const response = await getTrendAnalytics(params);
        if (!mounted) return;

        setAnalytics(response.data?.data || null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [selectedDomain, selectedYear]);

  const outputByYear = analytics?.researchOutput?.byYear || [];
  const emerging = analytics?.trendEngine?.emergingDomains || [];
  const cagr = analytics?.trendEngine?.domainCAGR || [];
  const publicationTopics = analytics?.nlp?.publicationTopics || [];
  const grantTopics = analytics?.nlp?.grantTopics || [];
  const thesisTopics = analytics?.nlp?.thesisTopics || [];
  const institutionDomain = analytics?.nlp?.institutionAnalysis || [];
  const topResearchers = analytics?.trendEngine?.topResearchers || [];
  const topJournals = analytics?.trendEngine?.topJournals || [];
  const topConferences = analytics?.trendEngine?.topConferences || [];

  const totals = analytics?.researchOutput?.totals || {
    total: 0,
    publications: 0,
    patents: 0,
    grants: 0,
    theses: 0,
  };

  const yoy = analytics?.researchOutput?.yoyGrowthPercent || 0;
  const cagrPercent = analytics?.researchOutput?.cagrPercent || 0;

  return (
    <DashboardLayout title="Analytics" description="Trend engine and NLP insights across the SMART dataset">
      <div className="grid gap-4 mb-4 lg:grid-cols-4">
        <Card>
          <SectionLabel>Domain Filter</SectionLabel>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm"
          >
            <option value="">All domains</option>
            {(analytics?.availableDomains || []).map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <SectionLabel>Year Filter</SectionLabel>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full border border-[var(--color-line)] rounded-sm px-3 py-2 text-sm"
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <SectionLabel>Total Output</SectionLabel>
          <p className="font-serif text-3xl text-[var(--color-ink)]">{totals.total}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Pubs + patents + grants + theses</p>
        </Card>

        <Card>
          <SectionLabel>Growth Snapshot</SectionLabel>
          <p className="text-sm text-[var(--color-muted)]">YoY: <span className="text-[var(--color-ink)] font-semibold">{yoy}%</span></p>
          <p className="text-sm text-[var(--color-muted)] mt-1">CAGR: <span className="text-[var(--color-ink)] font-semibold">{cagrPercent}%</span></p>
        </Card>
      </div>

      {loading ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">Loading analytics...</p>
        </Card>
      ) : (
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-2">
          <SectionLabel>Research Output Trend</SectionLabel>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={outputByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="publications" stroke={NAVY} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="patents" stroke={OCHRE} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="grants" stroke="#2f7d32" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="theses" stroke="#7b3fa1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Emerging Technologies</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={emerging.slice(0, 8)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="domain" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Bar dataKey="research_score" fill={NAVY} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Domain CAGR</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cagr.slice(0, 8)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="domain_name" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Bar dataKey="cagr_percent" fill={OCHRE} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Publication Topic Distribution</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={publicationTopics.slice(0, 8)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="topic" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Bar dataKey="count" fill={NAVY} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Grant and Thesis Topics</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={grantTopics.slice(0, 8).map((g, index) => ({
                topic: g.topic,
                grants: g.count,
                theses: thesisTopics[index]?.count || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="topic" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="grants" stroke={OCHRE} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="theses" stroke="#7b3fa1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <SectionLabel>Institution and Domain Analysis</SectionLabel>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-line)] text-[var(--color-muted)]">
                  <th className="py-2 pr-4">Institution</th>
                  <th className="py-2 pr-4">Domain</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {institutionDomain.slice(0, 10).map((row, index) => (
                  <tr key={`${row.institution}-${row.domain}-${index}`} className="border-b border-[var(--color-line)]/60">
                    <td className="py-2 pr-4">{row.institution}</td>
                    <td className="py-2 pr-4">{row.domain}</td>
                    <td className="py-2 pr-4">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionLabel>Top Researchers</SectionLabel>
          <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
            {topResearchers.slice(0, 10).map((row, idx) => (
              <div key={`${row.researcher}-${idx}`} className="border border-[var(--color-line)] rounded-sm p-2">
                <p className="text-sm font-medium text-[var(--color-ink)]">{row.researcher}</p>
                <p className="text-xs text-[var(--color-muted)]">{row.institution}</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">Score: {row.research_score}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Top Journals and Conferences</SectionLabel>
          <div className="space-y-3 max-h-[280px] overflow-auto pr-1">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Journals</p>
              {topJournals.slice(0, 5).map((row, idx) => (
                <p key={`${row.venue}-${idx}`} className="text-sm text-[var(--color-ink)] mb-1">{row.venue}</p>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Conferences</p>
              {topConferences.slice(0, 5).map((row, idx) => (
                <p key={`${row.venue}-${idx}`} className="text-sm text-[var(--color-ink)] mb-1">{row.venue}</p>
              ))}
            </div>
          </div>
        </Card>
      </div>
      )}
    </DashboardLayout>
  );
}
