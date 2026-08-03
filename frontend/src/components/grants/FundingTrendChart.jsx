import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

function formatFunding(value) {
  if (!value) return "₹0";

  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)} Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)} L`;
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

export default function FundingTrendChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow border p-6 h-[400px] flex items-center justify-center text-gray-500">
        Loading funding trend...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow border p-6 h-[400px] flex items-center justify-center text-gray-500">
        No funding trend data available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Funding Trend
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Year-wise funding awarded and number of grants
        </p>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={data}
          margin={{
            top: 15,
            right: 35,
            left: 15,
            bottom: 10
          }}
        >
          <CartesianGrid
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="year"
            tick={{
              fontSize: 13,
              fill: "#475569"
            }}
          />

          {/* LEFT AXIS - FUNDING */}

          <YAxis
            yAxisId="funding"
            tickFormatter={formatFunding}
            tick={{
              fontSize: 12,
              fill: "#475569"
            }}
          />

          {/* RIGHT AXIS - GRANTS */}

          <YAxis
            yAxisId="grants"
            orientation="right"
            allowDecimals={false}
            tick={{
              fontSize: 12,
              fill: "#475569"
            }}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #CBD5E1",
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)"
            }}
            formatter={(value, name) => {
              if (name === "Funding") {
                return [formatFunding(value), "Funding"];
              }

              return [value, "Grants"];
            }}
          />

          <Legend
            verticalAlign="top"
            height={40}
          />

          <Line
            yAxisId="funding"
            type="monotone"
            dataKey="funding"
            name="Funding"
            stroke="#4F46E5"
            strokeWidth={3}
            dot={{
              r: 5,
              fill: "#4F46E5"
            }}
            activeDot={{
              r: 7
            }}
            animationDuration={800}
          />

          <Line
            yAxisId="grants"
            type="monotone"
            dataKey="grants"
            name="Grants"
            stroke="#0EA5E9"
            strokeWidth={3}
            dot={{
              r: 5,
              fill: "#0EA5E9"
            }}
            activeDot={{
              r: 7
            }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}