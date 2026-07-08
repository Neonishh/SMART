import driver from "../config/neo4j.js";

export async function getInstitutions() {
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (i:Institution)
            OPTIONAL MATCH (i)-[:LOCATED_IN]->(l:Location)

            CALL {
                WITH i
                MATCH (i)-[:HAS_PUBLICATION]->(pub:Publication)
                RETURN count(pub) AS publications
            }
            CALL {
                WITH i
                MATCH (i)-[:HAS_PATENT]->(pat:Patent)
                RETURN count(pat) AS patents
            }
            CALL {
                WITH i
                MATCH (i)-[:HAS_GRANT]->(g:Grant)
                RETURN count(g) AS grants
            }
            CALL {
                WITH i
                MATCH (i)-[:HAS_THESIS]->(t:Thesis)
                RETURN count(t) AS theses
            }
            CALL {
                WITH i
                OPTIONAL MATCH (i)-[:HAS_PUBLICATION]->(:Publication)-[:HAS_DOMAIN]->(d:Domain)
                RETURN d.Domain AS domain, count(*) AS domainCount
                ORDER BY domainCount DESC
                LIMIT 1
            }

            RETURN
                i.Institution_ID AS id,
                i.Institution AS name,
                l.Location AS location,
                publications,
                patents,
                grants,
                theses,
                domain AS topDomain
            ORDER BY name
        `);

        return result.records.map(record => ({
            id: record.get("id"),
            name: record.get("name"),
            location: record.get("location"),
            publications: Number(record.get("publications")),
            patents: Number(record.get("patents")),
            grants: Number(record.get("grants")),
            theses: Number(record.get("theses")),
            topDomain: record.get("topDomain")
        }));

    } finally {
        await session.close();
    }
}