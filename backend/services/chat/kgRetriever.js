// ==========================================================
// Knowledge-Graph retrieval for the chatbot.
//
// Turns a resolved plan { intent, entities, flags } into calls to the
// EXISTING domain services (no duplicated Cypher) and returns:
//
//   {
//     facts:   ["Publications matching ...: 1,234", ...]   // compact, LLM-friendly
//     records: [{ type, id, title, year, institution, url, snippet, extra }]
//     focus:   { researcher?, researcherId?, institution? } // for follow-ups
//     trace:   ["publicationService.getAllPublications({...})"]
//   }
// ==========================================================

import * as grantService from "../grantService.js";
import * as patentService from "../patentService.js";
import * as thesisService from "../thesisService.js";
import * as institutionService from "../institutionService.js";
import * as dashboardService from "../dashboardService.js";
import * as publicationService from "../publicationService.js";
import * as analyticsService from "../analyticsService.js";
import * as researcherService from "../researcherService/index.js";
import { getResearchersData } from "../researcherService/csvLoader.js";
import { sameInstitutionKey } from "../researcherService/getResearchers.js";
import { nameMatcher, looseNameKey } from "../../utils/nameParts.js";
import * as trendData from "./trendData.js";

const LIST_LIMIT = 8;

// ----------------------------------------------------------
// helpers
// ----------------------------------------------------------

const fmt = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "n/a" : Number(n).toLocaleString("en-IN"));

function yearFilters(entities) {
    const r = entities.yearRange;
    if (!r) return {};
    if (r.from && r.to && r.from === r.to) return { year: r.from };
    return { ...(r.from ? { yearFrom: r.from } : {}), ...(r.to ? { yearTo: r.to } : {}) };
}

function describeScope(entities, extra = {}) {
    const parts = [];
    const topic = "topic" in extra ? extra.topic : entities.topic;
    if (topic) parts.push(`on "${topic}"`);
    const institution = "institution" in extra ? extra.institution : entities.institution;
    if (institution) parts.push(`at ${institution}`);
    if (entities.researcher) parts.push(`by ${entities.researcher}`);
    if (entities.fundingAgency) parts.push(`funded by ${entities.fundingAgency}`);
    const r = entities.yearRange;
    if (r) {
        if (r.from && r.to && r.from === r.to) parts.push(`in ${r.from}`);
        else if (r.from && r.to) parts.push(`from ${r.from} to ${r.to}`);
        else if (r.from) parts.push(`since ${r.from}`);
        else if (r.to) parts.push(`up to ${r.to}`);
    }
    return parts.length ? parts.join(", ") : "(all records)";
}

/**
 * Title keyword search only works for meaningful words. Very short tokens
 * like "AI" would match "detail", "chain", ... so they are left to the
 * semantic retriever instead.
 */
function kgSearchText(topic) {
    if (!topic) return "";
    return topic
        .split(/\s+/)
        .filter((w) => w.length >= 4 || /\d/.test(w))
        .join(" ")
        .trim();
}

function researcherIdByName(name) {
    if (!name) return null;
    const key = looseNameKey(name);
    const hit = getResearchersData().find((r) => looseNameKey(r.researcher) === key);
    return hit ? hit.rank : null;
}

const pubToRecord = (p) => ({
    type: "publication",
    id: p.id,
    title: p.title,
    year: p.year,
    institution: p.institution || p.institutions?.[0] || "",
    url: p.doi || p.sourceUrl || null,
    snippet: [p.venue, p.authors?.length ? `Authors: ${p.authors.slice(0, 4).map((a) => a.name).join(", ")}${p.authors.length > 4 ? " et al." : ""}` : null].filter(Boolean).join(" · "),
    extra: { citations: p.citations, venue: p.venue, domains: p.domains },
});

const patentToRecord = (p) => ({
    type: "patent",
    id: p.id,
    title: p.title,
    year: p.year,
    institution: p.institution,
    url: null,
    snippet: [p.status, p.field, p.ipc ? `IPC ${p.ipc}` : null, p.applicationNumber ? `App. no. ${p.applicationNumber}` : null].filter(Boolean).join(" · "),
    extra: { status: p.status, applicationNumber: p.applicationNumber },
});

const grantToRecord = (g) => ({
    type: "grant",
    id: g.id,
    title: g.title,
    year: g.year,
    institution: g.institution,
    url: null,
    snippet: [g.agency, g.pi ? `PI: ${g.pi}` : null, g.amount ? `₹${fmt(g.amount)}` : null].filter(Boolean).join(" · "),
    extra: { agency: g.agency, pi: g.pi, amount: g.amount },
});

const thesisToRecord = (t) => ({
    type: "thesis",
    id: t.id,
    title: t.title,
    year: t.year,
    institution: t.institution,
    url: t.sourceUrl || null,
    snippet: [t.authors?.length ? `By ${t.authors.join(", ")}` : null, t.supervisors?.length ? `Supervisor: ${t.supervisors.join(", ")}` : null, t.department].filter(Boolean).join(" · "),
    extra: {},
});

