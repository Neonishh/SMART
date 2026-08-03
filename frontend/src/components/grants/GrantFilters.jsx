import { useState } from "react";

export default function GrantFilters({

    institutions,

    agencies,

    principalInvestigators,

    onApply

}) {

    const [year, setYear] = useState("");

    const [institution, setInstitution] = useState("");

    const [agency, setAgency] = useState("");

    const [pi, setPI] = useState("");

    function applyFilters() {

        onApply({

            year,

            institution,

            agency,

            pi

        });

    }

    function clearFilters() {

        setYear("");

        setInstitution("");

        setAgency("");

        setPI("");

        onApply({

            year: "",

            institution: "",

            agency: "",

            pi: ""

        });

    }

    return (

        <div className="bg-white rounded-xl shadow border p-4">

            <div className="flex items-center justify-between mb-4">

                <div>

                    <h2 className="text-lg font-semibold">

                        Filter Grants

                    </h2>

                    <p className="text-gray-500 text-sm">

                        Narrow down grants using the filters below.

                    </p>

                </div>

                <button

                    onClick={clearFilters}

                    className="text-sm text-red-600 hover:text-red-700"

                >

                    Clear Filters

                </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* YEAR */}

                <div>

                    <label className="block text-sm font-medium mb-2">

                        Year

                    </label>

                    <select

                        value={year}

                        onChange={(e) => setYear(e.target.value)}

                        className="w-full border rounded-lg px-3 py-2"

                    >

                        <option value="">

                            All Years

                        </option>

                        {Array.from(

                            { length: 8 },

                            (_, i) => 2019 + i

                        ).map((yr) => (

                            <option

                                key={yr}

                                value={yr}

                            >

                                {yr}

                            </option>

                        ))}

                    </select>

                </div>

                {/* INSTITUTION */}

                <div>

                    <label className="block text-sm font-medium mb-2">

                        Institution

                    </label>

                    <select

                        value={institution}

                        onChange={(e) =>

                            setInstitution(e.target.value)

                        }

                        className="w-full border rounded-lg px-3 py-2"

                    >

                        <option value="">

                            All Institutions

                        </option>

                        {institutions.map((item) => (

                            <option

                                key={item}

                                value={item}

                            >

                                {item}

                            </option>

                        ))}

                    </select>

                </div>

                {/* FUNDING AGENCY */}

                <div>

                    <label className="block text-sm font-medium mb-2">

                        Funding Agency

                    </label>

                    <select

                        value={agency}

                        onChange={(e) =>

                            setAgency(e.target.value)

                        }

                        className="w-full border rounded-lg px-3 py-2"

                    >

                        <option value="">

                            All Agencies

                        </option>

                        {agencies.map((item) => (

                            <option

                                key={item}

                                value={item}

                            >

                                {item}

                            </option>

                        ))}

                    </select>

                </div>

                {/* PI */}

                <div>

                    <label className="block text-sm font-medium mb-2">

                        Principal Investigator

                    </label>

                    <select

                        value={pi}

                        onChange={(e) =>

                            setPI(e.target.value)

                        }

                        className="w-full border rounded-lg px-3 py-2"

                    >

                        <option value="">

                            All PIs

                        </option>

                        {principalInvestigators.map((item) => (

                            <option

                                key={item}

                                value={item}

                            >

                                {item}

                            </option>

                        ))}

                    </select>

                </div>

            </div>

            <div className="flex justify-end gap-3 mt-6">

                <button

                    onClick={clearFilters}

                    className="px-5 py-2 rounded-lg border hover:bg-gray-100 transition"

                >

                    Reset

                </button>

                <button

                    onClick={applyFilters}

                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"

                >

                    Apply Filters

                </button>

            </div>

        </div>

    );

}