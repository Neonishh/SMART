import React from "react";

export default function GrantTable({

    grants,

    loading,

    onView

}) {

    if (loading) {

        return (

            <div className="bg-white rounded-xl shadow border p-8 text-center text-gray-500">

                Loading grants...

            </div>

        );

    }

    if (!grants.length) {

        return (

            <div className="bg-white rounded-xl shadow border p-8 text-center text-gray-500">

                No grants found.

            </div>

        );

    }

    return (

        <div className="bg-white rounded-xl shadow border overflow-hidden">

            <div className="overflow-x-auto">

                <table className="min-w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="text-left px-5 py-3">

                                Grant Title

                            </th>

                            <th className="text-left px-5 py-3">

                                PI

                            </th>

                            <th className="text-left px-5 py-3">

                                Institution

                            </th>

                            <th className="text-left px-5 py-3">

                                Funding Agency

                            </th>

                            <th className="text-right px-5 py-3">

                                Amount

                            </th>

                            <th className="text-center px-5 py-3">

                                Year

                            </th>

                            <th className="text-center px-5 py-3">

                                Action

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {grants.map((grant) => (

                            <tr

                                key={grant.id}

                                className="border-b hover:bg-gray-50"

                            >

                                <td className="px-5 py-3">

                                    <div className="font-medium">

                                        {grant.title}

                                    </div>

                                </td>

                                <td className="px-5 py-3">

                                    {grant.pi || "-"}

                                </td>

                                <td className="px-5 py-3">

                                    {grant.institution || "-"}

                                </td>

                                <td className="px-5 py-3">

                                    {grant.agency || "-"}

                                </td>

                                <td className="px-5 py-3 text-right">

                                    {grant.amount

                                        ? `₹${Number(

                                            grant.amount

                                        ).toLocaleString()}`

                                        : "-"}

                                </td>

                                <td className="px-5 py-3 text-center">

                                    {grant.year}

                                </td>

                                <td className="px-5 py-3 text-center">

                                    <button

                                        onClick={() =>

                                            onView(grant.id)

                                        }

                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"

                                    >

                                        View

                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}