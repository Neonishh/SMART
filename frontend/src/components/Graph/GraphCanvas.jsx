// ==========================================================
// SMART Graph Canvas
// ==========================================================

import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide } from "d3-force";

const CANVAS_BG = "#F8F6F2";

export default function GraphCanvas({

    graphData,

    onNodeClick

}) {

    const graphRef = useRef();

    const containerRef = useRef();

    const [dimensions, setDimensions] = useState({

        width: 0,

        height: 0

    });

    // ======================================================
    // SMART Node Colors
    // ======================================================

    const nodeColors = {

        Institution: "#1F3B73",

        Publication: "#D4A017",

        Person: "#2E8B57",

        Patent: "#8A4FFF",

        Grant: "#D96C06",

        Thesis: "#5B8FB9",

        Department: "#6C757D",

        Domain: "#009688",

        Subdomain: "#43A047",

        Field: "#607D8B",

        FundingAgency: "#B23A48",

        Applicant: "#7B2CBF",

        Keyword: "#FF9800",

        IPC: "#795548",

        Location: "#3F88C5"

    };

    // ======================================================
    // Better Node Sizes
    // ======================================================

    const nodeSizes = {

        Institution: 18,

        Person: 12,

        Grant: 11,

        Patent: 11,

        Thesis: 10,

        Publication: 8,

        Department: 9,

        Domain: 9,

        Subdomain: 8,

        Field: 8,

        FundingAgency: 10,

        Applicant: 8,

        Keyword: 6,

        IPC: 6,

        Location: 8

    };

    function getNodeRadius(node) {

        return nodeSizes[node.type] || node.size || 8;

    }

    // ======================================================
    // Measure Container
    // ======================================================

    useEffect(() => {

        if (!containerRef.current) return;

        const el = containerRef.current;

        const updateSize = () => {

            setDimensions({

                width: el.clientWidth,

                height: el.clientHeight

            });

        };

        updateSize();

        const observer = new ResizeObserver(updateSize);

        observer.observe(el);

        return () => observer.disconnect();

    }, []);

    // ======================================================
    // Configure Forces — prevents nodes overlapping/clumping
    // ======================================================

    useEffect(() => {

        if (!graphRef.current) return;

        // Stronger repulsion so nodes push apart instead of stacking

        graphRef.current.d3Force("charge")

            ?.strength(-220)

            .distanceMax(600);

        // Longer link distance so connected nodes aren't crammed together

        graphRef.current.d3Force("link")

            ?.distance(90);

        // Hard collision boundary — this is what actually stops overlap,

        // independent of how the charge/link forces settle

        graphRef.current.d3Force(

            "collide",

            forceCollide((node) => getNodeRadius(node) + 4)

        );

        graphRef.current.d3ReheatSimulation();

    }, [graphData]);

    // ======================================================
    // Auto Fit Graph
    // ======================================================

    useEffect(() => {

        if (!graphRef.current) return;

        const timer = setTimeout(() => {

            graphRef.current.zoomToFit(

                1000,

                70

            );

        }, 1200);

        return () => clearTimeout(timer);

    }, [graphData, dimensions]);

    // ======================================================
    // Zoom Controls
    // ======================================================

    function zoomIn() {

        if (!graphRef.current) return;

        graphRef.current.zoom(graphRef.current.zoom() * 1.4, 300);

    }

    function zoomOut() {

        if (!graphRef.current) return;

        graphRef.current.zoom(graphRef.current.zoom() / 1.4, 300);

    }

    function fitView() {

        if (!graphRef.current) return;

        graphRef.current.zoomToFit(600, 70);

    }

    // ======================================================
    // Draw Nodes
    // ======================================================

    const drawNode = (

        node,

        ctx

    ) => {

        const radius = getNodeRadius(node);

        ctx.beginPath();

        ctx.arc(

            node.x,

            node.y,

            radius,

            0,

            2 * Math.PI

        );

        ctx.fillStyle =

            nodeColors[node.type] ||

            "#888";

        ctx.fill();

        ctx.lineWidth = 0.5;

        ctx.strokeStyle = "#FFFFFF";

        ctx.stroke();

    };

    // ======================================================
    // Render
    // ======================================================

    return (

        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: CANVAS_BG
            }}
        >

            {

                dimensions.width > 0 &&
                dimensions.height > 0 &&

                <ForceGraph2D

                    ref={graphRef}

                    graphData={graphData}

                    nodeCanvasObject={drawNode}

                    nodeRelSize={6}

                    linkWidth={0.8}

                    linkColor={() => "#D5D5D5"}

                    cooldownTicks={400}

                    d3AlphaDecay={0.015}

                    d3VelocityDecay={0.3}

                    enableNodeDrag

                    enableZoomInteraction

                    enablePanInteraction

                    onNodeClick={onNodeClick}

                    backgroundColor={CANVAS_BG}

                    width={dimensions.width}

                    height={dimensions.height}

                    onEngineStop={() => {

                        graphRef.current?.zoomToFit(

                            700,

                            70

                        );

                    }}

                />

            }

            {/* Zoom controls */}
            <div className="kg-zoom-controls">

                <button onClick={zoomIn} aria-label="Zoom in">+</button>
                <button onClick={zoomOut} aria-label="Zoom out">–</button>
                <button onClick={fitView} aria-label="Fit to view">⤢</button>

            </div>

        </div>

    );

}