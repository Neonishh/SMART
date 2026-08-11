import driver from "../config/neo4j.js";
import neo4j from "neo4j-driver";

/**
 * IMPORTANT: institutions/domains/subdomains are collected as ARRAYS,
 * not single scalar values — even though most publications will only
 * have one of each. A publication CAN be linked to more than one
 * Institution (e.g. co-published across institutions) or Domain.
 *
 * Returning them as scalars caused a classic Cypher bug: implicit
 * grouping by every non-aggregated returned field meant a publication
 * with 2 institutions came back as 2 separate near-duplicate rows
 * (same Publication_ID, different institution each) instead of one
 * row with two institutions. Collecting everything as an array,
 * aggregated in its own WITH step, avoids that entirely.
 */

const LIST_FIELDS = `
    MATCH (p:Publication)

    OPTIONAL MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(p)
    WITH p, collect(DISTINCT {id: author.Person_ID, name: author.Name}) AS authors

    OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(p)
    WITH p, authors, collect(DISTINCT inst.Institution) AS institutions

    OPTIONAL MATCH (p)-[:HAS_DOMAIN]->(dom:Domain)
    WITH p, authors, institutions, collect(DISTINCT dom.Domain) AS domains

    OPTIONAL MATCH (p)-[:HAS_SUBDOMAIN]->(sub:Subdomain)
    WITH p, authors, institutions, domains, collect(DISTINCT sub.Subdomain) AS subdomains
`;

const RETURN_FIELDS = `
    RETURN
        p.Publication_ID AS id,
        p.Title AS title,
        p.Venue AS venue,
        p.Year AS year,
        p.DOI AS doi,
        p.Citations AS citations,
        p.Source_URL AS sourceUrl,
        authors,
        institutions,
        domains,
        subdomains
`;

function mapRecord(record) {
    return {
        id: record.get("id"),
        title: record.get("title"),
        venue: record.get("venue"),
        year: record.get("year") !== null ? Number(record.get("year")) : null,
        doi: record.get("doi"),
        citations: record.get("citations") !== null ? Number(record.get("citations")) : 0,
        sourceUrl: record.get("sourceUrl"),
        authors: record.get("authors").filter((a) => a.name),
        institutions: record.get("institutions").filter(Boolean),
        domains: record.get("domains").filter(Boolean),
        subdomains: record.get("subdomains").filter(Boolean),
    };
}

export async function listPublications() {
    const session = driver.session();
    try {
        const result = await session.run(`${LIST_FIELDS} ${RETURN_FIELDS} ORDER BY p.Year DESC`);
        return result.records.map(mapRecord);
    } finally {
        await session.close();
    }
}

export async function getPublicationById(publicationId) {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Publication {Publication_ID: $publicationId})

            OPTIONAL MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(p)
            WITH p, collect(DISTINCT {id: author.Person_ID, name: author.Name}) AS authors

            OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(p)
            WITH p, authors, collect(DISTINCT inst.Institution) AS institutions

            OPTIONAL MATCH (p)-[:HAS_DOMAIN]->(dom:Domain)
            WITH p, authors, institutions, collect(DISTINCT dom.Domain) AS domains

            OPTIONAL MATCH (p)-[:HAS_SUBDOMAIN]->(sub:Subdomain)
            WITH p, authors, institutions, domains, collect(DISTINCT sub.Subdomain) AS subdomains

            ${RETURN_FIELDS}
        `, { publicationId });

        if (result.records.length === 0) return null;
        return mapRecord(result.records[0]);
    } finally {
        await session.close();
    }
}

/**
 * Server-side filtered search — GET /publications/search
 * All filters optional; empty string / 0 means "not applied".
 * Institution/domain filters use ANY(...) since those fields are
 * now arrays.
 */
export async function searchPublications(filters) {
    const session = driver.session();
    const { search = "", institution = "", domain = "", author = "", year = 0, venue = "" } = filters;

    try {
        const result = await session.run(`
            ${LIST_FIELDS}
            WHERE
                ($search = '' OR toLower(p.Title) CONTAINS toLower($search))
                AND ($institution = '' OR $institution IN institutions)
                AND ($domain = '' OR $domain IN domains)
                AND ($year = 0 OR p.Year = $year)
                AND ($venue = '' OR toLower(p.Venue) CONTAINS toLower($venue))
                AND ($author = '' OR any(a IN authors WHERE a.name IS NOT NULL AND toLower(a.name) CONTAINS toLower($author)))
            ${RETURN_FIELDS}
            ORDER BY p.Year DESC
        `, { search, institution, domain, author, year: Number(year) || 0, venue });

        return result.records.map(mapRecord);
    } finally {
        await session.close();
    }
}

/** GET /publications/:id/authors */
export async function getAuthorsForPublication(publicationId) {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(:Publication {Publication_ID: $publicationId})
            RETURN author.Person_ID AS id, author.Name AS name
        `, { publicationId });

        return result.records.map((r) => ({ id: r.get("id"), name: r.get("name") }));
    } finally {
        await session.close();
    }
}

