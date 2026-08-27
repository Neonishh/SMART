import driver from "../config/neo4j.js";

function makeId(value = "") {
    return String(value)
        .trim()
        .toUpperCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function clean(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function splitKeywords(value) {
    if (!value) return [];

    return [...new Set(
        String(value)
            .split(/[;,]/)
            .map((item) => item.trim())
            .filter(Boolean)
    )];
}

/**
 * Returns all active theses, enriched through the existing knowledge-graph
 * relationships. Soft-deleted theses are intentionally hidden.
 */
export async function listTheses() {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (t:Thesis)
            WHERE coalesce(t.is_deleted, false) = false

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
 * Returns one active thesis by ID.
 */
export async function getThesisById(thesisId) {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (t:Thesis {Thesis_ID: $thesisId})
            WHERE coalesce(t.is_deleted, false) = false

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

/**
 * Creates a thesis and its supporting graph nodes/relationships.
 * This is the manual-intervention / contribution flow.
 */
export async function createThesis(data = {}) {
    const thesisId = clean(data.thesisId);
    const title = clean(data.title);
    const researcher = clean(data.researcher);
    const guide = clean(data.guide);
    const institution = clean(data.institution);
    const department = clean(data.department);
    const abstract = clean(data.abstract);
    const sourceUrl = clean(data.sourceUrl);
    const source = clean(data.source);
    const location = clean(data.location);
    const contributorName = clean(data.contributorName);
    const contributorAccessCode = clean(data.contributorAccessCode);
    const year = Number(data.year);
    const keywords = splitKeywords(data.keywords);

    if (!thesisId || !title || !researcher || !guide || !institution || !year) {
        const error = new Error(
            "Thesis ID, title, researcher, guide, institution and year are required."
        );
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        const error = new Error("Please enter a valid thesis year.");
        error.statusCode = 400;
        throw error;
    }

    const session = driver.session();

    try {
        const existing = await session.run(
            `MATCH (t:Thesis {Thesis_ID: $thesisId}) RETURN t.is_deleted AS deleted LIMIT 1`,
            { thesisId }
        );

        if (existing.records.length > 0) {
            const error = new Error("A thesis with this Thesis ID already exists.");
            error.statusCode = 409;
            throw error;
        }

        const personId = makeId(researcher);
        const guideId = makeId(guide);
        const institutionId = makeId(institution);
        const departmentId = department ? makeId(department) : null;
        const locationId = location ? makeId(location) : null;

        await session.run(`
            MERGE (t:Thesis {Thesis_ID: $thesisId})
            SET t.Title = $title,
                t.Year = $year,
                t.Abstract = $abstract,
                t.Source_URL = $sourceUrl,
                t.Source = $source,
                t.is_deleted = false,
                t.created_at = datetime(),
                t.created_by = $contributorName,
                t.contributor_access_code = $contributorAccessCode

            MERGE (author:Person {Person_ID: $personId})
            SET author.Name = $researcher
            MERGE (author)-[:AUTHORED_THESIS]->(t)

            MERGE (supervisor:Person {Person_ID: $guideId})
            SET supervisor.Name = $guide
            MERGE (supervisor)-[:SUPERVISED]->(t)

            MERGE (inst:Institution {Institution_ID: $institutionId})
            SET inst.Institution = $institution
            MERGE (inst)-[:HAS_THESIS]->(t)

            FOREACH (_ IN CASE WHEN $departmentId IS NULL THEN [] ELSE [1] END |
                MERGE (dept:Department {Department_ID: $departmentId})
                SET dept.Department = $department
                MERGE (dept)-[:HANDLES_THESIS]->(t)
                MERGE (inst)-[:HAS_DEPARTMENT]->(dept)
            )

            FOREACH (_ IN CASE WHEN $locationId IS NULL THEN [] ELSE [1] END |
                MERGE (loc:Location {Location_ID: $locationId})
                SET loc.Location = $location
                MERGE (inst)-[:LOCATED_IN]->(loc)
            )
        `, {
            thesisId,
            title,
            year,
            abstract,
            sourceUrl,
            source,
            contributorName,
            contributorAccessCode,
            personId,
            researcher,
            guideId,
            guide,
            institutionId,
            institution,
            departmentId,
            department,
            locationId,
            location,
        });

        for (const keyword of keywords) {
            const keywordId = `KW_${makeId(keyword)}`;

            await session.run(`
                MATCH (t:Thesis {Thesis_ID: $thesisId})
                MERGE (kw:Keyword {Keyword_ID: $keywordId})
                SET kw.Keyword = $keyword
                MERGE (t)-[:HAS_KEYWORD]->(kw)
            `, {
                thesisId,
                keywordId,
                keyword,
            });
        }

        return getThesisById(thesisId);
    } finally {
        await session.close();
    }
}

/**
 * Soft-deletes a thesis. The node remains in Neo4j for audit/recovery,
 * but normal thesis queries no longer show it.
 *
 * If an access code was supplied, it must match the code stored on the
 * manually contributed thesis. Admin requests can bypass that check.
 */
export async function softDeleteThesis(thesisId, accessCode = "", deletedBy = "", isAdmin = false) {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (t:Thesis {Thesis_ID: $thesisId})
            RETURN
                t.is_deleted AS isDeleted,
                t.contributor_access_code AS accessCode,
                t.created_by AS createdBy
            LIMIT 1
        `, { thesisId });

        if (result.records.length === 0) {
            const error = new Error("Thesis not found.");
            error.statusCode = 404;
            throw error;
        }

        const record = result.records[0];

        if (record.get("isDeleted") === true) {
            const error = new Error("Thesis has already been deleted.");
            error.statusCode = 409;
            throw error;
        }

        const storedCode = record.get("accessCode") || "";
        const createdBy = record.get("createdBy") || "";

        if (!isAdmin && (!accessCode || accessCode !== storedCode)) {
            const error = new Error("Invalid contributor access code.");
            error.statusCode = 403;
            throw error;
        }

        await session.run(`
            MATCH (t:Thesis {Thesis_ID: $thesisId})
            SET t.is_deleted = true,
                t.deleted_at = datetime(),
                t.deleted_by = $deletedBy
            RETURN t.Thesis_ID AS id
        `, {
            thesisId,
            deletedBy: clean(deletedBy) || createdBy || "Admin",
        });

        return { id: thesisId, deleted: true };
    } finally {
        await session.close();
    }
}
