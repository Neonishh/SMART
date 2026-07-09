import {
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function IPCDistributionChart({

    data = [],
    loading = false

}) {

    if (loading) {

        return (

            <div className="bg-white rounded-xl shadow-sm border p-5 h-[420px] flex items-center justify-center">

                <p className="text-gray-500">

                    Loading IPC Distribution...

                </p>

            </div>

        );

    }

    return (

        <div className="bg-white rounded-xl shadow-sm border p-5">

            <div className="flex items-center justify-between mb-5">

                <div>

                    <h2 className="text-xl font-semibold">

                        IPC Distribution

                    </h2>

                    <p className="text-sm text-gray-500">

                        Top patent classifications

                    </p>

                </div>

            </div>

            <ResponsiveContainer
                width="100%"
                height={300}
            >

                <BarChart

                    layout="vertical"

                    data={data}

                    margin={{
                        top: 10,
                        right: 30,
                        left: 40,
                        bottom: 10
                    }}

                >

                    <CartesianGrid strokeDasharray="3 3"/>

                    <XAxis
                        type="number"
                    />

                    <YAxis

                        type="category"

                        dataKey="ipc"

                        width={90}

                    />

                    <Tooltip/>

                    <Bar

                        dataKey="patents"

                        radius={[0,4,4,0]}

                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    );

}