/**
 * Related papers, ranked by relevance rather than just recency:
 * - Tier 1 (strong signal): shares a Subdomain, or shares a co-author.
 *   These are specific enough to actually mean something.
 * - Tier 2 (weak signal, fallback only): shares a Domain. Domains can
 *   be very broad (e.g. "Engineering" covering thousands of papers),
 *   so this tier is only used to fill remaining slots if Tier 1
 *   doesn't produce enough results — never ranked equally with it.
 */
export async function getRelatedPublications(publicationId, limit = 5) {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Publication {Publication_ID: $publicationId})

            OPTIONAL MATCH (p)-[:HAS_SUBDOMAIN]->(:Subdomain)<-[:HAS_SUBDOMAIN]-(bySubdomain:Publication)
            WHERE bySubdomain.Publication_ID <> $publicationId
            WITH p, collect(DISTINCT bySubdomain)[0..15] AS subdomainMatches

            OPTIONAL MATCH (p)<-[:AUTHORED_PUBLICATION]-(:Person)-[:AUTHORED_PUBLICATION]->(byAuthor:Publication)
            WHERE byAuthor.Publication_ID <> $publicationId
            WITH p, subdomainMatches, collect(DISTINCT byAuthor)[0..15] AS authorMatches

            OPTIONAL MATCH (p)-[:HAS_DOMAIN]->(:Domain)<-[:HAS_DOMAIN]-(byDomain:Publication)
            WHERE byDomain.Publication_ID <> $publicationId
            WITH subdomainMatches, authorMatches, collect(DISTINCT byDomain)[0..15] AS domainMatches

            RETURN subdomainMatches, authorMatches, domainMatches
        `, { publicationId });

        if (result.records.length === 0) return [];

        const record = result.records[0];
        const toItem = (node) => ({
            id: node.properties.Publication_ID,
            title: node.properties.Title,
            year: node.properties.Year !== null && node.properties.Year !== undefined ? Number(node.properties.Year) : null,
            citations: node.properties.Citations !== null && node.properties.Citations !== undefined ? Number(node.properties.Citations) : 0,
        });

        const strongTier = [...record.get("subdomainMatches"), ...record.get("authorMatches")].map(toItem);
        const weakTier = record.get("domainMatches").map(toItem);

        // Dedup, keeping first occurrence (strong tier wins if a paper
        // appears in both), each tier sorted by year within itself.
        const seen = new Set();
        const ranked = [];
        for (const item of [...sortByYearDesc(strongTier), ...sortByYearDesc(weakTier)]) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            ranked.push(item);
            if (ranked.length >= limit) break;
        }

        return ranked;
    } finally {
        await session.close();
    }
}

function sortByYearDesc(items) {
    return [...items].sort((a, b) => (b.year || 0) - (a.year || 0));
}

export async function getRelatedPatentsByAuthor(publicationId, limit = 5) {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (:Publication {Publication_ID: $publicationId})<-[:AUTHORED_PUBLICATION]-(person:Person)-[:INVENTED]->(pat:Patent)
            RETURN DISTINCT pat.Patent_ID AS id, pat.Patent_Title AS title, pat.Year AS year
            ORDER BY pat.Year DESC
            LIMIT $limit
        `, { publicationId, limit: neo4j.int(limit) });

        return result.records.map((r) => ({
            id: r.get("id"),
            title: r.get("title"),
            year: r.get("year") !== null ? Number(r.get("year")) : null,
        }));
    } finally {
        await session.close();
    }
}