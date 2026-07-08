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

export async function getPatentAnalytics() {
  if (USE_MOCK) {
    return resolveMock({ growth: mock.patentGrowth, fundingDistribution: mock.fundingDistribution });
  }
  return client.get("/analytics/patents");
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

export async function listPatents() {
  if (USE_MOCK) return resolveMock(mock.patents);
  return client.get("/patents");
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
