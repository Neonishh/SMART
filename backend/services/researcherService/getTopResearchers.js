// ==========================================================
// Get Top Researchers
// ==========================================================

import driver from "../../config/neo4j.js";

export async function getTopResearchers() {

    const session = driver.session();

    try {

        const query = `
           MATCH (p:Person)

WHERE
    p.Name IS NOT NULL
    AND trim(p.Name) <> ""
    AND p.Person_ID IS NOT NULL
    AND trim(p.Person_ID) <> ""

OPTIONAL MATCH (p)-[:AUTHORED_PUBLICATION]->(pub:Publication)
WITH p, COUNT(DISTINCT pub) AS publications

            OPTIONAL MATCH (p)-[:PI_OF]->(g:Grant)
            WITH p, publications, COUNT(DISTINCT g) AS grants

            OPTIONAL MATCH (p)-[:INVENTED]->(pat:Patent)
            WITH p, publications, grants,
                 COUNT(DISTINCT pat) AS patents

            OPTIONAL MATCH (p)-[:AUTHORED_THESIS]->(th:Thesis)
            WITH
                p,
                publications,
                grants,
                patents,
                COUNT(DISTINCT th) AS theses

            WITH
                p,
                publications,
                grants,
                patents,
                theses,

                (
                    publications * 4 +
                    grants * 5 +
                    patents * 3 +
                    theses * 2
                ) AS impact

            WHERE impact > 0

           RETURN
    trim(p.Person_ID) AS id,
    trim(p.Name) AS name,
                publications,
                grants,
                patents,
                theses,
                impact

            ORDER BY impact DESC

            LIMIT 8
        `;

        const result = await session.run(query);

        return result.records.map(record => ({

            id: record.get("id"),

            name: record.get("name"),

            publications: record.get("publications").toNumber(),

            grants: record.get("grants").toNumber(),

            patents: record.get("patents").toNumber(),

            theses: record.get("theses").toNumber(),

            impact: record.get("impact").toNumber()

        }));

    }

    catch (error) {

        console.error("Top Researchers Error:", error);

        throw error;

    }

    finally {

        await session.close();

    }

}