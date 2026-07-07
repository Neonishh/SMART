// Mock data for the SMART dashboard.
// Shapes here intentionally mirror what the FastAPI endpoints in
// src/services/api.js are expected to return, so swapping mock -> live
// data later only requires removing the mock fallback in api.js.

export const overviewStats = [
  { label: "Publications indexed", value: "4.82M", delta: "+3.1% MoM" },
  { label: "Patents tracked", value: "612K", delta: "+1.8% MoM" },
  { label: "Active grants", value: "38,204", delta: "+0.6% MoM" },
  { label: "Institutions mapped", value: "1,340", delta: "+12 new" },
];

export const publicationTrend = [
  { year: 2018, publications: 210000 },
  { year: 2019, publications: 238000 },
  { year: 2020, publications: 261000 },
  { year: 2021, publications: 297000 },
  { year: 2022, publications: 334000 },
  { year: 2023, publications: 372000 },
  { year: 2024, publications: 415000 },
  { year: 2025, publications: 452000 },
];

export const publicationsByInstitution = [
  { institution: "IISc Bangalore", publications: 18400 },
  { institution: "IIT Bombay", publications: 16920 },
  { institution: "IIT Delhi", publications: 15680 },
  { institution: "IIT Madras", publications: 14210 },
  { institution: "PES University", publications: 3420 },
  { institution: "BMSCE", publications: 2910 },
];

export const topDomains = [
  { domain: "AI & Machine Learning", papers: 52100 },
  { domain: "Biotechnology", papers: 41800 },
  { domain: "Quantum Computing", papers: 9200 },
  { domain: "Materials Science", papers: 33400 },
  { domain: "Renewable Energy", papers: 28600 },
];

export const fundingDistribution = [
  { name: "DST", value: 34 },
  { name: "DBT", value: 21 },
  { name: "SERB", value: 18 },
  { name: "CSIR", value: 15 },
  { name: "Private/Industry", value: 12 },
];

export const patentGrowth = [
  { year: 2019, filed: 41000, granted: 22000 },
  { year: 2020, filed: 45500, granted: 24800 },
  { year: 2021, filed: 52300, granted: 28100 },
  { year: 2022, filed: 58900, granted: 31200 },
  { year: 2023, filed: 64200, granted: 35400 },
  { year: 2024, filed: 71800, granted: 39900 },
  { year: 2025, filed: 79100, granted: 44300 },
];

export const searchResults = [
  {
    id: "pub-1",
    type: "Publication",
    title: "Graph Neural Networks for Scalable Knowledge Graph Completion",
    authors: "A. Rao, S. Iyer, M. Chen",
    institution: "IISc Bangalore",
    year: 2024,
    citations: 128,
  },
  {
    id: "pub-2",
    type: "Publication",
    title: "Attention-based GNN Architectures for Heterogeneous Research Graphs",
    authors: "P. Nair, K. Fernandes",
    institution: "IIT Bombay",
    year: 2023,
    citations: 96,
  },
  {
    id: "pat-1",
    type: "Patent",
    title: "System and Method for Graph Neural Network-based Anomaly Detection",
    authors: "R. Gupta et al.",
    institution: "CSIR",
    year: 2023,
    citations: 12,
  },
  {
    id: "grant-1",
    type: "Grant",
    title: "GNN-driven Research Intelligence for National S&T Monitoring",
    authors: "PESURF Consortium",
    institution: "PES University",
    year: 2025,
    citations: 0,
  },
];

export const relatedGraph = {
  nodes: [
    { id: "inst", label: "IISc Bangalore", type: "institution" },
    { id: "pub", label: "GNN Knowledge Graphs", type: "publication" },
    { id: "auth1", label: "A. Rao", type: "author" },
    { id: "auth2", label: "S. Iyer", type: "author" },
    { id: "pat", label: "Related Patent", type: "patent" },
    { id: "grant", label: "DST Grant #4471", type: "grant" },
  ],
  edges: [
    { source: "inst", target: "pub" },
    { source: "pub", target: "auth1" },
    { source: "pub", target: "auth2" },
    { source: "pub", target: "pat" },
    { source: "pub", target: "grant" },
  ],
};

export const institutions = [
  {
    id: "iisc",
    name: "IISc Bangalore",
    location: "Bengaluru, Karnataka",
    publications: 18400,
    patents: 2140,
    grants: 610,
    topDomain: "AI & Machine Learning",
    trend: [12, 14, 15, 17, 18, 18.4],
  },
  {
    id: "pes",
    name: "PES University",
    location: "Bengaluru, Karnataka",
    publications: 3420,
    patents: 240,
    grants: 88,
    topDomain: "Renewable Energy",
    trend: [1.8, 2.1, 2.4, 2.9, 3.1, 3.42],
  },
];

export const researchers = [
  {
    id: "rao-a",
    name: "Dr. A. Rao",
    institution: "IISc Bangalore",
    domain: "AI & Machine Learning",
    hIndex: 34,
    publications: 112,
    patents: 6,
  },
  {
    id: "iyer-s",
    name: "Dr. S. Iyer",
    institution: "IIT Bombay",
    domain: "Graph Neural Networks",
    hIndex: 28,
    publications: 87,
    patents: 3,
  },
];

export const patents = [
  {
    id: "pat-1001",
    title: "System and Method for Graph Neural Network-based Anomaly Detection",
    applicant: "CSIR",
    filedYear: 2023,
    status: "Granted",
    domain: "AI & Machine Learning",
  },
  {
    id: "pat-1002",
    title: "Bio-degradable Polymer Composite for Sustainable Packaging",
    applicant: "IIT Delhi",
    filedYear: 2022,
    status: "Filed",
    domain: "Materials Science",
  },
];

export const grants = [
  {
    id: "grant-4471",
    title: "GNN-driven Research Intelligence for National S&T Monitoring",
    agency: "DST",
    amount: "₹1.2 Cr",
    year: 2025,
    status: "Active",
  },
  {
    id: "grant-3392",
    title: "Quantum-safe Cryptography for Critical Infrastructure",
    agency: "SERB",
    amount: "₹86 L",
    year: 2024,
    status: "Active",
  },
];

export const chatSuggestions = [
  "Show me top GNN papers from 2024",
  "Which institutions lead in quantum computing?",
  "Compare India vs global output in biotech",
  "Related patents for graph neural networks",
];
