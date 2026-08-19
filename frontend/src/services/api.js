import axios from "axios";
import * as mock from "../mock/data";

// -----------------------------------------------------------------------
// Set VITE_API_BASE_URL in frontend/.env (e.g. http://localhost:5001) to
// point the app at the Node backend. The fallback below must match PORT in
// backend/.env. Note: macOS AirPlay Receiver occupies port 5000, so this
// project uses 5001.
// -----------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const USE_MOCK = false;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

function resolveMock(data, delay = 250) {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), delay));
}

export async function getDashboardOverview() {
  if (USE_MOCK) {
    return resolveMock({
      stats: mock.overviewStats,
      publicationTrend: mock.publicationTrend,
      topDomains: mock.topDomains,
    });
  }

  return client.get("/dashboard/overview");
}

export async function getPublicationAnalytics() {
  if (USE_MOCK) {
    return resolveMock({
      trend: mock.publicationTrend,
      byInstitution: mock.publicationsByInstitution,
      topDomains: mock.topDomains,
    });
  }

  return client.get("/analytics/publications");
}

export async function semanticSearch(query) {
  if (USE_MOCK) {
    return resolveMock({
      query,
      results: mock.searchResults,
      graph: mock.relatedGraph,
    });
  }

  return client.post("/semantic-search", { query });
}

export async function getInstitution(id) {
  if (USE_MOCK) {
    const inst =
      mock.institutions.find((i) => i.id === id) || mock.institutions[0];

    return resolveMock(inst);
  }

  return client.get(`/institution/${id}`);
}

export async function listInstitutions() {
  if (USE_MOCK) return resolveMock(mock.institutions);

  return client.get("/institution");
}

/* ============================================================
   RESEARCHERS
============================================================ */

export async function listResearchers(
  page = 1,
  limit = 20,
  search = "",
  institution = ""
) {

  return client.get("/researcher", {
    params: {
      page,
      limit,
      search,
      institution,
    },
  });

}

export async function getTopResearchers() {
  return client.get("/researcher/top");
}

export async function getResearcher(id) {
  return client.get(`/researcher/${id}`);
}

export async function searchResearchers(query) {
  return client.get("/researcher/search", {
    params: {
      q: query,
    },
  });
}

/* ============================================================
   PATENTS
============================================================ */

export async function listPatents(filters = {}) {
  const params = {};

  if (filters.page) params.page = filters.page;

  if (filters.limit) params.limit = filters.limit;

  if (filters.year) params.year = filters.year;

  if (filters.institution) params.institution = filters.institution;

  if (filters.applicant) params.applicant = filters.applicant;

  if (filters.ipc) params.ipc = filters.ipc;

  if (filters.search) params.search = filters.search;

  if (USE_MOCK) {
    const searchTerm = String(filters.search || "").toLowerCase();

    const filtered = mock.patents.filter((patent) => {
      const title = String(patent.title || "").toLowerCase();

      const applicant = String(patent.applicant || "").toLowerCase();

      const institution = String(patent.institution || "").toLowerCase();

      const ipc = String(patent.ipc || "").toLowerCase();

      const field = String(patent.field || "").toLowerCase();

      const matchesYear =
        !filters.year ||
        String(patent.filedYear || patent.year) === String(filters.year);

      const matchesInstitution =
        !filters.institution || patent.institution === filters.institution;

      const matchesApplicant =
        !filters.applicant || patent.applicant === filters.applicant;

      const matchesIPC = !filters.ipc || patent.ipc === filters.ipc;

      const matchesSearch =
        !searchTerm ||
        [title, applicant, institution, ipc, field].some((value) =>
          value.includes(searchTerm)
        );

      return (
        matchesYear &&
        matchesInstitution &&
        matchesApplicant &&
        matchesIPC &&
        matchesSearch
      );
    });

    const page = Math.max(Number(filters.page) || 1, 1);

    const limit = Math.max(Number(filters.limit) || 20, 1);

    const offset = (page - 1) * limit;

    const pageData = filtered.slice(offset, offset + limit);

    const uniqueValues = (key) =>
      [...new Set(filtered.map((item) => item[key]).filter(Boolean))].sort();

    return resolveMock({
      success: true,
      count: filtered.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(filtered.length / limit), 1),
      facets: {
        institutions: uniqueValues("institution"),
        applicants: uniqueValues("applicant"),
        ipcCodes: uniqueValues("ipc"),
      },
      data: pageData,
    });
  }

  return client.get("/patents", { params });
}

export async function getPatent(id) {
  if (USE_MOCK) {
    const patent =
      mock.patents.find((p) => p.id === id) || mock.patents[0];

    return resolveMock({
      success: true,
      data: patent,
    });
  }

  return client.get(`/patents/${id}`);
}

export async function getPatentAnalytics() {
  if (USE_MOCK) {
    const analytics = {
      growth: mock.patentGrowth,
      ipcDistribution: [],
      topApplicants: [],
      fundingDistribution: mock.fundingDistribution,
    };

    return resolveMock({
      success: true,
      data: analytics,
      ...analytics,
    });
  }

  const response = await client.get("/patents/trends");

  const analytics = response.data?.data ?? response.data ?? {};

  return {
    ...response,
    data: {
      ...response.data,
      ...analytics,
      data: analytics,
    },
  };
}

/* ============================================================
   GRANTS
============================================================ */

/*
----------------------------------------------------
GET ALL GRANTS

Supports Filters

page
limit
year
institution
agency
pi
search

Example:

listGrants({
    page:1,
    limit:10,
    year:2024,
    institution:"Indian Institute of Science Bangalore",
    agency:"ANRF",
    pi:"John Doe"
})

----------------------------------------------------
*/

