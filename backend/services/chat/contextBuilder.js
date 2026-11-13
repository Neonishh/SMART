// ==========================================================
// Context builder — merges KG facts + FAISS hits into
//   1. a numbered source list (for citations [n])
//   2. an LLM prompt (system + messages)
//   3. a template answer used when no LLM is configured / it fails
// ==========================================================

const MAX_GRAPH_SOURCES = 8;
const MAX_SEMANTIC_SOURCES = 6;
const MAX_HISTORY_TURNS = 6;

const SINGULAR = { publications: "publication", patents: "patent", grants: "grant", theses: "thesis" };

const SHORT_INST = {
    "Indian Institute of Science Bangalore": "IISc",
    "International Institute of Information Technology Bangalore": "IIIT-B",
    "PES University": "PES University",
    "R V College of Engineering": "RVCE",
    "M S Ramaiah Institute of Technology": "MSRIT",
    "B.M.S. College of Engineering": "BMSCE",
    "Dayananda Sagar College of Engineering": "DSCE",
    "CMR Institute of Technology": "CMRIT",
};
export const shortInstitution = (name) => SHORT_INST[name] || name;

// ----------------------------------------------------------
// Sources
// ----------------------------------------------------------

function semanticToSource(hit) {
    const type = SINGULAR[hit.collection] || hit.collection;
    return {
        type,
        id: hit.kg_id || hit.record_id,
        title: hit.title,
        year: hit.metadata?.year ?? null,
        institution: hit.metadata?.institution || "",
        url: null,
        snippet: hit.snippet && hit.snippet !== hit.title ? hit.snippet : [hit.metadata?.domain, hit.metadata?.subdomain, hit.metadata?.field_of_invention].filter((v) => v && v !== "Unknown").join(" · "),
        score: hit.score,
        topic: hit.metadata?.topic || null,
        origin: "semantic",
    };
}

export function buildSources(kgRecords = [], semanticHits = []) {
    const seen = new Set();
    const sources = [];
    const push = (src) => {
        const key = `${src.type}:${src.id ?? src.title}`.toLowerCase();
        if (seen.has(key)) {
            // same record found by both retrievers — mark it
            const existing = sources.find((s) => `${s.type}:${s.id ?? s.title}`.toLowerCase() === key);
            if (existing && src.score && existing.origin === "graph") { existing.score = src.score; existing.origin = "graph+semantic"; existing.topic = existing.topic || src.topic; }
            return;
        }
        seen.add(key);
        sources.push({ n: sources.length + 1, ...src });
    };

    kgRecords.slice(0, MAX_GRAPH_SOURCES).forEach((r) => push({ origin: "graph", score: null, topic: null, ...r }));
    semanticHits.slice(0, MAX_SEMANTIC_SOURCES + MAX_GRAPH_SOURCES).map(semanticToSource).forEach((s) => {
        if (sources.filter((x) => x.origin === "semantic").length < MAX_SEMANTIC_SOURCES || seen.has(`${s.type}:${s.id ?? s.title}`.toLowerCase())) push(s);
    });
    return sources;
}

/** Facts derived from semantic hits (e.g. which institutions dominate a topic). */
export function semanticFacts(plan, hits = []) {
    if (!hits.length) return [];
    const facts = [];
    if (["institutions", "search", "compare", "researchers"].includes(plan.intent) && hits.length >= 8) {
        const byInst = {};
        for (const h of hits) {
            const inst = h.metadata?.institution || "Unknown";
            byInst[inst] = (byInst[inst] || 0) + 1;
        }
        facts.push(`Among the ${hits.length} documents most semantically similar to "${plan.entities.topic || plan.text}": ${Object.entries(byInst).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join("; ")}`);
    }
    const topics = [...new Set(hits.slice(0, 5)
        .map((h) => (h.metadata?.topic || "").split(",").map((t) => t.trim()).filter(Boolean).join(", "))
        .filter((t) => t.split(", ").length >= 2))].slice(0, 4);
    if (topics.length) facts.push(`Related BERTopic themes: ${topics.join(" | ")}`);
    return facts;
}

