// ==========================================================
// Get Researcher Profile
// CSV gives the base stats (rank, name, institution, counts).
// Neo4j gives the real linked records — publications, patents,
// theses, grants — via the Person node's relationships.
// ==========================================================

import { getResearchersData } from "./csvLoader.js";
import driver from "../../config/neo4j.js";
import neo4j from "neo4j-driver";

// ==========================================================
// Neo4j returns 64-bit integers as {low, high} objects instead
// of plain JS numbers (they don't always fit safely in a JS
// number). React can't render that object directly, so every
// numeric property coming back from a query has to pass
// through this before it reaches the frontend.
// ==========================================================

function toPlainNumber(value) {

    if (value === null || value === undefined) {

        return value;

    }

    if (neo4j.isInt(value)) {

        return neo4j.integer.inSafeRange(value)
            ? value.toNumber()
            : value.toString();

    }

    return value;

}

// ==========================================================
// Name normalization for CSV <-> graph matching.
//
// Graph Person.Name values are inconsistent in format:
//   "2. AGRIM AGARWAL"     (numeric prefix, no comma)
//   "Bhat, Furqan A"       (Last, First — no prefix)
//   "Dr. Satyam Suwas"     (honorific prefix)
//   "Satyam Suwas"         (plain)
//
// CSV names are plain "First Last" with no prefix/comma.
//
// Rather than pattern-matching the raw string (which breaks on
// any one of these variations), both sides are reduced to a
// sorted, punctuation-free token set. That's robust to prefixes,
// commas, honorifics, and word order — and it's also what makes
// duplicate graph nodes for the same person collide naturally:
// "Dr. Satyam Suwas" and "Satyam Suwas" both normalize to the
// same key, so no special-case duplicate handling is needed.
// ==========================================================

function normalizeName(rawName) {

    if (!rawName) {

        return "";

    }

    return rawName
        .replace(/^\d+\.\s*/, "")   // strip leading "2. " style numeric prefix
        .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "") // strip common honorifics
        .replace(/[.,]/g, "")       // strip commas and periods
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .sort()
        .join(" ");

}

// ==========================================================
// Build a normalized-name -> [graph Person.Name, ...] index
// from every Person node in the graph. Small graph, cheap query
// — run once per profile request. If this ever becomes a
// bottleneck, it can be cached/refreshed on an interval instead
// of queried per call.
// ==========================================================

async function buildNameIndex(session) {

    const result = await session.run(
        `MATCH (p:Person) RETURN p.Name AS name`
    );

    const index = new Map();

    for (const record of result.records) {

        const graphName = record.get("name");

        const key = normalizeName(graphName);

        if (!key) {

            continue;

        }

        if (!index.has(key)) {

            index.set(key, []);

        }

        index.get(key).push(graphName);

    }

    return index;

}

// Look up every graph Person.Name that matches a given CSV name
// after normalization. Returns an empty array if there's no match.
function findGraphNames(csvName, nameIndex) {

    return nameIndex.get(normalizeName(csvName)) || [];

}

