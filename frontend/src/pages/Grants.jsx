import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";

import GrantModal from "../components/modals/GrantModal";

import {
    listGrants,
    getGrant,
    getGrantAnalytics
} from "../services/api";

import GrantFilters from "../components/grants/GrantFilters";

import GrantTable from "../components/grants/GrantTable";

import FundingTrendChart from "../components/grants/FundingTrendChart";

import AgencyFundingChart from "../components/grants/AgencyFundingChart";

const GRANTS_PER_PAGE = 10;

export default function Grants() {

    const [loading, setLoading] = useState(true);

    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const [error, setError] = useState("");

    const [grants, setGrants] = useState([]);

    const [selectedGrant, setSelectedGrant] = useState(null);

    const [searchInput, setSearchInput] = useState("");

    const [appliedSearch, setAppliedSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const [pagination, setPagination] = useState({

        total: 0,

        totalPages: 1,

        page: 1,

        limit: GRANTS_PER_PAGE

    });

    const [filters, setFilters] = useState({

        year: "",

        institution: "",

        agency: "",

        pi: ""

    });

    const [facets, setFacets] = useState({

        institutions: [],

        agencies: [],

        principalInvestigators: []

    });

    const [analytics, setAnalytics] = useState({

        overview: {

            totalGrants: 0,

            totalFunding: 0,

            totalAgencies: 0,

            totalInstitutions: 0

        },

        fundingTrend: [],

        agencyFunding: [],

        institutionFunding: []

    });

    /*
    =========================================================
    LOAD ANALYTICS
    =========================================================
    */

    useEffect(() => {

        async function loadAnalytics() {

            try {

                setAnalyticsLoading(true);

                const response =
                    await getGrantAnalytics();

                const data =
                    response.data.data ??
                    response.data ??
                    {};

                setAnalytics({

                    overview:
                        data.overview ?? {},

                    fundingTrend:
                        data.fundingTrend ?? [],

                    agencyFunding:
                        data.agencyFunding ?? [],

                    institutionFunding:
                        data.institutionFunding ?? []

                });

            }

            catch (err) {

                console.error(err);

            }

            finally {

                setAnalyticsLoading(false);

            }

        }

        loadAnalytics();

    }, []);

    /*
    =========================================================
    LOAD GRANTS
    =========================================================
    */

    useEffect(() => {

        async function loadGrants() {

            try {

                setLoading(true);

                setError("");

                const response =
                    await listGrants({

                        page: currentPage,

                        limit: GRANTS_PER_PAGE,

                        search: appliedSearch,

                        ...filters

                    });

                const payload =
                    response.data ?? {};

                setGrants(
                    payload.data ?? []
                );

                setPagination({

                    total:
                        payload.count ?? 0,

                    totalPages:
                        payload.totalPages ?? 1,

                    page:
                        payload.page ?? currentPage,

                    limit:
                        payload.limit ?? GRANTS_PER_PAGE

                });

                setFacets(

                    payload.facets ?? {

                        institutions: [],

                        agencies: [],

                        principalInvestigators: []

                    }

                );

            }

            catch (err) {

                console.error(err);

                setError("Unable to load grants.");

            }

            finally {

                setLoading(false);

            }

        }

        loadGrants();

    }, [

        currentPage,

        appliedSearch,

        filters

    ]);

    /*
    =========================================================
    LOCK BODY SCROLL
    =========================================================
    */

    useEffect(() => {

        if (selectedGrant) {

            document.body.style.overflow = "hidden";

        }

        else {

            document.body.style.overflow = "auto";

        }

        return () => {

            document.body.style.overflow = "auto";

        };

    }, [selectedGrant]);
    /*
    =========================================================
    VIEW GRANT
    =========================================================
    */

    async function handleViewGrant(id) {

        try {

            const response =
                await getGrant(id);

            setSelectedGrant(
                response.data.data
            );

        }

        catch (err) {

            console.error(err);

        }

    }

    /*
    =========================================================
    SEARCH
    =========================================================
    */

    function handleSearchSubmit(event) {

        event.preventDefault();

        setCurrentPage(1);

        setAppliedSearch(

            searchInput.trim()

        );

    }

    /*
    =========================================================
    FILTERS
    =========================================================
    */

    function handleApplyFilters(newFilters) {

        setCurrentPage(1);

        setFilters(newFilters);

    }

    const startItem =
        pagination.total === 0
            ? 0
            : (currentPage - 1) * pagination.limit + 1;

    const endItem =
        Math.min(

            currentPage * pagination.limit,

            pagination.total

        );

    const displayLoading =
        loading || analyticsLoading;

    return (

        <DashboardLayout

            title="Grant Explorer"

            description="Funding analysis using the SMART Knowledge Graph"

        >

            <div className="p-6 space-y-6">

                {error && (

                    <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">

                        {error}

                    </div>

                )}

                {/* ===========================
                    OVERVIEW CARDS
                =========================== */}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">

                            Grants

                        </p>

                        <h2 className="text-2xl font-bold mt-2">

                            {analytics.overview.totalGrants}

                        </h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">

                            Funding Agencies

                        </p>

                        <h2 className="text-2xl font-bold mt-2">

                            {analytics.overview.totalAgencies}

                        </h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">

                            Institutions

                        </p>

                        <h2 className="text-2xl font-bold mt-2">

                            {analytics.overview.totalInstitutions}

                        </h2>

                    </div>

                    <div className="bg-white rounded-xl shadow border p-4">

                        <p className="text-gray-500 text-sm">

                            Total Funding

                        </p>

                        <h2 className="text-2xl font-bold mt-2">

                            ₹{Number(
                                analytics.overview.totalFunding || 0
                            ).toLocaleString()}

                        </h2>

                    </div>

                </div>

                {/* ===========================
                    FILTERS
                =========================== */}

                <GrantFilters

                    institutions={facets.institutions}

                    agencies={facets.agencies}

                    principalInvestigators={
                        facets.principalInvestigators
                    }

                    onApply={handleApplyFilters}

                />

                {/* ===========================
                    SEARCH
                =========================== */}

                <form

                    onSubmit={handleSearchSubmit}

                    className="bg-white rounded-xl shadow border p-4"

                >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                        <input

                            type="text"

                            placeholder="Search grants by title, institution, funding agency or PI..."

                            value={searchInput}

                            onChange={(event) =>

                                setSearchInput(

                                    event.target.value

                                )

                            }

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

                {/* ===========================
                    RESULTS
                =========================== */}

                <section className="space-y-4">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Search Results

                            </h2>

                            <p className="text-gray-500 text-sm">

                                {appliedSearch

                                    ? `Matching "${appliedSearch}"`

                                    : "Showing grants from Neo4j"}

                            </p>

                        </div>

                        <p className="text-sm text-gray-600">

                            Showing

                            {" "}

                            {startItem}

                            -

                            {endItem}

                            {" "}of{" "}

                            {pagination.total}

                            {" "}grants

                        </p>

                    </div>

                    <GrantTable

                        grants={grants}

                        loading={displayLoading}

                        onView={handleViewGrant}

                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl shadow border px-5 py-4">

                        <p className="text-sm text-gray-600">

                            Page

                            {" "}

                            {pagination.page}

                            {" "}of{" "}

                            {pagination.totalPages}

                        </p>

                        <div className="flex gap-2">

                            <button

                                onClick={() =>

                                    setCurrentPage(page =>

                                        Math.max(page - 1, 1)

                                    )

                                }

                                disabled={currentPage === 1}

                                className="px-4 py-2 border rounded-lg disabled:opacity-50"

                            >

                                Previous

                            </button>

                            <button

                                onClick={() =>

                                    setCurrentPage(page =>

                                        Math.min(

                                            page + 1,

                                            pagination.totalPages

                                        )

                                    )

                                }

                                disabled={

                                    currentPage >=

                                    pagination.totalPages

                                }

                                className="px-4 py-2 border rounded-lg disabled:opacity-50"

                            >

                                Next

                            </button>

                        </div>

                    </div>

                </section>
                {/* ===========================
                    ANALYTICS
                =========================== */}

                <div className="grid lg:grid-cols-2 gap-6">

                    <FundingTrendChart
                        data={analytics.fundingTrend}
                        loading={displayLoading}
                    />

                    <AgencyFundingChart
                        data={analytics.agencyFunding}
                        loading={displayLoading}
                    />

                </div>

                {/* ===========================
                    INSTITUTION FUNDING
                =========================== */}

                <div className="bg-white rounded-xl shadow border p-6">

                    <div className="flex items-center justify-between mb-5">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Institution-wise Funding

                            </h2>

                            <p className="text-gray-500 text-sm">

                                Institutions receiving the highest funding

                            </p>

                        </div>

                    </div>

                    {analytics.institutionFunding.length === 0 ? (

                        <div className="text-gray-500">

                            No funding statistics available.

                        </div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-gray-100">

                                    <tr>

                                        <th className="text-left px-4 py-3">

                                            Institution

                                        </th>

                                        <th className="text-right px-4 py-3">

                                            Grants

                                        </th>

                                        <th className="text-right px-4 py-3">

                                            Total Funding

                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {analytics.institutionFunding.map((row, index) => (

                                        <tr
                                            key={`${row.institution}-${index}`}
                                            className="border-b hover:bg-gray-50"
                                        >

                                            <td className="px-4 py-3">

                                                {row.institution}

                                            </td>

                                            <td className="px-4 py-3 text-right">

                                                {row.grants}

                                            </td>

                                            <td className="px-4 py-3 text-right font-semibold">

                                                ₹{Number(
                                                    row.funding || 0
                                                ).toLocaleString()}

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

            {/* ===========================
                GRANT DETAILS MODAL
            =========================== */}

            <GrantModal

                grant={selectedGrant}

                onClose={() => setSelectedGrant(null)}

            />

        </DashboardLayout>

    );

}