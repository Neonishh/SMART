import driver from "../config/neo4j.js";

export async function getDashboardOverview() {
    const session = driver.session();

    try {
        //----------------------------------------------------
        // Dashboard Statistics
        //----------------------------------------------------

        const statsResult = await session.run(`
            MATCH (p:Publication)
            WITH count(p) AS publications

            MATCH (pat:Patent)
            WITH publications, count(pat) AS patents

            MATCH (g:Grant)
            WITH publications, patents, count(g) AS grants

            MATCH (t:Thesis)
            WITH publications, patents, grants, count(t) AS theses

            MATCH (i:Institution)
            RETURN
                publications,
                patents,
                grants,
                theses,
                count(i) AS institutions
        `);

        const statsRecord = statsResult.records[0];

        const stats = [
            {
                label: "Publications",
                value: Number(statsRecord.get("publications")),
                delta: ""
            },
            {
                label: "Patents",
                value: Number(statsRecord.get("patents")),
                delta: ""
            },
            {
                label: "Grants",
                value: Number(statsRecord.get("grants")),
                delta: ""
            },
            {
                label: "Theses",
                value: Number(statsRecord.get("theses")),
                delta: ""
            },
            {
                label: "Institutions",
                value: Number(statsRecord.get("institutions")),
                delta: ""
            }
        ];

        //----------------------------------------------------
        // Publication Trend
        //----------------------------------------------------

        const trendResult = await session.run(`
            MATCH (p:Publication)

            WHERE p.Year IS NOT NULL

            RETURN
                toInteger(p.Year) AS year,
                count(*) AS publications

            ORDER BY year
        `);

        const publicationTrend = trendResult.records.map(record => ({
            year: Number(record.get("year")),
            publications: Number(record.get("publications"))
        }));

        //----------------------------------------------------
        // Top Domains
        //----------------------------------------------------

        const domainResult = await session.run(`
            MATCH (:Publication)-[:HAS_DOMAIN]->(d:Domain)

            RETURN
                d.Domain AS domain,
                count(*) AS papers

            ORDER BY papers DESC

            LIMIT 5
        `);

        const topDomains = domainResult.records.map(record => ({
            domain: record.get("domain"),
            papers: Number(record.get("papers"))
        }));

        //----------------------------------------------------
        // Return
        //----------------------------------------------------

        return {
            stats,
            publicationTrend,
            topDomains
        };

    } finally {

        await session.close();

    }
}