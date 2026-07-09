import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function PatentGrowthChart({

    data = [],
    loading = false

}) {

    if (loading) {

        return (

            <div className="bg-white rounded-xl shadow-sm border p-5 h-[420px] flex items-center justify-center">

                <p className="text-gray-500">

                    Loading Patent Growth...

                </p>

            </div>

        );

    }

    return (

        <div className="bg-white rounded-xl shadow-sm border p-5">

            <div className="flex items-center justify-between mb-5">

                <div>

                    <h2 className="text-xl font-semibold">

                        Patent Growth

                    </h2>

                    <p className="text-sm text-gray-500">

                        Number of patents filed each year

                    </p>

                </div>

            </div>

            <ResponsiveContainer
                width="100%"
                height={300}
            >

                <LineChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 10
                    }}
                >

                    <CartesianGrid strokeDasharray="3 3"/>

                    <XAxis

                        dataKey="year"

                    />

                    <YAxis/>

                    <Tooltip/>

                    <Line

                        type="monotone"

                        dataKey="patents"

                        stroke="#2563eb"

                        strokeWidth={3}

                        dot={{ r:4 }}

                        activeDot={{ r:7 }}

                    />

                </LineChart>

            </ResponsiveContainer>

        </div>

    );

}