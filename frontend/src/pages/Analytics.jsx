import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel } from "../components/ui";
import { getPublicationAnalytics, getPatentAnalytics } from "../services/api";

const NAVY = "#16143f";
const OCHRE = "#a9762f";
const PIE_COLORS = ["#16143f", "#a9762f", "#6f6c7f", "#c9b896", "#2c2a5c"];

export default function Analytics() {
  const [pubData, setPubData] = useState(null);
  const [patentData, setPatentData] = useState(null);

  useEffect(() => {
    getPublicationAnalytics().then((res) => setPubData(res.data));
    getPatentAnalytics().then((res) => setPatentData(res.data));
  }, []);

  return (
    <DashboardLayout title="Analytics" description="Trends across publications, patents, and funding">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>Publications by institution</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pubData?.byInstitution || []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="institution" tick={{ fontSize: 10, fill: "#6f6c7f" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Bar dataKey="publications" fill={NAVY} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Funding distribution by agency</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={patentData?.fundingDistribution || []}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {(patentData?.fundingDistribution || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <SectionLabel>Patent filings vs. grants</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={patentData?.growth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="filed" name="Filed" stroke={NAVY} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="granted" name="Granted" stroke={OCHRE} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </DashboardLayout>
  );
}