const researcherToRecord = (r) => ({
    type: "researcher",
    id: r.id ?? researcherIdByName(r.name),
    title: r.name,
    year: null,
    institution: r.institution,
    url: null,
    snippet: [r.publications != null ? `${fmt(r.publications)} publications` : null, r.patents ? `${fmt(r.patents)} patents` : null, r.citations != null ? `${fmt(r.citations)} citations` : null].filter(Boolean).join(" · "),
    extra: {},
});

// Person nodes created from patent applicant fields sometimes hold an
// organisation name ("CMR Institute of Technology") — not a person.
const ORG_RE = /\b(institute|university|college|universit|pvt|ltd|limited|llp|inc|corporation|foundation|technologies|department|school|centre|center|trust|society|india)\b/i;
const isPersonName = (name) => Boolean(name) && !ORG_RE.test(name) && /[a-z]/i.test(name);

/**
 * Follow-up focus from a ranked list [{ name, count }] (sorted, highest first).
 * - clear winner -> focus.researcher = winner, focus.people = everyone listed
 * - tie at the top -> no single researcher; focus.people = only the tied names
 * - nobody has any -> no single researcher; focus.people = everyone listed
 */
function rankedFocus(ranked, extra = {}) {
    if (!ranked.length) return null;
    const top = ranked[0].count;
    const tied = ranked.filter((r) => r.count === top);
    if (!(top > 0)) return { people: ranked.map((r) => r.name), ...extra };
    if (tied.length > 1) return { people: tied.map((r) => r.name), tie: true, ...extra };
    return { researcher: ranked[0].name, researcherId: researcherIdByName(ranked[0].name), people: ranked.map((r) => r.name), ...extra };
}

/** "Tie: 10 people share the top count of 1 patent each: A, B, ..." or null */
function tieFact(ranked, unit) {
    if (ranked.length < 2 || !(ranked[0].count > 0)) return null;
    const tied = ranked.filter((r) => r.count === ranked[0].count);
    if (tied.length < 2) return null;
    return `Tie: ${tied.length} people share the top count of ${fmt(ranked[0].count)} ${unit} each (${tied.map((r) => r.name).join("; ")}) — no single person leads.`;
}

function pickMeasure(scores = {}) {
    for (const k of ["patents", "grants", "theses", "publications"]) if (scores[k] > 0) return k;
    return null;
}

// ----------------------------------------------------------
// handlers
// ----------------------------------------------------------

async function publications({ entities, flags }) {
    const search = kgSearchText(entities.topic);
    const filters = {
        search,
        institution: entities.institution || "",
        author: entities.researcher || "",
        ...yearFilters(entities),
        sort: flags.sortByCitations || flags.wantsTop ? "citations" : "year",
        limit: LIST_LIMIT,
    };
    const res = await publicationService.getAllPublications(filters);
    const facts = [`Publications ${describeScope(entities, { topic: search || null })}: ${fmt(res.total)}`];
    if (entities.topic && !search) facts.push(`(No title filter applied for the short term "${entities.topic}" — see semantic matches for topical results.)`);
    if (!entities.institution && res.facets.institutions.length > 1) {
        facts.push(`By institution: ${res.facets.institutions.slice(0, 8).map((f) => `${f.name} (${fmt(f.count)})`).join("; ")}`);
    }
    if (res.facets.years.length > 1 && res.facets.years.length <= 12) {
        facts.push(`By year: ${res.facets.years.map((y) => `${y.year}: ${fmt(y.count)}`).join(", ")}`);
    }
    if (filters.sort === "citations" && res.data.length) facts.push("Listed records are sorted by citation count.");
    return {
        facts,
        records: res.data.map(pubToRecord),
        trace: [`publicationService.getAllPublications(${JSON.stringify(filters)})`],
        focus: entities.researcher ? { researcher: entities.researcher } : null,
    };
}

