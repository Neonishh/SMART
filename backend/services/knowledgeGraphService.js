// ==========================================================
// SMART Knowledge Graph Service
// ==========================================================

import driver from "../config/neo4j.js";
import { formatGraph } from "../utils/graphFormatter.js";

// ==========================================================
// Fetch Initial Knowledge Graph
// ==========================================================

export async function getKnowledgeGraph() {

    const session = driver.session();

    try {

        const result = await session.run(`
            MATCH (i:Institution)

            WITH i

            ORDER BY i.Institution

            LIMIT 10

            CALL {

                WITH i

                MATCH (i)-[r]->(m)

                RETURN i AS n, r, m

                LIMIT 40

            }

            RETURN n, r, m
        `);

        return formatGraph(result.records);

    }

    catch (error) {

        console.error("Knowledge Graph Service Error:", error);

        throw error;

    }

    finally {

        await session.close();

    }

}