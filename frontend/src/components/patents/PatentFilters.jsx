import { useState } from "react";

export default function PatentFilters({
  onApply,
  institutions = [],
  applicants = [],
  ipcCodes = [],
}) {
  const [filters, setFilters] = useState({
    year: "",
    institution: "",
    applicant: "",
    ipc: "",
  });

  function handleChange(e) {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onApply(filters);
  }

  function handleReset() {
    const empty = {
      year: "",
      institution: "",
      applicant: "",
      ipc: "",
    };

    setFilters(empty);
    onApply(empty);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">

      <h2 className="text-base font-semibold mb-4">
        Filter Patents
      </h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3"
      >

        {/* Year */}

        <div>

          <label className="block text-sm font-medium mb-1">
            Year
          </label>

          <select
            name="year"
            value={filters.year}
            onChange={handleChange}
            className="w-full rounded-lg border p-2"
          >
            <option value="">All</option>

            {[2026,2025,2024,2023,2022,2021,2020,2019].map((y)=>(
              <option key={y} value={y}>
                {y}
              </option>
            ))}

          </select>

        </div>

        {/* Institution */}

        <div>

          <label className="block text-sm font-medium mb-1">
            Institution
          </label>

          <select
            name="institution"
            value={filters.institution}
            onChange={handleChange}
            className="w-full rounded-lg border py-2 px-3"
          >

            <option value="">All</option>

            {institutions.map((i)=>(
              <option key={i} value={i}>
                {i}
              </option>
            ))}

          </select>

        </div>

        {/* Applicant */}

        <div>

          <label className="block text-sm font-medium mb-1">
            Applicant
          </label>

          <select
            name="applicant"
            value={filters.applicant}
            onChange={handleChange}
            className="w-full rounded-lg border p-2"
          >

            <option value="">All</option>

            {applicants.map((a)=>(
              <option key={a} value={a}>
                {a}
              </option>
            ))}

          </select>

        </div>

        {/* IPC */}

        <div>

          <label className="block text-sm font-medium mb-1">
            IPC
          </label>

          <select
            name="ipc"
            value={filters.ipc}
            onChange={handleChange}
            className="w-full rounded-lg border p-2"
          >

            <option value="">All</option>

            {ipcCodes.map((code)=>(
              <option key={code} value={code}>
                {code}
              </option>
            ))}

          </select>

        </div>

        {/* Buttons */}

        <div className="flex items-end gap-2">

          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex-1 border rounded-lg px-4 py-2"
          >
            Reset
          </button>

        </div>

      </form>

    </div>
  );
}