async function patents({ entities, flags, text }) {
    const search = kgSearchText(entities.topic);
    const filters = { institution: entities.institution || "", search, inventor: entities.researcher || "", ...yearFilters(entities), limit: LIST_LIMIT };
    const trace = [];
    const facts = [];
    let focus = null;
    const records = [];

    const wantsWho = !entities.researcher && /\bwho\b|inventors?\b|people|person|researchers?\b/i.test(text);
    let topInventorCount = null;
    if (wantsWho || (flags.wantsTop && /\bwho|whom\b/i.test(text))) {
        const inventors = (await patentService.getTopInventors({ ...filters, limit: 25 })).filter((p) => isPersonName(p.name)).slice(0, 10);
        trace.push(`patentService.getTopInventors(${JSON.stringify({ ...filters, limit: 25 })}) → people only`);
        if (inventors.length) {
            const ranked = inventors.map((p) => ({ name: p.name, count: p.patents }));
            facts.push(`Top inventors by patent count ${describeScope(entities, { topic: search || null })}: ${inventors.map((p, i) => `${i + 1}. ${p.name} — ${p.patents} patents${p.institutions.length ? ` (${p.institutions.join(", ")})` : ""}`).join("; ")}`);
            const tie = tieFact(ranked, "patent(s)");
            if (tie) facts.push(tie);
            focus = rankedFocus(ranked);
            topInventorCount = ranked[0].count;
            records.push(...inventors.slice(0, 5).map((p) => researcherToRecord({ name: p.name, institution: p.institutions[0], patents: p.patents })));
        }
    }

    let res = await patentService.getAllPatents(filters);
    trace.push(`patentService.getAllPatents(${JSON.stringify(filters)})`);
    // multi-word phrase found nothing? retry with the first meaningful word
    if (res.total === 0 && search.includes(" ")) {
        const loose = { ...filters, search: search.split(" ")[0] };
        res = await patentService.getAllPatents(loose);
        trace.push(`patentService.getAllPatents(${JSON.stringify(loose)})`);
        if (res.total) facts.push(`(No exact phrase match for "${search}"; showing patents matching "${loose.search}".)`);
    }
    facts.unshift(`Patents ${describeScope(entities, { topic: search || null })}: ${fmt(res.total)}`);
    if (topInventorCount !== null && topInventorCount <= 1) {
        facts.push(`Matches are sparse: only ${fmt(res.total)} patent(s) ${describeScope(entities, { topic: search || null })}, and no inventor has more than ${topInventorCount}, so nobody stands out.`);
    }

    if (!entities.institution && !search && !filters.inventor && !filters.year && !filters.yearFrom && !filters.yearTo) {
        const list = await institutionService.getInstitutions();
        trace.push("institutionService.getInstitutions()");
        facts.push(`Patents by institution: ${[...list].sort((a, b) => b.patents - a.patents).map((i) => `${i.name} (${fmt(i.patents)})`).join("; ")}`);
    } else if (!entities.institution && res.facets?.institutions?.length) {
        facts.push(`Institutions with matching patents: ${res.facets.institutions.join(", ")}`);
    }

    records.push(...res.data.map(patentToRecord));
    if (!focus && entities.researcher) focus = { researcher: entities.researcher, researcherId: researcherIdByName(entities.researcher) };
    return { facts, records, trace, focus };
}

async function grants({ entities, flags, text }) {
    const search = kgSearchText(entities.topic) || (entities.researcher ? entities.researcher.toLowerCase() : "");
    const filters = {
        institution: entities.institution || "",
        agency: entities.fundingAgency || "",
        search,
        ...yearFilters(entities),
        limit: LIST_LIMIT,
    };
    let res = await grantService.getAllGrants(filters);
    const trace = [`grantService.getAllGrants(${JSON.stringify(filters)})`];

    // Agency names in the graph are inconsistent ("DST" vs "Department of Science and Technology"):
    // if the exact agency filter finds nothing, fall back to a text search on it.
    if (res.total === 0 && filters.agency) {
        const loose = { ...filters, agency: "", search: filters.agency.toLowerCase() };
        res = await grantService.getAllGrants(loose);
        trace.push(`grantService.getAllGrants(${JSON.stringify(loose)})`);
    }

    const facts = [`Grants ${describeScope(entities)}: ${fmt(res.total)}`];
    const shownAmount = res.data.reduce((s, g) => s + (g.amount || 0), 0);
    if (res.facets?.agencies?.length) facts.push(`Funding agencies involved: ${res.facets.agencies.slice(0, 12).join(", ")}${res.facets.agencies.length > 12 ? ", …" : ""}`);
    if (!entities.institution && res.facets?.institutions?.length) facts.push(`Institutions: ${res.facets.institutions.join(", ")}`);
    if (shownAmount) facts.push(`Combined sanctioned amount of the ${res.data.length} listed grants: ₹${fmt(shownAmount)}`);

    let focus = null;
    if (/\bwho\b|principal investigator|\bpis?\b|investigators/i.test(text) || (flags.wantsTop && /\bwho\b/i.test(text))) {
        const pis = (await trendData.topPrincipalInvestigators({ institution: entities.institution, limit: 15 })).filter((p) => isPersonName(p.name.replace(/^principal,?\s*/i, ""))).slice(0, 8);
        trace.push("trend_engine/outputs/top_principal_investigators.csv");
        if (pis.length) {
            facts.push(`Top principal investigators by number of projects: ${pis.map((p, i) => `${i + 1}. ${p.name} (${p.institution}) — ${p.projects} project(s), ₹${fmt(p.fundingLakhs)} lakhs`).join("; ")}`);
            const ranked = pis.map((p) => ({ name: p.name, count: Number(p.projects) || 0 }));
            const tie = tieFact(ranked, "project(s)");
            if (tie) facts.push(tie);
            focus = rankedFocus(ranked);
        }
    }

    return { facts, records: res.data.map(grantToRecord), trace, focus };
}

