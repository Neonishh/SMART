// ==========================================================
// SMART Knowledge Graph
// ==========================================================

import { useEffect, useState } from "react";

import GraphCanvas from "../components/Graph/GraphCanvas";
import GraphDetails from "../components/Graph/GraphDetails";

import { fetchKnowledgeGraph } from "../services/graphService";

import "../styles/knowledgeGraph.css";

export default function KnowledgeGraph() {

    const [graphData, setGraphData] = useState({

        nodes: [],
        links: []

    });

    const [loading, setLoading] = useState(true);

    const [selectedNode, setSelectedNode] = useState(null);

    // ======================================================
    // Load Graph
    // ======================================================

    useEffect(() => {

        async function loadGraph() {

            try {

                const data = await fetchKnowledgeGraph();

                setGraphData(data);

            }

            catch (err) {

                console.error(err);

            }

            finally {

                setLoading(false);

            }

        }

        loadGraph();

    }, []);

    // ======================================================
    // Node Click
    // ======================================================

    function handleNodeClick(node) {

        setSelectedNode(node);

    }

    // ======================================================
    // Loading
    // ======================================================

    if (loading) {

        return (

            <div
                className="kg-loading"
                style={{
                    height: "620px",
                    border: "1px solid #E5E5E5",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.85rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)"
                }}
            >

                Loading SMART Knowledge Graph…

            </div>

        );

    }

    // ======================================================
    // Render
    // ======================================================

    return (

        <div className="kg-layout">

            {/* Canvas card */}
            <div className="kg-canvas-card">

                <span className="kg-canvas-hint">

                    Click any node to see its connections and details.

                </span>

                <GraphCanvas

                    graphData={graphData}

                    onNodeClick={handleNodeClick}

                />

            </div>

            {/* Detail column */}
            <div className="kg-detail-col">

                <GraphDetails

                    selectedNode={selectedNode}

                />

                <div className="kg-snapshot">

                    <div className="kg-snapshot-row">

                        <span className="kg-snapshot-label">

                            Network snapshot

                        </span>

                        <span className="kg-snapshot-value">

                            {graphData.nodes.length} nodes · {graphData.links.length} links

                        </span>

                    </div>

                </div>

            </div>

        </div>

    );

}