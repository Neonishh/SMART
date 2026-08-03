import driver from "../config/neo4j.js";

/*
=========================================================
HELPER - BUILD FILTER QUERY
=========================================================
Supported Filters

- year
- institution
- agency
- pi
- search
=========================================================
*/

function buildGrantQuery(filters = {}) {

    const where = [];
    const params = {};

    // -------------------------
    // Year
    // -------------------------

    if (filters.year) {

        where.push("g.Year = $year");
        params.year = Number(filters.year);

    }

    // -------------------------
    // Institution
    // -------------------------

    if (filters.institution) {

        where.push(`
            EXISTS {
                MATCH (instFilter:Institution)-[:HAS_GRANT]->(g)
                WHERE instFilter.Institution = $institution
            }
        `);

        params.institution = filters.institution;

    }

    // -------------------------
    // Funding Agency
    // -------------------------

    if (filters.agency) {

        where.push(`
            EXISTS {
                MATCH (g)-[:FUNDED_BY]->(agencyFilter:FundingAgency)
                WHERE agencyFilter.Funding_Agency = $agency
            }
        `);

        params.agency = filters.agency;

    }

    // -------------------------
    // Principal Investigator
    // -------------------------

    if (filters.pi) {

        where.push(`
            EXISTS {
                MATCH (piFilter:Person)-[:PI_OF]->(g)
                WHERE piFilter.Name = $pi
            }
        `);

        params.pi = filters.pi;

    }

    // -------------------------
    // Search
    // -------------------------

    if (filters.search) {

        where.push(`(

            toLower(coalesce(g.Title,"")) CONTAINS $search

            OR EXISTS {

                MATCH (instSearch:Institution)-[:HAS_GRANT]->(g)

                WHERE
                toLower(coalesce(instSearch.Institution,""))
                CONTAINS $search

            }

            OR EXISTS {

                MATCH (g)-[:FUNDED_BY]->(agencySearch:FundingAgency)

                WHERE
                toLower(coalesce(agencySearch.Funding_Agency,""))
                CONTAINS $search

            }

            OR EXISTS {

                MATCH (piSearch:Person)-[:PI_OF]->(g)

                WHERE
                toLower(coalesce(piSearch.Name,""))
                CONTAINS $search

            }

        )`);

        params.search = filters.search.toLowerCase();

    }

    return {

        whereClause:
            where.length > 0
                ? `WHERE ${where.join(" AND ")}`
                : "",

        params

    };

}

/*
=========================================================
BASE QUERY
=========================================================
*/

function buildGrantBaseQuery(whereClause) {

    return `

        MATCH (g:Grant)

        ${whereClause}

    `;

}

/*
=========================================================
GET ALL GRANTS
=========================================================
*/

