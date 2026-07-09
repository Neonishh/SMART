import axios from "axios";
import * as mock from "../mock/data";

// -----------------------------------------------------------------------
// When your FastAPI backend is ready, set VITE_API_BASE_URL in a .env file
// (e.g. VITE_API_BASE_URL=http://localhost:8000) and the calls below will
// hit the real endpoints. Until then, USE_MOCK stays true and every
// function resolves with the mock data from src/mock/data.js, so the UI
// works standalone with zero backend.
// -----------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const USE_MOCK = !import.meta.env.VITE_API_BASE_URL;

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
    return resolveMock({ query, results: mock.searchResults, graph: mock.relatedGraph });
  }
  return client.post("/semantic-search", { query });
}

export async function getInstitution(id) {
  if (USE_MOCK) {
    const inst = mock.institutions.find((i) => i.id === id) || mock.institutions[0];
    return resolveMock(inst);
  }
  return client.get(`/institution/${id}`);
}

export async function listInstitutions() {
  if (USE_MOCK) return resolveMock(mock.institutions);
  return client.get("/institution");
}

export async function getResearcher(id) {
  if (USE_MOCK) {
    const r = mock.researchers.find((x) => x.id === id) || mock.researchers[0];
    return resolveMock(r);
  }
  return client.get(`/researcher/${id}`);
}

export async function listResearchers() {
  if (USE_MOCK) return resolveMock(mock.researchers);
  return client.get("/researcher");
}

/* ============================================================
   PATENTS
============================================================ */

/*
----------------------------------------------------
GET ALL PATENTS

Supports Filters

year

institution

applicant

ipc

Example:

listPatents({
    year:2024,
    institution:"IIIT Bangalore"
})

----------------------------------------------------
*/

export async function listPatents(filters = {}) {

  const params = {};

  if (filters.page)
    params.page = filters.page;

  if (filters.limit)
    params.limit = filters.limit;

  if (filters.year)
    params.year = filters.year;

  if (filters.institution)
    params.institution = filters.institution;

  if (filters.applicant)
    params.applicant = filters.applicant;

  if (filters.ipc)
    params.ipc = filters.ipc;

  if (filters.search)
    params.search = filters.search;

  if (USE_MOCK) {
    const searchTerm = String(filters.search || "").toLowerCase();
    const filtered = mock.patents.filter((patent) => {
      const title = String(patent.title || "").toLowerCase();
      const applicant = String(patent.applicant || "").toLowerCase();
      const institution = String(patent.institution || "").toLowerCase();
      const ipc = String(patent.ipc || "").toLowerCase();
      const field = String(patent.field || "").toLowerCase();

      const matchesYear = !filters.year || String(patent.filedYear || patent.year) === String(filters.year);
      const matchesInstitution = !filters.institution || patent.institution === filters.institution;
      const matchesApplicant = !filters.applicant || patent.applicant === filters.applicant;
      const matchesIPC = !filters.ipc || patent.ipc === filters.ipc;
      const matchesSearch = !searchTerm || [title, applicant, institution, ipc, field].some((value) => value.includes(searchTerm));

      return matchesYear && matchesInstitution && matchesApplicant && matchesIPC && matchesSearch;
    });

    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.max(Number(filters.limit) || 20, 1);
    const offset = (page - 1) * limit;
    const pageData = filtered.slice(offset, offset + limit);

    const uniqueValues = (key) => [...new Set(filtered.map((item) => item[key]).filter(Boolean))].sort();

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

/*
----------------------------------------------------
PATENT DETAILS
----------------------------------------------------
*/

export async function getPatent(id) {

    if (USE_MOCK) {

        const patent =
            mock.patents.find(p => p.id === id)
            || mock.patents[0];

        return resolveMock({
            success: true,
            data: patent
        });

    }

    return client.get(`/patents/${id}`);

}

/*
----------------------------------------------------
PATENT ANALYTICS
----------------------------------------------------
*/

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

export async function listGrants() {
  if (USE_MOCK) return resolveMock(mock.grants);
  return client.get("/grants");
}

export async function sendChatMessage(message, history = []) {
  if (USE_MOCK) {
    return resolveMock({
      reply:
        "This is a placeholder response. Once the backend chatbot endpoint (POST /chat) is connected, this will return a real answer grounded in the SMART knowledge graph.",
      history: [...history, { role: "user", content: message }],
    }, 500);
  }
  return client.post("/chat", { message, history });
}

export async function listPublications() {
  if (USE_MOCK) return resolveMock(mock.publications);
  return client.get("/publications");
}

export async function listTheses() {
  if (USE_MOCK) return resolveMock(mock.theses);
  return client.get("/theses");
}
export default client;
