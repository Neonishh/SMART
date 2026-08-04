import driver from "../config/neo4j.js";

function buildPublicationQuery(filters = {}) {
    const where = [];
    const params = {};

    if (filters.year) {
        where.push("pub.Year = $year");
        params.year = Number(filters.year);
    }

    if (filters.institution) {
        where.push(`EXISTS {
            MATCH (instFilter:Institution)-[:HAS_PUBLICATION]->(pub)
            WHERE instFilter.Institution = $institution
        }`);
        params.institution = filters.institution;
    }

    if (filters.author) {
        where.push(`EXISTS {
            MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(pub)
            WHERE author.Name = $author
        }`);
        params.author = filters.author;
    }

    if (filters.keyword) {
        where.push(`(
            toLower(coalesce(pub.Title, "")) CONTAINS $keyword
            OR EXISTS {
                MATCH (pub)-[:HAS_DOMAIN]->(d)
                WHERE toLower(coalesce(d.Domain, "")) CONTAINS $keyword
            }
            OR EXISTS {
                MATCH (pub)-[:HAS_SUBDOMAIN]->(s)
                WHERE toLower(coalesce(s.Subdomain, "")) CONTAINS $keyword
            }
        )`);
        params.keyword = filters.keyword.toLowerCase();
    }

    if (filters.title) {
        where.push(`toLower(coalesce(pub.Title, "")) CONTAINS $title`);
        params.title = filters.title.toLowerCase();
    }

    return {
        whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
        params
    };
}

function buildPublicationBaseQuery(whereClause) {
    return `
        MATCH (pub:Publication)
        ${whereClause}
    `;
}

export async function getAllPublications(filters = {}) {
    const session = driver.session();

    try {
        const page = Math.max(Number(filters.page) || 1, 1);
        const limit = Math.max(Number(filters.limit) || 20, 1);
        const offset = (page - 1) * limit;

        const { whereClause, params } = buildPublicationQuery(filters);
        const baseQuery = buildPublicationBaseQuery(whereClause);

        // COUNT
        const countResult = await session.run(`
            ${baseQuery}
            RETURN count(DISTINCT pub) AS total
        `, params);

        const total = Number(countResult.records[0]?.get("total") ?? 0);

        // FACETS: institutions, authors, domains
        const facetsResult = await session.run(`
            ${baseQuery}
            OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(pub)
            OPTIONAL MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(pub)
            OPTIONAL MATCH (pub)-[:HAS_DOMAIN]->(d:Domain)
            RETURN
                collect(DISTINCT inst.Institution) AS institutions,
                collect(DISTINCT author.Name) AS authors,
                collect(DISTINCT d.Domain) AS domains
        `, params);

        const facetsRow = facetsResult.records[0];

        const facets = {
            institutions: (facetsRow?.get("institutions") ?? []).filter(Boolean).sort(),
            authors: (facetsRow?.get("authors") ?? []).filter(Boolean).sort(),
            domains: (facetsRow?.get("domains") ?? []).filter(Boolean).sort()
        };

        // MAIN QUERY
        const result = await session.run(`
            ${baseQuery}
            OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(pub)
            OPTIONAL MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(pub)
            OPTIONAL MATCH (pub)-[:HAS_DOMAIN]->(d:Domain)

            WITH pub,
                collect(DISTINCT inst.Institution) AS institutions,
                collect(DISTINCT author.Name) AS authors,
                collect(DISTINCT d.Domain) AS domains

            RETURN
                pub.Publication_ID AS id,
                pub.Title AS title,
                pub.Venue AS venue,
                pub.Year AS year,
                coalesce(head(institutions), "") AS institution,
                authors AS authors,
                domains AS domains
            ORDER BY year DESC, title
            SKIP ${offset}
            LIMIT ${limit}
        `, params);

        return {
            data: result.records.map(record => ({
                id: record.get("id"),
                title: record.get("title"),
                venue: record.get("venue"),
                year: record.get("year") !== null ? Number(record.get("year")) : null,
                institution: record.get("institution"),
                authors: (record.get("authors") ?? []).filter(Boolean),
                domains: (record.get("domains") ?? []).filter(Boolean)
            })),
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            facets
        };

    } finally {
        await session.close();
    }
}

export async function getPublicationById(id) {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (pub:Publication {Publication_ID:$id})
            OPTIONAL MATCH (author:Person)-[:AUTHORED_PUBLICATION]->(pub)
            OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(pub)
            OPTIONAL MATCH (pub)-[:HAS_DOMAIN]->(d:Domain)
            OPTIONAL MATCH (pub)-[:HAS_SUBDOMAIN]->(s:Subdomain)
            RETURN
                pub,
                collect(DISTINCT author.Name) AS authors,
                head(collect(DISTINCT inst)) AS inst,
                collect(DISTINCT d.Domain) AS domains,
                collect(DISTINCT s.Subdomain) AS subdomains
        `, { id });

        if (result.records.length === 0) return null;

        const row = result.records[0];
        const pub = row.get("pub").properties;

        return {
            Publication_ID: pub.Publication_ID,
            Title: pub.Title,
            Venue: pub.Venue,
            Year: typeof pub.Year === "number" ? pub.Year : pub.Year?.low ?? pub.Year,
            DOI: pub.DOI,
            Citations: pub.Citations,
            Source_URL: pub.Source_URL,
            Institution: row.get("inst") ? row.get("inst").properties.Institution : "",
            Authors: (row.get("authors") ?? []).filter(Boolean),
            Domains: (row.get("domains") ?? []).filter(Boolean),
            Subdomains: (row.get("subdomains") ?? []).filter(Boolean)
        };

    } finally {
        await session.close();
    }
}
