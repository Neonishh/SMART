import driver from "../config/neo4j.js";

function buildPatentQuery(filters = {}) {

    const where = [];
    const params = {};

    if (filters.year) {
        where.push("pat.Year = $year");
        params.year = Number(filters.year);
    }

    if (filters.institution) {
        where.push(`EXISTS {
            MATCH (instFilter:Institution)-[:HAS_PATENT]->(pat)
            WHERE instFilter.Institution = $institution
        }`);
        params.institution = filters.institution;
    }

    if (filters.applicant) {
        where.push(`EXISTS {
            MATCH (appFilter:Applicant)-[:APPLIED_FOR]->(pat)
            WHERE appFilter.Applicant_Name = $applicant
        }`);
        params.applicant = filters.applicant;
    }

    if (filters.ipc) {
        where.push(`EXISTS {
            MATCH (pat)-[:HAS_IPC]->(ipcFilter:IPC)
            WHERE ipcFilter.IPC_Code = $ipc
        }`);
        params.ipc = filters.ipc;
    }

    if (filters.search) {
        where.push(`(
            toLower(coalesce(pat.Patent_Title, "")) CONTAINS $search
            OR EXISTS {
                MATCH (instSearch:Institution)-[:HAS_PATENT]->(pat)
                WHERE toLower(coalesce(instSearch.Institution, "")) CONTAINS $search
            }
            OR EXISTS {
                MATCH (appSearch:Applicant)-[:APPLIED_FOR]->(pat)
                WHERE toLower(coalesce(appSearch.Applicant_Name, "")) CONTAINS $search
            }
            OR EXISTS {
                MATCH (pat)-[:HAS_IPC]->(ipcSearch:IPC)
                WHERE toLower(coalesce(ipcSearch.IPC_Code, "")) CONTAINS $search
            }
            OR EXISTS {
                MATCH (pat)-[:BELONGS_TO_FIELD]->(fieldSearch:Field)
                WHERE toLower(coalesce(fieldSearch.Field, "")) CONTAINS $search
            }
        )`);
        params.search = filters.search.toLowerCase();
    }

    return {
        whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
        params,
    };
}

function buildPatentBaseQuery(whereClause) {
    return `
            MATCH (pat:Patent)
            ${whereClause}
        `;
}

/*
=========================================================
GET ALL PATENTS
Supports Filters:
- year
- institution
- applicant
- ipc
=========================================================
*/

export async function getAllPatents(filters = {}) {

    const session = driver.session();

    try {

        const page = Math.max(Number(filters.page) || 1, 1);
        const limit = Math.max(Number(filters.limit) || 20, 1);
        const offset = (page - 1) * limit;
        const { whereClause, params } = buildPatentQuery(filters);
        const baseQuery = buildPatentBaseQuery(whereClause);

        const countResult = await session.run(
            `
            ${baseQuery}
            RETURN count(DISTINCT pat) AS total
            `,
            params
        );

        const total = Number(countResult.records[0]?.get("total") ?? 0);

        const facetsResult = await session.run(
            `
            ${baseQuery}

            OPTIONAL MATCH (inst:Institution)-[:HAS_PATENT]->(pat)
            OPTIONAL MATCH (app:Applicant)-[:APPLIED_FOR]->(pat)
            OPTIONAL MATCH (pat)-[:HAS_IPC]->(ipc:IPC)

            RETURN
                collect(DISTINCT inst.Institution) AS institutions,
                collect(DISTINCT app.Applicant_Name) AS applicants,
                collect(DISTINCT ipc.IPC_Code) AS ipcCodes
            `,
            params
        );

        const facetsRow = facetsResult.records[0];
        const facets = {
            institutions: (facetsRow?.get("institutions") ?? []).filter(Boolean).sort(),
            applicants: (facetsRow?.get("applicants") ?? []).filter(Boolean).sort(),
            ipcCodes: (facetsRow?.get("ipcCodes") ?? []).filter(Boolean).sort(),
        };

        const result = await session.run(
            `
            ${baseQuery}

            OPTIONAL MATCH (inst:Institution)-[:HAS_PATENT]->(pat)
            OPTIONAL MATCH (app:Applicant)-[:APPLIED_FOR]->(pat)
            OPTIONAL MATCH (pat)-[:HAS_IPC]->(ipc:IPC)
            OPTIONAL MATCH (pat)-[:BELONGS_TO_FIELD]->(f:Field)

            WITH pat,
                collect(DISTINCT inst.Institution) AS institutions,
                collect(DISTINCT app.Applicant_Name) AS applicants,
                collect(DISTINCT ipc.IPC_Code) AS ipcCodes,
                collect(DISTINCT f.Field) AS fields

            RETURN
                pat.Patent_ID AS id,
                pat.Patent_Title AS title,
                pat.Patent_Status AS status,
                pat.Application_Number AS applicationNumber,
                pat.Publication_Number AS publicationNumber,
                pat.Application_Filing_Date AS filingDate,
                pat.Publication_Date AS publicationDate,
                pat.Year AS year,
                coalesce(head(institutions), "") AS institution,
                coalesce(head(applicants), "") AS applicant,
                coalesce(head(ipcCodes), "") AS ipc,
                coalesce(head(fields), "") AS field
            ORDER BY year DESC, title
            SKIP ${offset}
            LIMIT ${limit}
            `,
            params
        );

        return {
            data: result.records.map(record => ({

            id: record.get("id"),

            title: record.get("title"),

            status: record.get("status"),

            applicationNumber: record.get("applicationNumber"),

            publicationNumber: record.get("publicationNumber"),

            filingDate: record.get("filingDate"),

            publicationDate: record.get("publicationDate"),

            year: Number(record.get("year")),

            institution: record.get("institution"),

            applicant: record.get("applicant"),

            ipc: record.get("ipc"),

            field: record.get("field")

            })),
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            facets,
        };

    }

    finally {

        await session.close();

    }

}