async function theses({ entities }) {
    const all = await thesisService.listTheses();
    const words = kgSearchText(entities.topic).toLowerCase().split(/\s+/).filter(Boolean);
    const r = entities.yearRange;
    const name = entities.researcher?.toLowerCase();

    const filtered = all.filter((t) => {
        if (entities.institution && t.institution !== entities.institution) return false;
        if (r?.from && (!t.year || t.year < r.from)) return false;
        if (r?.to && (!t.year || t.year > r.to)) return false;
        if (name && ![...t.authors, ...t.supervisors].some((p) => p?.toLowerCase().includes(name))) return false;
        if (words.length) {
            const hay = `${t.title} ${t.keywords.join(" ")}`.toLowerCase();
            if (!words.every((w) => hay.includes(w.replace(/s$/, "")))) return false;
        }
        return true;
    });

    const facts = [`Theses ${describeScope(entities)}: ${fmt(filtered.length)} (of ${fmt(all.length)} in the graph)`];
    if (!entities.institution && filtered.length) {
        const byInst = {};
        for (const t of filtered) byInst[t.institution || "Unknown"] = (byInst[t.institution || "Unknown"] || 0) + 1;
        facts.push(`By institution: ${Object.entries(byInst).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join("; ")}`);
    }
    return {
        facts,
        records: filtered.slice(0, LIST_LIMIT).map(thesisToRecord),
        trace: ["thesisService.listTheses() + in-memory filter"],
        focus: entities.researcher ? { researcher: entities.researcher } : null,
    };
}

async function researcherProfile(name) {
    const search = await researcherService.getResearchers(1, 5, name, "", "", "rank");
    const match = search.researchers?.find((r) => r.name.toLowerCase() === name.toLowerCase()) || search.researchers?.[0];
    if (!match) return null;
    const profile = await researcherService.getResearcherProfile(match.id);
    return profile;
}

