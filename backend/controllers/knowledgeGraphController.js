import { getKnowledgeGraph } from "../services/knowledgeGraphService.js";

export async function fetchKnowledgeGraph(req, res) {

    try {

        const graph = await getKnowledgeGraph();

        res.json(graph);

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            error: "Failed to fetch knowledge graph."

        });

    }

}