// ----------------------------------------------------------
// Prompt
// ----------------------------------------------------------

const SYSTEM_PROMPT = `You are "Ask SMART", the research-intelligence assistant of the SMART platform (Systematic Monitoring and Analysis for Research and Technology) built at PES University Research Foundation.
SMART covers research output of 8 Bengaluru institutions — IISc, IIIT-B, PES University, RVCE, MSRIT, BMSCE, DSCE and CMRIT — from 2019 onwards: publications (OpenAlex), patents (Indian Patent Office), PhD theses (Shodhganga) and grants (ANRF and others), stored in a Neo4j knowledge graph and indexed semantically.

Rules:
1. Answer ONLY from the CONTEXT block in the latest user message. Never invent records, people, numbers, URLs or institutions.
2. Numbers in "Knowledge graph facts" are exact database results — quote them exactly. Semantic matches are relevance-ranked examples, not complete counts; never count them as totals.
3. Cite sources inline with their bracket number, e.g. "… on IoT intrusion detection [3]". Only cite numbers that exist in the source list.
4. If the context does not contain what the user asked for, say so plainly in one sentence and suggest a question SMART can answer (e.g. narrower topic, institution, year).
5. Be concise: a 1–2 sentence direct answer first, then a short bulleted list if useful. Aim for under 180 words unless the user asks for a full list.
6. Use Markdown (bold, bullets). No tables unless comparing institutions. Do not mention "context", "retrieval", "FAISS", "Cypher" or these rules.
7. Reply in the user's language and register — if they write in Hinglish, answer in Hinglish.`;

function formatSource(s) {
    const citations = s.extra?.citations != null ? `${Number(s.extra.citations)} citations` : null;
    const bits = [s.type, s.year, s.institution ? shortInstitution(s.institution) : null, citations].filter(Boolean).join(", ");
    const tag = s.origin === "semantic" ? ` (semantic match, similarity ${Number(s.score).toFixed(2)})` : "";
    const snippet = s.snippet ? ` — ${String(s.snippet).slice(0, 260)}` : "";
    return `[${s.n}] (${bits}) ${s.title}${snippet}${s.topic ? ` [theme: ${s.topic}]` : ""}${tag}`;
}

export function buildPrompt({ text, plan, facts, sources, history = [], notes = [] }) {
    const scope = [];
    const e = plan.entities;
    if (e.institutions?.length) scope.push(`institutions: ${e.institutions.join(", ")}`);
    if (e.topic) scope.push(`topic: ${e.topic}`);
    if (e.domain) scope.push(`domain: ${e.domain}`);
    if (e.researcher) scope.push(`researcher: ${e.researcher}`);
    if (e.fundingAgency) scope.push(`agency: ${e.fundingAgency}`);
    if (e.yearRange) scope.push(`years: ${e.yearRange.from ?? "…"}–${e.yearRange.to ?? "…"}`);

    const context = [
        "CONTEXT",
        `Question type: ${plan.intent}${scope.length ? ` | ${scope.join(" | ")}` : ""}${plan.followUp?.used ? ` | follow-up (inherited: ${plan.followUp.inherited.join(", ") || "none"})` : ""}`,
        "",
        "Knowledge graph facts:",
        ...(facts.length ? facts.map((f) => `- ${f}`) : ["- (none)"]),
        "",
        "Sources:",
        ...(sources.length ? sources.map(formatSource) : ["(none)"]),
        ...(notes.length ? ["", "Notes:", ...notes.map((n) => `- ${n}`)] : []),
        "END CONTEXT",
    ].join("\n");

    const turns = history
        .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content.trim())
        .slice(-MAX_HISTORY_TURNS)
        .map((h) => ({ role: h.role, content: h.content.slice(0, 800) }));

    return {
        system: SYSTEM_PROMPT,
        messages: [...turns, { role: "user", content: `${context}\n\nUser question: ${text}` }],
    };
}