async function researchers({ entities, flags = {} }) {
    const trace = [];

    // 1) A specific person
    if (entities.researcher) {
        const profile = await researcherProfile(entities.researcher);
        trace.push(`researcherService.getResearchers(search="${entities.researcher}") → getResearcherProfile()`);
        if (profile) {
            const topPubs = [...(profile.publicationsList || [])].sort((a, b) => (b.citations || 0) - (a.citations || 0)).slice(0, 5);
            const facts = [
                `Researcher: ${profile.name} — ${profile.institution || "institution unknown"} (overall rank #${profile.rank})`,
                `Output in the graph: ${fmt(profile.publications)} publications, ${fmt(profile.citations)} citations, ${fmt(profile.patents)} patents, ${fmt(profile.grants)} grants, ${fmt(profile.theses)} theses; research score ${fmt(profile.researchScore)}`,
            ];
            if (profile.patentsList?.length) facts.push(`Patents: ${profile.patentsList.slice(0, 5).map((p) => `${p.title} (${p.year ?? "n/a"}, ${p.status || "status n/a"})`).join("; ")}`);
            if (profile.grantsList?.length) facts.push(`Grants: ${profile.grantsList.slice(0, 5).map((g) => `${g.title} (${g.year ?? "n/a"})`).join("; ")}`);
            if (profile.thesesList?.length) facts.push(`Theses: ${profile.thesesList.slice(0, 5).map((t) => `${t.title} (${t.role})`).join("; ")}`);

            const records = [
                researcherToRecord({ id: profile.id, name: profile.name, institution: profile.institution, publications: profile.publications, patents: profile.patents, citations: profile.citations }),
                ...topPubs.map((p) => ({ type: "publication", id: p.id, title: p.title, year: p.year, institution: profile.institution, url: p.url, snippet: [p.venue, `${fmt(p.citations)} citations`].filter(Boolean).join(" · "), extra: { citations: p.citations } })),
            ];
            return { facts, records, trace, focus: { researcher: profile.name, researcherId: profile.id, institution: profile.institution } };
        }

        // Not in the ranked CSV — fall back to graph authorship
        const pubs = await publicationService.getAllPublications({ author: entities.researcher, limit: LIST_LIMIT, sort: "citations" });
        trace.push(`publicationService.getAllPublications({author:"${entities.researcher}"})`);
        return {
            facts: [`"${entities.researcher}" is not in the ranked researcher list. Publications in the graph with a matching author name: ${fmt(pubs.total)}`],
            records: pubs.data.map(pubToRecord),
            trace,
            focus: { researcher: entities.researcher },
        };
    }

    // 2) "top 3 researchers from every institute" — a ranked list per institution
    if (flags.perInstitution && !entities.institution) {
        const n = flags.topN || 3;
        const institutionsList = (await institutionService.getInstitutions()).map((i) => i.name).sort();
        trace.push("institutionService.getInstitutions()");
        let perInst;
        if (entities.domain) {
            const analytics = await analyticsService.getTrendAnalytics({ technology: entities.domain });
            trace.push(`analyticsService.getTrendAnalytics({technology:"${entities.domain}"}).trendEngine.topResearchers grouped by institution`);
            const all = (analytics.trendEngine?.topResearchers || []).map((r) => ({ name: r.researcher, institution: r.institution, publications: r.publications, citations: r.citations }));
            perInst = institutionsList.map((inst) => ({ inst, list: all.filter((r) => sameInstitutionKey(r.institution) === sameInstitutionKey(inst)).slice(0, n) }));
        } else {
            perInst = await Promise.all(institutionsList.map(async (inst) => ({ inst, list: (await researcherService.getResearchers(1, n, "", inst, "", "rank")).researchers || [] })));
            trace.push(`researcherService.getResearchers(limit=${n}, institution=<each of ${institutionsList.length}>)`);
        }
        const scope = entities.domain ? ` in ${entities.domain}` : "";
        const facts = [`Top ${n} researchers${scope} at each of the ${institutionsList.length} institutions (ranked by research score; publication and citation counts shown):`];
        for (const { inst, list } of perInst) {
            facts.push(`${inst}: ${list.length ? list.map((r, i) => `${i + 1}. ${r.name} — ${fmt(r.publications)} pubs, ${fmt(r.citations)} citations`).join("; ") : "no ranked researchers in the data"}`);
        }
        return {
            facts,
            // one source per institution's #1 keeps the citation list short and balanced
            records: perInst.filter((p) => p.list[0]).map((p) => researcherToRecord({ ...p.list[0], institution: p.inst })),
            trace,
            // no single subject, but "who has most patents" can rank everyone listed
            focus: { people: perInst.flatMap((p) => p.list.map((r) => r.name)) },
        };
    }

    // 3) Top researchers in a technology domain
    if (entities.domain) {
        const analytics = await analyticsService.getTrendAnalytics({ technology: entities.domain });
        trace.push(`analyticsService.getTrendAnalytics({technology:"${entities.domain}"}).trendEngine.topResearchers`);
        let list = analytics.trendEngine?.topResearchers || [];
        if (entities.institution) list = list.filter((r) => sameInstitutionKey(r.institution) === sameInstitutionKey(entities.institution));
        if (list.length) {
            return {
                facts: [`Top researchers in ${entities.domain}${entities.institution ? ` at ${entities.institution}` : ""} (by research score): ${list.map((r, i) => `${i + 1}. ${r.researcher} (${r.institution}) — ${fmt(r.publications)} pubs, ${fmt(r.citations)} citations`).join("; ")}`],
                records: list.slice(0, 6).map((r) => researcherToRecord({ name: r.researcher, institution: r.institution, publications: r.publications, citations: r.citations })),
                trace,
                focus: { researcher: list[0].researcher, researcherId: researcherIdByName(list[0].researcher), domain: entities.domain, people: list.slice(0, 10).map((r) => r.researcher) },
            };
        }
    }

    // 4) Overall / single-institution ranking
    const res = await researcherService.getResearchers(1, flags.topN || 10, "", entities.institution || "", "", "rank");
    trace.push(`researcherService.getResearchers(institution="${entities.institution || ""}")`);
    const list = res.researchers || [];
    return {
        facts: [`Top-ranked researchers${entities.institution ? ` at ${entities.institution}` : " across all institutions"} (of ${fmt(res.total)}): ${list.map((r, i) => `${i + 1}. ${r.name} (${r.institution}) — ${fmt(r.publications)} pubs, ${fmt(r.citations)} citations`).join("; ")}`],
        records: list.slice(0, 6).map(researcherToRecord),
        trace,
        focus: list[0] ? { researcher: list[0].name, researcherId: list[0].id, people: list.map((r) => r.name) } : null,
    };
}

// ----------------------------------------------------------
// rank-people: "who has most patents?" about the people the
// previous answer listed (plan.rank = { measure, people })
// ----------------------------------------------------------

const RANK_UNITS = { patents: "patent(s)", publications: "publication(s)", citations: "citation(s)", grants: "grant(s)", theses: "thesis/theses" };

async function citationsFor(name) {
    // Same source as the researcher rankings the user just saw, so numbers agree
    const key = looseNameKey(name);
    const row = getResearchersData().find((r) => looseNameKey(r.researcher) === key);
    if (row && row.citations != null && row.citations !== "") return { count: Number(row.citations) || 0, source: "researcher ranking" };
    const pubs = await publicationService.getAllPublications({ author: name, sort: "citations", limit: 100 });
    return { count: pubs.data.reduce((s, p) => s + (p.citations || 0), 0), source: pubs.total > 100 ? "top 100 graph papers" : "graph papers" };
}