export async function getAllGrants(filters = {}) {

    const session = driver.session();

    try {

        const page = Math.max(Number(filters.page) || 1, 1);

        const limit = Math.max(Number(filters.limit) || 20, 1);

        const offset = (page - 1) * limit;

        const { whereClause, params } =
            buildGrantQuery(filters);

        const baseQuery =
            buildGrantBaseQuery(whereClause);

        /*
        -------------------------------------
        COUNT
        -------------------------------------
        */

        const countResult = await session.run(

            `

            ${baseQuery}

            RETURN count(DISTINCT g) AS total

            `,

            params

        );

        const total =
            Number(
                countResult.records[0]?.get("total") ?? 0
            );

        /*
        -------------------------------------
        FACETS
        -------------------------------------
        */

        const facetsResult = await session.run(

            `

            ${baseQuery}

            OPTIONAL MATCH
            (inst:Institution)-[:HAS_GRANT]->(g)

            OPTIONAL MATCH
            (g)-[:FUNDED_BY]->(agency:FundingAgency)

            OPTIONAL MATCH
            (pi:Person)-[:PI_OF]->(g)

            RETURN

            collect(DISTINCT inst.Institution)
                AS institutions,

            collect(DISTINCT agency.Funding_Agency)
                AS agencies,

            collect(DISTINCT pi.Name)
                AS principalInvestigators

            `,

            params

        );
        const facetsRow = facetsResult.records[0];

        const facets = {

            institutions:
                (facetsRow?.get("institutions") ?? [])
                    .filter(Boolean)
                    .sort(),

            agencies:
                (facetsRow?.get("agencies") ?? [])
                    .filter(Boolean)
                    .sort(),

            principalInvestigators:
                (facetsRow?.get("principalInvestigators") ?? [])
                    .filter(Boolean)
                    .sort()

        };

        /*
        -------------------------------------
        MAIN QUERY
        -------------------------------------
        */

        const result = await session.run(

            `

            ${baseQuery}

            OPTIONAL MATCH
            (inst:Institution)-[:HAS_GRANT]->(g)

            OPTIONAL MATCH
            (g)-[:FUNDED_BY]->(agency:FundingAgency)

            OPTIONAL MATCH
            (pi:Person)-[:PI_OF]->(g)

            OPTIONAL MATCH
            (dept:Department)-[:HANDLES_GRANT]->(g)

            WITH

                g,

                collect(DISTINCT inst.Institution)
                    AS institutions,

                collect(DISTINCT agency.Funding_Agency)
                    AS agencies,

                collect(DISTINCT pi.Name)
                    AS investigators,

                collect(DISTINCT dept.Department)
                    AS departments

            RETURN

                g.Grant_ID AS id,

                g.Title AS title,

                g.Amount AS amount,

                g.Year AS year,

                coalesce(head(institutions), "")
                    AS institution,

                coalesce(head(agencies), "")
                    AS agency,

                coalesce(head(investigators), "")
                    AS pi,

                coalesce(head(departments), "")
                    AS department

            ORDER BY

                year DESC,

                title

            SKIP ${offset}

            LIMIT ${limit}

            `,

            params

        );

        return {

            data:

                result.records.map((record) => ({

                    id:
                        record.get("id"),

                    title:
                        record.get("title"),

                    amount:
                        Number(record.get("amount") ?? 0),

                    year:
                        Number(record.get("year")),

                    institution:
                        record.get("institution"),

                    agency:
                        record.get("agency"),

                    pi:
                        record.get("pi"),

                    department:
                        record.get("department")

                })),

            total,

            page,

            limit,

            totalPages:

                Math.max(
                    Math.ceil(total / limit),
                    1
                ),

            facets

        };

    }

    finally {

        await session.close();

    }

}
/*
=========================================================
GET GRANT BY ID
=========================================================
*/

export async function getGrantById(id) {

    const session = driver.session();

    try {

        const result = await session.run(

            `

            MATCH (g:Grant {Grant_ID:$id})

            OPTIONAL MATCH
            (inst:Institution)-[:HAS_GRANT]->(g)

            OPTIONAL MATCH
            (g)-[:FUNDED_BY]->(agency:FundingAgency)

            OPTIONAL MATCH
            (pi:Person)-[:PI_OF]->(g)

            OPTIONAL MATCH
            (dept:Department)-[:HANDLES_GRANT]->(g)

            RETURN

                g,

                head(collect(DISTINCT inst)) AS inst,

                head(collect(DISTINCT agency)) AS agency,

                head(collect(DISTINCT pi)) AS pi,

                head(collect(DISTINCT dept)) AS dept

            `,

            { id }

        );

        if (result.records.length === 0)
            return null;

        const row = result.records[0];

        const grant = row.get("g").properties;

        const year = grant.Year;

        const amount = grant.Amount;

        return {

            Grant_ID:
                grant.Grant_ID,

            Title:
                grant.Title,

            Amount:
                typeof amount === "number"
                    ? amount
                    : amount?.low ?? amount,

            Year:
                typeof year === "number"
                    ? year
                    : year?.low ?? year,

            Source_URL:
                grant.Source_URL,

            Institution:

                row.get("inst")

                    ? row.get("inst").properties.Institution

                    : "",

            Funding_Agency:

                row.get("agency")

                    ? row.get("agency").properties.Funding_Agency

                    : "",

            Principal_Investigator:

                row.get("pi")

                    ? row.get("pi").properties.Name

                    : "",

            Department:

                row.get("dept")

                    ? row.get("dept").properties.Department

                    : "",

            /*
            ---------------------------------------------------
            Future Expansion
            ---------------------------------------------------

            When publication-grant and patent-grant
            relationships are added, populate these arrays.

            ---------------------------------------------------
            */

            Publications: [],

            Patents: []

        };

    }

    finally {

        await session.close();

    }

}
/*
=========================================================
GRANT ANALYTICS
=========================================================
*/

