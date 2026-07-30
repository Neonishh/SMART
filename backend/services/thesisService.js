import driver from "../config/neo4j.js";

/**
 * Returns a list of theses, each enriched with:
 * - authors      (via AUTHORED_THESIS)
 * - supervisors  (via SUPERVISED)
 * - department   (via HANDLES_THESIS)
 * - institution  (via HAS_THESIS)
 * - keywords     (via HAS_KEYWORD)
 *
 * None of these live as flat properties on the Thesis node itself —
 * they're all relationships, so we traverse out from each Thesis
 * and collect the connected nodes.
 */
export async function listTheses() {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (t:Thesis)

            OPTIONAL MATCH (author:Person)-[:AUTHORED_THESIS]->(t)
            OPTIONAL MATCH (supervisor:Person)-[:SUPERVISED]->(t)
            OPTIONAL MATCH (dept:Department)-[:HANDLES_THESIS]->(t)
            OPTIONAL MATCH (inst:Institution)-[:HAS_THESIS]->(t)
            OPTIONAL MATCH (t)-[:HAS_KEYWORD]->(kw:Keyword)

            RETURN
                t.Thesis_ID AS id,
                t.Title AS title,
                t.Year AS year,
                t.Abstract AS abstract,
                t.Source AS source,
                t.Source_URL AS sourceUrl,
                collect(DISTINCT author.Name) AS authors,
                collect(DISTINCT supervisor.Name) AS supervisors,
                dept.Department AS department,
                inst.Institution AS institution,
                collect(DISTINCT kw.Keyword) AS keywords

            ORDER BY t.Year DESC
        `);

        return result.records.map((record) => ({
            id: record.get("id"),
            title: record.get("title"),
            year: record.get("year") !== null ? Number(record.get("year")) : null,
            abstract: record.get("abstract"),
            source: record.get("source"),
            sourceUrl: record.get("sourceUrl"),
            authors: record.get("authors").filter(Boolean),
            supervisors: record.get("supervisors").filter(Boolean),
            department: record.get("department"),
            institution: record.get("institution"),
            keywords: record.get("keywords").filter(Boolean),
        }));

    } finally {
        await session.close();
    }
}

/**
 * Returns a single thesis by ID, with the same enrichment as listTheses().
 * Useful for a future detail view/modal.
 */
export async function getThesisById(thesisId) {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (t:Thesis {Thesis_ID: $thesisId})

            OPTIONAL MATCH (author:Person)-[:AUTHORED_THESIS]->(t)
            OPTIONAL MATCH (supervisor:Person)-[:SUPERVISED]->(t)
            OPTIONAL MATCH (dept:Department)-[:HANDLES_THESIS]->(t)
            OPTIONAL MATCH (inst:Institution)-[:HAS_THESIS]->(t)
            OPTIONAL MATCH (t)-[:HAS_KEYWORD]->(kw:Keyword)

            RETURN
                t.Thesis_ID AS id,
                t.Title AS title,
                t.Year AS year,
                t.Abstract AS abstract,
                t.Source AS source,
                t.Source_URL AS sourceUrl,
                collect(DISTINCT author.Name) AS authors,
                collect(DISTINCT supervisor.Name) AS supervisors,
                dept.Department AS department,
                inst.Institution AS institution,
                collect(DISTINCT kw.Keyword) AS keywords
        `, { thesisId });

        if (result.records.length === 0) return null;

        const record = result.records[0];

        return {
            id: record.get("id"),
            title: record.get("title"),
            year: record.get("year") !== null ? Number(record.get("year")) : null,
            abstract: record.get("abstract"),
            source: record.get("source"),
            sourceUrl: record.get("sourceUrl"),
            authors: record.get("authors").filter(Boolean),
            supervisors: record.get("supervisors").filter(Boolean),
            department: record.get("department"),
            institution: record.get("institution"),
            keywords: record.get("keywords").filter(Boolean),
        };

    } finally {
        await session.close();
    }
}