async function countFor(name, measure, allTheses) {
    switch (measure) {
        case "patents": return { count: (await patentService.getAllPatents({ inventor: name, limit: 1 })).total };
        case "publications": return { count: (await publicationService.getAllPublications({ author: name, limit: 1 })).total };
        case "grants": return { count: (await grantService.getAllGrants({ search: name.toLowerCase(), limit: 1 })).total };
        case "theses": {
            const has = nameMatcher(name);
            return { count: allTheses.filter((t) => [...t.authors, ...t.supervisors].some(has)).length };
        }
        case "citations": return citationsFor(name);
        default: return { count: 0 };
    }
}

async function rankPeople({ rank }) {
    const { measure, people } = rank;
    const unit = RANK_UNITS[measure] || measure;
    const allTheses = measure === "theses" ? await thesisService.listTheses() : null;
    const counted = await Promise.all(people.map(async (name) => ({ name, ...(await countFor(name, measure, allTheses)) })));
    const ranked = counted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const top = ranked[0]?.count ?? 0;
    const total = ranked.reduce((s, r) => s + r.count, 0);
    const how = measure === "citations" ? "citations from the researcher ranking (graph papers where a person isn't ranked)"
        : measure === "grants" ? "grants that name them (as PI) in the graph"
            : `${measure} linked to them in the knowledge graph`;
    const facts = [
        `Ranking the ${ranked.length} researchers from the previous answer by ${how}: ${ranked.map((r, i) => `${i + 1}. ${r.name} — ${fmt(r.count)} ${unit}`).join("; ")}`,
    ];
    const tie = tieFact(ranked, unit);
    if (tie) facts.push(tie);
    else if (top > 0) facts.push(`${ranked[0].name} has the most ${measure} among them (${fmt(top)}).`);
    if (top === 0) facts.push(`None of these ${ranked.length} researchers has any ${measure} in the graph.`);
    else if (top <= 1) facts.push(`Matches are sparse: these ${ranked.length} researchers have only ${fmt(total)} ${unit} between them, so this ranking says little.`);

    const field = { patents: "patents", publications: "publications", citations: "citations" }[measure];
    return {
        facts,
        records: ranked.filter((r) => r.count > 0).slice(0, 6).map((r) => ({
            ...researcherToRecord({ name: r.name, ...(field ? { [field]: r.count } : {}) }),
            snippet: `${fmt(r.count)} ${unit}`,
        })),
        trace: [`rank-people: ${measure} for ${people.length} people (${measure === "patents" ? "patentService.getAllPatents({inventor})" : measure === "publications" ? "publicationService.getAllPublications({author})" : measure === "grants" ? "grantService.getAllGrants({search})" : measure === "theses" ? "thesisService.listTheses() authors/supervisors" : "top_researchers.csv citations"} ×${people.length})`],
        focus: rankedFocus(ranked),
    };
}

async function institutions({ entities, scores }) {
    const list = await institutionService.getInstitutions();
    const trace = ["institutionService.getInstitutions()"];
    const facts = [];
    const records = [];
    let instPeople = [];

    if (entities.institution) {
        const inst = list.find((i) => i.name === entities.institution);
        if (inst) {
            facts.push(`${inst.name} (${inst.location || "Bengaluru"}): ${fmt(inst.publications)} publications, ${fmt(inst.patents)} patents, ${fmt(inst.grants)} grants, ${fmt(inst.theses)} theses. Most active publication domain: ${inst.topDomain || "n/a"}.`);
            const growth = await trendData.institutionGrowth(inst.name);
            if (growth) facts.push(`Research output growth ${growth.yearly[0]?.year}–${growth.yearly.at(-1)?.year}: CAGR ${growth.cagrPercent}% (${growth.trend}); yearly totals ${growth.yearly.map((y) => `${y.year}: ${fmt(y.total)}`).join(", ")}`);
            const top = await researcherService.getResearchers(1, 5, "", inst.name, "", "rank");
            if (top.researchers?.length) facts.push(`Top researchers at ${inst.name}: ${top.researchers.map((r) => `${r.name} (${fmt(r.publications)} pubs)`).join(", ")}`);
            instPeople = (top.researchers || []).map((r) => r.name);
            records.push({ type: "institution", id: inst.id, title: inst.name, year: null, institution: inst.name, url: null, snippet: `${fmt(inst.publications)} publications · ${fmt(inst.patents)} patents`, extra: {} });
            records.push(...(top.researchers || []).slice(0, 3).map(researcherToRecord));
        }
        return { facts, records, trace, focus: { institution: entities.institution, ...(instPeople.length ? { people: instPeople } : {}) } };
    }

    const search = kgSearchText(entities.topic);
    if (search) {
        const res = await publicationService.getAllPublications({ search, limit: 5, sort: "citations", ...yearFilters(entities) });
        trace.push(`publicationService.getAllPublications({search:"${search}"}).facets.institutions`);
        facts.push(`Publications with "${search}" in the title: ${fmt(res.total)}. By institution: ${res.facets.institutions.map((f) => `${f.name} (${fmt(f.count)})`).join("; ") || "none"}`);
        records.push(...res.data.map(pubToRecord));
        return { facts, records, trace };
    }

    const measure = pickMeasure(scores);
    const ranked = [...list].sort((a, b) =>
        measure ? b[measure] - a[measure] : (b.publications + b.patents + b.grants + b.theses) - (a.publications + a.patents + a.grants + a.theses));
    facts.push(`The SMART knowledge graph covers ${list.length} Bengaluru institutions.`);
    facts.push(`Ranked by ${measure || "total research output"}: ${ranked.map((i, n) => `${n + 1}. ${i.name} — ${fmt(i.publications)} pubs, ${fmt(i.patents)} patents, ${fmt(i.grants)} grants, ${fmt(i.theses)} theses`).join("; ")}`);
    return { facts, records: ranked.slice(0, 8).map((i) => ({ type: "institution", id: i.id, title: i.name, year: null, institution: i.name, url: null, snippet: `${fmt(i.publications)} publications · ${fmt(i.patents)} patents`, extra: {} })), trace };
}

