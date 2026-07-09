import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import PatentModal from "../components/modals/PatentModal";
import {
    listPatents,
    getPatentAnalytics,
    getPatent
} from "../services/api";

import PatentFilters from "../components/patents/PatentFilters";
import PatentTable from "../components/patents/PatentTable";
import PatentGrowthChart from "../components/patents/PatentGrowthChart";
import IPCDistributionChart from "../components/patents/IPCDistributionChart";

const PATENTS_PER_PAGE = 5;

export default function Patents() {

    const [loading, setLoading] = useState(true);

    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const [error, setError] = useState("");

    const [patents, setPatents] = useState([]);

    const [selectedPatent, setSelectedPatent] = useState(null);

    const [searchInput, setSearchInput] = useState("");

    const [appliedSearch, setAppliedSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const [pagination, setPagination] = useState({

        total: 0,

        totalPages: 1,

        page: 1,

        limit: PATENTS_PER_PAGE

    });

    const [filters, setFilters] = useState({

        year: "",

        institution: "",

        applicant: "",

        ipc: ""

    });

    const [facets, setFacets] = useState({

        institutions: [],

        applicants: [],

        ipcCodes: []

    });

    const [analytics, setAnalytics] = useState({

        growth: [],

        ipcDistribution: [],

        topApplicants: []

    });

    useEffect(() => {

        async function loadAnalytics() {

            try {

                setAnalyticsLoading(true);

                const analyticsResponse = await getPatentAnalytics();

                const analyticsData = analyticsResponse.data.data ?? analyticsResponse.data ?? {};

                setAnalytics({

                    growth: analyticsData.growth ?? [],

                    ipcDistribution: analyticsData.ipcDistribution ?? analyticsData.fundingDistribution ?? [],

                    topApplicants: analyticsData.topApplicants ?? []

                });

            } catch (err) {

                console.error(err);

            } finally {

                setAnalyticsLoading(false);

            }

        }

        loadAnalytics();

    }, []);

    useEffect(() => {

        async function loadPatents() {

            try {

                setLoading(true);

                setError("");

                const response = await listPatents({

                    page: currentPage,

                    limit: PATENTS_PER_PAGE,

                    search: appliedSearch,

                    ...filters

                });

                const payload = response.data ?? {};

                setPatents(payload.data ?? []);

                setPagination({

                    total: payload.count ?? 0,

                    totalPages: payload.totalPages ?? 1,

                    page: payload.page ?? currentPage,

                    limit: payload.limit ?? PATENTS_PER_PAGE

                });

                setFacets(payload.facets ?? {

                    institutions: [],

                    applicants: [],

                    ipcCodes: []

                });

            } catch (err) {

                console.error(err);

                setError("Unable to load patents.");

            } finally {

                setLoading(false);

            }

        }

        loadPatents();

    }, [currentPage, appliedSearch, filters]);

    // Fix 2: lock background scroll while the modal is open
    useEffect(() => {

        if (selectedPatent) {

            document.body.style.overflow = "hidden";

        } else {

            document.body.style.overflow = "auto";

        }

        return () => {

            document.body.style.overflow = "auto";

        };

    }, [selectedPatent]);

    async function handleViewPatent(id) {

        try {

            const response = await getPatent(id);

            setSelectedPatent(response.data.data);

        } catch (err) {

            console.error(err);

        }

    }

    function handleSearchSubmit(event) {

        event.preventDefault();

        setCurrentPage(1);

        setAppliedSearch(searchInput.trim());

    }

    function handleApplyFilters(newFilters) {

        setCurrentPage(1);

        setFilters(newFilters);

    }

    const startItem = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.limit + 1;

    const endItem = Math.min(currentPage * pagination.limit, pagination.total);

    const displayLoading = loading || analyticsLoading;

    return (

        <DashboardLayout
        title="Patent Explorer"
        description="Innovation tracking using the SMART Knowledge Graph"
        >

            <div className="p-6 space-y-6">

            

                {error && (

                    <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">

                        {error}

                    </div>

                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">Patents</p>

                        <h2 className="text-2xl font-bold mt-2">{pagination.total}</h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">Applicants</p>

                        <h2 className="text-2xl font-bold mt-2">{facets.applicants.length}</h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">Institutions</p>

                        <h2 className="text-2xl font-bold mt-2">{facets.institutions.length}</h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">IPC Codes</p>

                        <h2 className="text-2xl font-bold mt-2">{facets.ipcCodes.length}</h2>

                    </div>

                </div>
            <PatentFilters
                institutions={facets.institutions}
                applicants={facets.applicants}
                ipcCodes={facets.ipcCodes}
                onApply={handleApplyFilters}
            />
                <form
                    onSubmit={handleSearchSubmit}
                    className="bg-white rounded-xl shadow border p-4"
                >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                        <input
                            type="text"
                            placeholder="Search patents by title, applicant, institution, IPC, or field..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="w-full flex-1 border rounded-lg px-4 py-3"
                        />

                        <button
                            type="submit"
                            className="sm:ml-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                            Search
                        </button>

                    </div>

                </form>

                <section className="space-y-4">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                        <div>

                            <h2 className="text-xl font-semibold">Search Results</h2>

                            <p className="text-gray-500 text-sm">

                                {appliedSearch
                                    ? `Matching "${appliedSearch}"`
                                    : "Showing the current patent page from Neo4j"}

                            </p>

                        </div>

                        <p className="text-sm text-gray-600">

                            Showing {startItem}-{endItem} of {pagination.total} patents

                        </p>

                    </div>

                    <PatentTable
                        patents={patents}
                        loading={displayLoading}
                        onView={handleViewPatent}
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl shadow border px-5 py-4">

                        <p className="text-sm text-gray-600">

                            Page {pagination.page} of {pagination.totalPages}

                        </p>

                        <div className="flex items-center gap-2">

                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>

                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(page + 1, pagination.totalPages))}
                                disabled={currentPage >= pagination.totalPages}
                                className="px-4 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Next
                            </button>

                        </div>

                    </div>

                </section>

                <div className="grid lg:grid-cols-2 gap-6">

                    <PatentGrowthChart
                        data={analytics.growth}
                        loading={displayLoading}
                    />

                    <IPCDistributionChart
                        data={analytics.ipcDistribution}
                        loading={displayLoading}
                    />

                </div>

                <div className="bg-white rounded-xl shadow border p-6">

                    <div className="flex items-center justify-between mb-5">

                        <div>

                            <h2 className="text-xl font-semibold">Top Patent Applicants</h2>

                            <p className="text-gray-500 text-sm">

                                Applicants with the highest number of patents

                            </p>

                        </div>

                    </div>

                    {analytics.topApplicants.length === 0 ? (

                        <div className="text-gray-500">No applicant statistics available.</div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-gray-100">

                                    <tr>

                                        <th className="text-left px-4 py-3">Applicant</th>

                                        <th className="text-right px-4 py-3">Patents</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {analytics.topApplicants.map((row, index) => (

                                        <tr
                                            key={`${row.applicant}-${index}`}
                                            className="border-b"
                                        >

                                            <td className="px-4 py-3">{row.applicant}</td>

                                            <td className="px-4 py-3 text-right font-semibold">{row.patents}</td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

            <PatentModal
    patent={selectedPatent}
    onClose={() => setSelectedPatent(null)}
/>

</DashboardLayout>

);
}