export async function listGrants(filters = {}) {

    const params = {};

    if (filters.page)
        params.page = filters.page;

    if (filters.limit)
        params.limit = filters.limit;

    if (filters.year)
        params.year = filters.year;

    if (filters.institution)
        params.institution = filters.institution;

    if (filters.agency)
        params.agency = filters.agency;

    if (filters.pi)
        params.pi = filters.pi;

    if (filters.search)
        params.search = filters.search;

    if (USE_MOCK) {

        const searchTerm = String(filters.search || "").toLowerCase();

        const filtered = mock.grants.filter((grant) => {

            const title =
                String(grant.title || "").toLowerCase();

            const institution =
                String(grant.institution || "").toLowerCase();

            const agency =
                String(grant.agency || "").toLowerCase();

            const pi =
                String(grant.pi || "").toLowerCase();

            const matchesYear =
                !filters.year ||
                String(grant.year) === String(filters.year);

            const matchesInstitution =
                !filters.institution ||
                grant.institution === filters.institution;

            const matchesAgency =
                !filters.agency ||
                grant.agency === filters.agency;

            const matchesPI =
                !filters.pi ||
                grant.pi === filters.pi;

            const matchesSearch =
                !searchTerm ||
                [title, institution, agency, pi]
                    .some(value => value.includes(searchTerm));

            return (

                matchesYear &&
                matchesInstitution &&
                matchesAgency &&
                matchesPI &&
                matchesSearch

            );

        });

        const page =
            Math.max(Number(filters.page) || 1, 1);

        const limit =
            Math.max(Number(filters.limit) || 20, 1);

        const offset =
            (page - 1) * limit;

        const pageData =
            filtered.slice(offset, offset + limit);

        const uniqueValues = (key) =>
            [...new Set(
                filtered
                    .map(item => item[key])
                    .filter(Boolean)
            )].sort();

        return resolveMock({

            success: true,

            count: filtered.length,

            page,

            limit,

            totalPages:
                Math.max(
                    Math.ceil(filtered.length / limit),
                    1
                ),

            facets: {

                institutions:
                    uniqueValues("institution"),

                agencies:
                    uniqueValues("agency"),

                principalInvestigators:
                    uniqueValues("pi")

            },

            data: pageData

        });

    }

    return client.get("/grants", { params });

}

/*
----------------------------------------------------
GRANT DETAILS
----------------------------------------------------
*/

export async function getGrant(id) {

    if (USE_MOCK) {

        const grant =
            mock.grants.find(g => g.id === id)
            || mock.grants[0];

        return resolveMock({

            success: true,

            data: grant

        });

    }

    return client.get(`/grants/${id}`);

}

/*
----------------------------------------------------
GRANT ANALYTICS
----------------------------------------------------
*/

export async function getGrantAnalytics() {

    if (USE_MOCK) {

        return resolveMock({

            success: true,

            data: {

                overview: mock.grantOverview || {},

                fundingTrend:
                    mock.fundingTrend || [],

                agencyFunding:
                    mock.agencyFunding || [],

                institutionFunding:
                    mock.institutionFunding || []

            }

        });

    }

    const response =
        await client.get("/grants/analytics");

    const analytics =
        response.data?.data ??
        response.data ??
        {};

    return {

        ...response,

        data: {

            ...response.data,

            ...analytics,

            data: analytics

        }

    };

}

export async function sendChatMessage(message, history = []) {
  if (USE_MOCK) {
    return resolveMock(
      {
        reply:
          "This is a placeholder response. Once the backend chatbot endpoint (POST /chat) is connected, this will return a real answer grounded in the SMART knowledge graph.",
        history: [...history, { role: "user", content: message }],
      },
      500
    );
  }

  return client.post("/chat", {
    message,
    history,
  });
}

export async function listTechnologyDomains() {
  return client.get("/analytics/trends/domains");
}

export async function getTrendAnalytics(params = {}) {
  return client.get("/analytics/trends", { params });
}

export async function getTrendTopics(params = {}) {
  return client.get("/analytics/trends/topics", { params });
}

export async function getTrendResearchers(params = {}) {
  return client.get("/analytics/trends/researchers", { params });
}

export async function generateTechnologyReport(technology, year) {
  return client.post("/analytics/reports", {
    technology,
    year,
  });
}

export async function downloadTechnologyReport(technology, year, format = "pdf") {
  return client.get("/analytics/reports/download", {
    params: { technology, year, format },
    responseType: "blob",
  });
}

export async function listPublications() {
  if (USE_MOCK) return resolveMock(mock.publications);

  return client.get("/publications");
}


export async function getPublication(id) {
  if (USE_MOCK) {
    const pub = mock.publications.find((p) => p.id === id) || mock.publications[0];
    return resolveMock(pub);
  }
  return client.get(`/publications/${id}`);
}

export async function getPublicationAuthors(id) {
  if (USE_MOCK) return resolveMock([]);
  return client.get(`/publications/${id}/authors`);
}

export async function getRelatedPublications(id) {
  if (USE_MOCK) return resolveMock([]);
  return client.get(`/publications/${id}/related`);
}

export async function listTheses() {
  if (USE_MOCK) return resolveMock(mock.theses);

  return client.get("/theses");
}

/* ============================================================
   TREND ENGINE
   Reads the CSVs produced by the Python Trend Engine, served by
   backend/routes/trend_engine.js at GET /trend-engine
============================================================ */

export async function getTrendEngineAnalytics() {
  return client.get("/trend-engine");
}

export default client;