async function compare({ entities }) {
    const list = await institutionService.getInstitutions();
    const trace = ["institutionService.getInstitutions()"];
    const picked = entities.institutions.map((n) => list.find((i) => i.name === n)).filter(Boolean);
    const facts = [];
    for (const inst of picked) {
        const growth = await trendData.institutionGrowth(inst.name);
        facts.push(`${inst.name}: ${fmt(inst.publications)} publications, ${fmt(inst.patents)} patents, ${fmt(inst.grants)} grants, ${fmt(inst.theses)} theses; top domain ${inst.topDomain || "n/a"}${growth ? `; output CAGR ${growth.cagrPercent}% (${growth.trend})` : ""}`);
    }
    const search = kgSearchText(entities.topic);
    if (search) {
        for (const inst of picked) {
            const res = await publicationService.getAllPublications({ search, institution: inst.name, limit: 1, ...yearFilters(entities) });
            facts.push(`${inst.name} publications with "${search}" in the title: ${fmt(res.total)}`);
        }
        trace.push(`publicationService.getAllPublications({search:"${search}", institution}) ×${picked.length}`);
    }
    return {
        facts,
        records: picked.map((i) => ({ type: "institution", id: i.id, title: i.name, year: null, institution: i.name, url: null, snippet: `${fmt(i.publications)} publications · ${fmt(i.patents)} patents`, extra: {} })),
        trace,
    };
}

async function fundingAgencies({ entities }) {
    const trace = [];
    const facts = [];
    if (entities.institution) {
        const res = await grantService.getAllGrants({ institution: entities.institution, limit: 1 });
        trace.push(`grantService.getAllGrants({institution:"${entities.institution}"}).facets.agencies`);
        facts.push(`${entities.institution} has ${fmt(res.total)} grants from: ${res.facets.agencies.join(", ") || "n/a"}`);
    }
    const top = await trendData.topFundingAgencies(10);
    trace.push("trend_engine/outputs/top_funding_agencies.csv");
    if (top.length) facts.push(`Top funding agencies across all institutions (by number of projects): ${top.map((a, i) => `${i + 1}. ${a.agency} — ${fmt(a.projects)} projects, ₹${fmt(a.fundingLakhs)} lakhs, ${a.institutions} institution(s)`).join("; ")}`);
    return { facts, records: [], trace };
}

async function trends({ entities }) {
    const analytics = await analyticsService.getTrendAnalytics({ technology: entities.domain || "" });
    const trace = [`analyticsService.getTrendAnalytics({technology:"${entities.domain || ""}"})`];
    const facts = [];
    const out = analytics.researchOutput || {};
    const byYear = (out.byYear || []).filter((y) => y.year);

    if (entities.domain) {
        facts.push(`${entities.domain}: CAGR ${fmt(out.cagrPercent)}%, latest year-on-year growth ${fmt(out.yoyGrowthPercent)}%`);
        if (byYear.length) facts.push(`Yearly output (publications+patents+grants+theses): ${byYear.map((y) => `${y.year}: ${fmt(y.total)}`).join(", ")}`);
        const tr = analytics.trendEngine?.topResearchers || [];
        if (tr.length) facts.push(`Leading researchers in this domain: ${tr.slice(0, 5).map((r) => `${r.researcher} (${r.institution})`).join(", ")}`);
    } else {
        const cagr = [...(analytics.trendEngine?.domainCAGR || [])]
            .map((r) => ({ domain: r.domain_name, cagr: Number(r.cagr_percent), trend: r.trend }))
            .filter((r) => r.domain && Number.isFinite(r.cagr))
            .sort((a, b) => b.cagr - a.cagr);
        if (cagr.length) facts.push(`Fastest-growing technology domains (CAGR of yearly research output): ${cagr.slice(0, 8).map((r, i) => `${i + 1}. ${r.domain} ${r.cagr}% (${r.trend})`).join("; ")}`);
        const emerging = analytics.trendEngine?.emergingDomains || [];
        if (emerging.length) facts.push(`Largest domains by research score: ${emerging.slice(0, 6).map((d) => `${d.domain} (${fmt(d.total)} records)`).join("; ")}`);
        if (byYear.length) facts.push(`Overall yearly output: ${byYear.map((y) => `${y.year}: ${fmt(y.total)}`).join(", ")}`);
    }

    if (entities.institution) {
        const growth = await trendData.institutionGrowth(entities.institution);
        if (growth) facts.push(`${entities.institution} output CAGR ${growth.cagrPercent}% (${growth.trend}); yearly: ${growth.yearly.map((y) => `${y.year}: ${fmt(y.total)}`).join(", ")}`);
    }
    return { facts, records: [], trace, focus: entities.domain ? { domain: entities.domain } : null };
}