/*
=========================================================
PATENT PROFILE
=========================================================
*/

export async function getPatentById(id) {

    const session = driver.session();

    try {

        const result = await session.run(

    `
    MATCH (pat:Patent {Patent_ID:$id})

    OPTIONAL MATCH (inst:Institution)-[:HAS_PATENT]->(pat)

    OPTIONAL MATCH (app:Applicant)-[:APPLIED_FOR]->(pat)

    OPTIONAL MATCH (pat)-[:HAS_IPC]->(ipc:IPC)

    OPTIONAL MATCH (pat)-[:BELONGS_TO_FIELD]->(field:Field)

    OPTIONAL MATCH (person:Person)-[:INVENTED]->(pat)

    RETURN

    pat,

    head(collect(DISTINCT inst)) AS inst,

    head(collect(DISTINCT app)) AS app,

    head(collect(DISTINCT ipc)) AS ipc,

    head(collect(DISTINCT field)) AS field,

    collect(DISTINCT person.Name) AS inventors
    `,
            { id }

        );

        if (result.records.length === 0)
            return null;

        const row = result.records[0];

        const patent = row.get("pat").properties;

        const year = patent.Year;

        return {

            Patent_ID: patent.Patent_ID,

            Patent_Title: patent.Patent_Title,

            Patent_Status: patent.Patent_Status,

            Application_Number: patent.Application_Number,

            Publication_Number: patent.Publication_Number,

            Filing_Date: patent.Application_Filing_Date,

            Publication_Date: patent.Publication_Date,

            Year: typeof year === "number" ? year : year?.low ?? year,

            Abstract: patent.Abstract,

            Institution:
                row.get("inst")
                    ? row.get("inst").properties.Institution
                    : "",

            Applicant:
                row.get("app")
                    ? row.get("app").properties.Applicant_Name
                    : "",

            IPC:
                row.get("ipc")
                    ? row.get("ipc").properties.IPC_Code
                    : "",

            Field:
                row.get("field")
                    ? row.get("field").properties.Field
                    : "",

            Inventors: row.get("inventors")

        };

    }

    finally {

        await session.close();

    }

}

/*
=========================================================
PATENT ANALYTICS
=========================================================
*/

export async function getPatentTrends() {

    const session = driver.session();

    try {

        //------------------------------------------
        // Patent Growth
        //------------------------------------------

        const growth = await session.run(

`
MATCH (p:Patent)

RETURN

p.Year AS year,

count(*) AS patents

ORDER BY year
`

        );

        //------------------------------------------
        // IPC Distribution
        //------------------------------------------

        const ipc = await session.run(

`
MATCH (p:Patent)-[:HAS_IPC]->(i:IPC)

RETURN

i.IPC_Code AS ipc,

count(*) AS patents

ORDER BY patents DESC

LIMIT 10
`

        );

        //------------------------------------------
        // Top Applicants
        //------------------------------------------

        const applicants = await session.run(

`
MATCH (a:Applicant)-[:APPLIED_FOR]->(p:Patent)

RETURN

a.Applicant_Name AS applicant,

count(*) AS patents

ORDER BY patents DESC

LIMIT 10
`

        );

        return {

            growth:

                growth.records.map(r => ({

                    year: Number(r.get("year")),

                    patents: Number(r.get("patents"))

                })),

            ipcDistribution:

                ipc.records.map(r => ({

                    ipc: r.get("ipc"),

                    patents: Number(r.get("patents"))

                })),

            topApplicants:

                applicants.records.map(r => ({

                    applicant: r.get("applicant"),

                    patents: Number(r.get("patents"))

                }))

        };

    }

    finally {

        await session.close();

    }

}