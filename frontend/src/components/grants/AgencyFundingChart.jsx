import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip
} from "recharts";

export default function AgencyFundingChart({

    data,

    loading

}) {

    if (loading) {

        return (

            <div className="bg-white rounded-xl shadow border p-6 h-[340px] flex items-center justify-center text-gray-500">

                Loading funding agencies...

            </div>

        );

    }

    if (!data || data.length === 0) {

        return (

            <div className="bg-white rounded-xl shadow border p-6 h-[340px] flex items-center justify-center text-gray-500">

                No funding agency statistics available.

            </div>

        );

    }

    return (

        <div className="bg-white rounded-xl shadow border p-6">

            <div className="mb-4">

                <h2 className="text-lg font-semibold">

                    Top Funding Agencies

                </h2>

                <p className="text-gray-500 text-sm">

                    Agencies funding the highest number of grants

                </p>

            </div>

            <ResponsiveContainer
                width="100%"
                height={300}
            >

                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{
                        top: 5,
                        right: 20,
                        left: 50,
                        bottom: 5
                    }}
                >

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        type="number"
                    />

                    <YAxis
                        dataKey="agency"
                        type="category"
                        width={140}
                    />

                    <Tooltip
                        formatter={(value, name) => {

                            if (name === "funding") {

                                return [

                                    `₹${Number(value).toLocaleString()}`,

                                    "Funding"

                                ];

                            }

                            return [value, "Grants"];

                        }}
                    />

                    <Bar
                        dataKey="grants"
                        fill="#2563eb"
                        radius={[0, 4, 4, 0]}
                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    );

}