async function dashboardStats() {
    const overview = await dashboardService.getDashboardOverview();
    return {
        facts: [`SMART totals: ${overview.stats.map((s) => `${s.label} ${fmt(s.value)}`).join(", ")}`],
        records: [],
        trace: ["dashboardService.getDashboardOverview()"],
    };
}

async function knowledgeGraph() {
    const base = await dashboardStats();
    return {
        ...base,
        facts: [
            ...base.facts,
            "Node labels: Institution, Publication, Patent, Grant, Thesis, Person, FundingAgency, Department, Domain, Subdomain, Field, Keyword, IPC, Applicant, Location.",
            "Key relationships: Institution-HAS_PUBLICATION/HAS_PATENT/HAS_GRANT/HAS_THESIS->record; Person-AUTHORED_PUBLICATION->Publication; Person-INVENTED->Patent; Person-PI_OF->Grant; Grant-FUNDED_BY->FundingAgency; Person-AUTHORED_THESIS/SUPERVISED->Thesis; Publication-HAS_DOMAIN/HAS_SUBDOMAIN; Patent-HAS_IPC/BELONGS_TO_FIELD; Thesis-HAS_KEYWORD.",
            "The interactive graph is available on the Knowledge Graph page of the dashboard.",
        ],
    };
}

async function search({ entities, flags }) {
    // Pure topical question: semantic retrieval does the heavy lifting,
    // the graph adds an exact title-match count.
    const searchText = kgSearchText(entities.topic);
    if (!searchText) return { facts: [], records: [], trace: [] };
    return publications({ entities, flags });
}

const HANDLERS = {
    publications,
    patents,
    grants,
    theses,
    researchers,
    institutions,
    compare,
    "funding agencies": fundingAgencies,
    trends,
    "dashboard statistics": dashboardStats,
    "knowledge graph": knowledgeGraph,
    search,
    "rank-people": rankPeople,
};

const PER_PERSON_INTENTS = new Set(["publications", "patents", "grants", "theses", "researchers"]);

/**
 * "show their publications" when the previous answer had no single subject
 * (a tie, or a list): run the normal handler once per person and merge.
 */
async function forEachPerson(handler, plan) {
    const names = plan.entities.researchers;
    const outs = await Promise.all(names.map((name) => handler({ ...plan, entities: { ...plan.entities, researcher: name, researchers: [] } })));
    const more = plan.followUp?.morePeople || 0;
    return {
        facts: [
            `Answering for each of the ${names.length} people from the previous answer (${names.join(", ")})${more ? `; ${more} more were listed but are not shown` : ""}.`,
            ...outs.flatMap((o) => o.facts || []),
        ],
        records: outs.flatMap((o) => (o.records || []).slice(0, 3)),
        trace: outs.flatMap((o) => o.trace || []),
        focus: { people: names },
    };
}

export async function retrieveFromGraph(plan) {
    const handler = HANDLERS[plan.intent];
    if (!handler) return { ok: true, facts: [], records: [], trace: [], focus: null };
    try {
        const many = plan.entities?.researchers?.length > 1 && !plan.entities.researcher && PER_PERSON_INTENTS.has(plan.intent);
        if (plan.entities?.researchers?.length === 1 && !plan.entities.researcher) plan.entities.researcher = plan.entities.researchers[0];
        const out = many ? await forEachPerson(handler, plan) : await handler(plan);
        return { ok: true, focus: null, ...out };
    } catch (err) {
        console.error(`[chat] KG retrieval failed for intent "${plan.intent}":`, err);
        const down = /ServiceUnavailable|ECONNREFUSED|Could not perform discovery|connect/i.test(`${err.code} ${err.message}`);
        return {
            ok: false,
            error: down ? "Knowledge graph (Neo4j) is not reachable" : err.message,
            facts: [],
            records: [],
            trace: [],
            focus: null,
        };
    }
}