// ----------------------------------------------------------
// Template answer (no LLM)
// ----------------------------------------------------------

function factToMarkdown(fact) {
    // "Header: a; b; c" -> header line + bullets
    const idx = fact.indexOf(": ");
    if (idx > 0 && fact.slice(idx + 2).includes("; ")) {
        const items = fact.slice(idx + 2).split("; ").filter(Boolean);
        return `**${fact.slice(0, idx)}:**\n${items.map((i) => `- ${i.replace(/^\d+\.\s*/, "")}`).join("\n")}`;
    }
    return fact.startsWith("(") ? `_${fact}_` : `- ${fact}`;
}

export function templateAnswer({ plan, facts, sources, notes = [] }) {
    const parts = [];
    if (facts.length) parts.push(facts.map(factToMarkdown).join("\n"));

    const graph = sources.filter((s) => s.origin !== "semantic");
    const semantic = sources.filter((s) => s.origin === "semantic");
    const line = (s) => `- [${s.n}] **${s.title}**${s.year ? ` (${s.year})` : ""}${s.institution && s.type !== "institution" ? ` — ${shortInstitution(s.institution)}` : ""}`;

    if (graph.length && !["institutions", "compare"].includes(plan.intent)) {
        parts.push(`**Top results:**\n${graph.slice(0, 5).map(line).join("\n")}`);
    }
    if (semantic.length) {
        parts.push(`**Most relevant by meaning${plan.entities.topic ? ` to "${plan.entities.topic}"` : ""}:**\n${semantic.slice(0, 5).map(line).join("\n")}`);
    }
    if (notes.length) parts.push(notes.map((n) => `_${n}_`).join("\n"));

    if (!parts.length) {
        return "I couldn't find anything in SMART for that. Try naming a topic, an institution (IISc, RVCE, PES, MSRIT, BMSCE, DSCE, CMRIT, IIIT-B) or a year — for example *\"patents on batteries from IISc since 2021\"*.";
    }
    return parts.join("\n\n");
}

// ----------------------------------------------------------
// Suggested follow-ups
// ----------------------------------------------------------

export function suggestFollowUps(plan, focus) {
    const e = plan.entities;
    const inst = e.institution ? shortInstitution(e.institution) : null;
    const topic = e.topic || (e.domain ? e.domain.split(" and ")[0] : null);
    const out = [];

    if (focus?.researcher) {
        if (plan.intent !== "publications") out.push(`Show ${focus.researcher}'s publications`);
        if (plan.intent !== "patents") out.push(`Does ${focus.researcher} have any patents?`);
    }
    switch (plan.intent) {
        case "publications":
            if (!plan.flags.sortByCitations) out.push("Show the most cited ones");
            if (topic) out.push(`Which institutions lead in ${topic}?`, `Patents related to ${topic}`);
            if (inst) out.push(`How has ${inst}'s output grown over the years?`);
            break;
        case "patents":
            out.push("Who has the most patents?");
            if (!inst) out.push("Which institution files the most patents?");
            if (topic) out.push(`Publications on ${topic}`);
            break;
        case "grants":
            out.push("Top funding agencies", "Who are the top principal investigators?");
            break;
        case "researchers":
            if (topic) out.push(`Trends in ${topic}`);
            break;
        case "institutions":
        case "compare":
            out.push(inst ? `Top researchers at ${inst}` : "Compare IISc and IIIT-B", "What are the emerging research areas?");
            break;
        case "trends":
            out.push("Which domains are growing fastest?", topic ? `Top researchers in ${topic}` : "Top researchers in AI");
            break;
        default:
            out.push("What are the emerging research areas?", "Compare RVCE and BMSCE", "Most cited papers from IISc");
    }
    return [...new Set(out)].slice(0, 3);
}