export async function getGrantAnalytics() {

    const session = driver.session();

    try {

        /*
        -------------------------------------------------
        FUNDING TREND
        -------------------------------------------------
        */

        const trendResult = await session.run(

            `
            MATCH (g:Grant)

            RETURN

                g.Year AS year,

                count(g) AS grants,

                sum(coalesce(g.Amount,0)) AS funding

            ORDER BY year
            `
        );

        /*
        -------------------------------------------------
        TOP FUNDING AGENCIES
        -------------------------------------------------
        */

        const agencyResult = await session.run(

            `
            MATCH (g:Grant)-[:FUNDED_BY]->(agency:FundingAgency)

            RETURN
                agency.Funding_Agency AS agency,
                count(g) AS grants,
                sum(coalesce(g.Amount,0)) AS funding

            ORDER BY grants DESC
            LIMIT 5
            `
        );

        /*
        -------------------------------------------------
        INSTITUTION-WISE FUNDING
        -------------------------------------------------
        */

        const institutionResult = await session.run(

            `
            MATCH (inst:Institution)-[:HAS_GRANT]->(g:Grant)

            RETURN

                inst.Institution AS institution,

                count(g) AS grants,

                sum(coalesce(g.Amount,0)) AS funding

            ORDER BY funding DESC

            LIMIT 10
            `
        );

        /*
        -------------------------------------------------
        OVERVIEW
        -------------------------------------------------
        */

        const overviewResult = await session.run(

            `
            MATCH (g:Grant)

            OPTIONAL MATCH
            (g)-[:FUNDED_BY]->(agency:FundingAgency)

            OPTIONAL MATCH
            (inst:Institution)-[:HAS_GRANT]->(g)

            RETURN

                count(DISTINCT g) AS totalGrants,

                count(DISTINCT agency) AS totalAgencies,

                count(DISTINCT inst) AS totalInstitutions,

                sum(coalesce(g.Amount,0)) AS totalFunding
            `
        );

        const overview = overviewResult.records[0];

        return {

            /*
            -----------------------------------------
            OVERVIEW
            -----------------------------------------
            */

            overview: {

                totalGrants:
                    Number(
                        overview.get("totalGrants")
                    ),

                totalAgencies:
                    Number(
                        overview.get("totalAgencies")
                    ),

                totalInstitutions:
                    Number(
                        overview.get("totalInstitutions")
                    ),

                totalFunding:
                    Number(
                        overview.get("totalFunding") ?? 0
                    )

            },

            /*
            -----------------------------------------
            FUNDING TREND
            -----------------------------------------
            */

            fundingTrend:

                trendResult.records.map(r => ({

                    year:
                        Number(r.get("year")),

                    grants:
                        Number(r.get("grants")),

                    funding:
                        Number(r.get("funding") ?? 0)

                })),

            /*
            -----------------------------------------
            FUNDING AGENCIES
            -----------------------------------------
            */

            agencyFunding:

                agencyResult.records.map(r => ({

                    agency:
                        r.get("agency"),

                    grants:
                        Number(r.get("grants")),

                    funding:
                        Number(r.get("funding") ?? 0)

                })),

            /*
            -----------------------------------------
            INSTITUTION FUNDING
            -----------------------------------------
            */

            institutionFunding:

                institutionResult.records.map(r => ({

                    institution:
                        r.get("institution"),

                    grants:
                        Number(r.get("grants")),

                    funding:
                        Number(r.get("funding") ?? 0)

                }))

        };

    }

    finally {

        await session.close();

    }

}