export async function getResearcherProfile(id) {

    console.log("======================================");
    console.log("✅ getResearcherProfile() called for id:", id);
    console.log("======================================");

    // ------------------------------------------------------
    // Base stats from CSV
    // ------------------------------------------------------

    const researchers = getResearchersData();

    const numericId = Number(id);

    const researcher = researchers.find(r => r.rank === numericId);

    if (!researcher) {

        return null;

    }

    const profile = {

        id: researcher.rank,

        rank: researcher.rank,

        name: researcher.researcher,

        institution: researcher.institution,

        domain: "Research",

        publications: researcher.publications,

        grants: 0,

        patents: 0,

        theses: researcher.theses,

        citations: researcher.citations,

        researchScore: researcher.research_score,

        publicationsList: [],

        patentsList: [],

        thesesList: [],

        grantsList: [],

        domains: []

    };

    // ------------------------------------------------------
    // Linked records from the knowledge graph
    // ------------------------------------------------------

    const session = driver.session();

    try {

        // Resolve every graph node name that plausibly refers to
        // this researcher, instead of a single ENDS WITH guess.
        const nameIndex = await buildNameIndex(session);

        const matchedNames = findGraphNames(researcher.researcher, nameIndex);

        if (matchedNames.length === 0) {

            console.warn(
                `⚠️ No graph Person node matched CSV name "${researcher.researcher}" ` +
                `after normalization.`
            );

        } else {

            const result = await session.run(
                `
                MATCH (p:Person)
                WHERE p.Name IN $names

                WITH collect(p) AS people

                UNWIND people AS person
                OPTIONAL MATCH (person)-[:AUTHORED_PUBLICATION]->(pub:Publication)
                WITH people, collect(DISTINCT pub) AS publications

                UNWIND people AS person
                OPTIONAL MATCH (person)-[:INVENTED]->(pat:Patent)
                WITH people, publications, collect(DISTINCT pat) AS patents

                UNWIND people AS person
                OPTIONAL MATCH (person)-[:AUTHORED_THESIS]->(authoredThesis:Thesis)
                WITH people, publications, patents,
                     collect(DISTINCT authoredThesis) AS authoredTheses

                UNWIND people AS person
                OPTIONAL MATCH (person)-[:SUPERVISED]->(supervisedThesis:Thesis)
                WITH people, publications, patents, authoredTheses,
                     collect(DISTINCT supervisedThesis) AS supervisedTheses

                UNWIND people AS person
                OPTIONAL MATCH (person)-[:PI_OF]->(grant:Grant)
                WITH publications, patents, authoredTheses, supervisedTheses,
                     collect(DISTINCT grant) AS grants

                RETURN publications, patents, authoredTheses, supervisedTheses, grants
                `,
                { names: matchedNames }
            );

            if (result.records.length > 0) {

                const record = result.records[0];

                const publications = record.get("publications") || [];

                const patents = record.get("patents") || [];

                const authoredTheses = record.get("authoredTheses") || [];

                const supervisedTheses = record.get("supervisedTheses") || [];

                const grants = record.get("grants") || [];

                profile.publicationsList = publications.map(pub => ({

                    id: pub.properties.Publication_ID,

                    title: pub.properties.Title,

                    year: toPlainNumber(pub.properties.Year),

                    venue: pub.properties.Venue,

                    citations: toPlainNumber(pub.properties.Citations),

                    doi: pub.properties.DOI,

                    // DOI is the more stable, canonical link when present;
                    // Source_URL (e.g. openalex.org) is the fallback.
                    url: pub.properties.DOI || pub.properties.Source_URL || null

                }));

                profile.patentsList = patents.map(pat => ({

                    id: pat.properties.Patent_ID,

                    title: pat.properties.Patent_Title,

                    status: pat.properties.Patent_Status,

                    year: toPlainNumber(pat.properties.Year)

                }));

                profile.thesesList = [
                    ...authoredTheses.map(t => ({
                        id: t.properties.Thesis_ID,
                        title: t.properties.Title,
                        year: toPlainNumber(t.properties.Year),
                        role: "Author",
                        url: t.properties.Source_URL || null
                    })),
                    ...supervisedTheses.map(t => ({
                        id: t.properties.Thesis_ID,
                        title: t.properties.Title,
                        year: toPlainNumber(t.properties.Year),
                        role: "Supervisor",
                        url: t.properties.Source_URL || null
                    }))
                ];

                profile.grantsList = grants.map(g => ({

                    id: g.properties.Grant_ID,

                    title: g.properties.Title,

                    year: toPlainNumber(g.properties.Year),

                    amount: toPlainNumber(g.properties.Amount)

                }));

                // Prefer graph-derived counts where the graph actually found
                // linked records — falls back to CSV counts otherwise.
                // (Previously only patents/grants were overwritten here,
                // which left the publications/citations/theses stats
                // showing stale CSV numbers even when the lists below
                // them were fully populated from the graph.)
                profile.publications = publications.length;

                profile.patents = patents.length;

                profile.theses = authoredTheses.length + supervisedTheses.length;

                profile.grants = grants.length;

                // Citations aren't a direct CSV/graph 1:1 — recompute as
                // the sum over the actual publication list so it matches
                // what's rendered, rather than trusting the CSV total.
                profile.citations = publications.reduce(
                    (sum, pub) => sum + (toPlainNumber(pub.properties.Citations) || 0),
                    0
                );

            }

            // ------------------------------------------------------
            // Research domains — run as a separate query rather than
            // folding into the chain above. That chain is a sequence
            // of UNWIND stages; if this researcher had zero
            // publications, UNWINDing an empty list would silently
            // wipe out the patents/theses/grants already collected
            // further down the same pipeline. Keeping it independent
            // avoids that risk entirely.
            // ------------------------------------------------------

            const domainsResult = await session.run(
                `
                MATCH (p:Person)
                WHERE p.Name IN $names
                MATCH (p)-[:AUTHORED_PUBLICATION]->(:Publication)-[:HAS_DOMAIN]->(d:Domain)
                RETURN DISTINCT d.Domain AS domain
                `,
                { names: matchedNames }
            );

            profile.domains = domainsResult.records
                .map(record => record.get("domain"))
                .filter(Boolean);

        }

    }

    catch (error) {

        console.error("getResearcherProfile Neo4j error:", error);

        // CSV-based fields still return even if the graph lookup fails.

    }

    finally {

        await session.close();

    }

    return profile;

}