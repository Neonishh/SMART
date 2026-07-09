import { useState } from "react";

export default function PatentTable({
  patents = [],
  onView,
  loading = false,
}) {
  const [sortField, setSortField] = useState("year");
  const [ascending, setAscending] = useState(false);

  function handleSort(field) {
    if (sortField === field) {
      setAscending(!ascending);
    } else {
      setSortField(field);
      setAscending(true);
    }
  }

  const sortedPatents = [...patents].sort((a, b) => {
    const x = a[sortField] ?? "";
    const y = b[sortField] ?? "";

    if (typeof x === "number" && typeof y === "number") {
      return ascending ? x - y : y - x;
    }

    return ascending
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
        <div className="text-gray-500 text-lg">
          Loading patents...
        </div>
      </div>
    );
  }

  if (sortedPatents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
        <div className="text-gray-500 text-lg">
          No patents found.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

      <div className="px-5 py-3 border-b">

        <h2 className="text-xl font-semibold">
          Patent Explorer
        </h2>

        <p className="text-gray-500 text-sm mt-1">
          Showing {sortedPatents.length} patents
        </p>

      </div>

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-gray-50">

            <tr>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("title")}
              >
                Patent Title
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("applicant")}
              >
                Applicant
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("institution")}
              >
                Institution
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("ipc")}
              >
                IPC
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("field")}
              >
                Field
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("year")}
              >
                Year
              </th>

              <th
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => handleSort("status")}
              >
                Status
              </th>

              <th className="px-4 py-3 text-center">
                Details
              </th>

            </tr>

          </thead>

          <tbody>

            {sortedPatents.map((patent) => (

              <tr
                key={patent.id}
                className="border-b hover:bg-gray-50"
              >

                <td className="px-4 py-3 max-w-md">

                  <div className="font-medium">
                    {patent.title}
                  </div>

                </td>

                <td className="px-4 py-3">
                  {patent.applicant || "-"}
                </td>

                <td className="px-4 py-3">
                  {patent.institution || "-"}
                </td>

                <td className="px-4 py-3">
                  {patent.ipc || "-"}
                </td>

                <td className="px-4 py-3">
                  {patent.field || "-"}
                </td>

                <td className="px-4 py-3">
                  {patent.year}
                </td>

                <td className="px-4 py-3">

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      patent.status === "Granted"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {patent.status}
                  </span>

                </td>

                <td className="px-4 py-3 text-center">

                  <button
                    onClick={() => onView(patent.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
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