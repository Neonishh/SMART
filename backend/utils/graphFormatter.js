// ==========================================================
// SMART Knowledge Graph Formatter
// ==========================================================

import {
    LABEL_PROPERTIES,
    NODE_SIZES,
    DEFAULT_NODE_LABEL,
    DEFAULT_NODE_SIZE
} from "../constants/graphConstants.js";

// ==========================================================
// Configuration
// ==========================================================

const MAX_LABEL_LENGTH = 60;

// ==========================================================
// Get display name for a Neo4j node
// ==========================================================

function getDisplayName(node) {

    const nodeType = node.labels[0];

    const propertyName = LABEL_PROPERTIES[nodeType];

    let displayName = DEFAULT_NODE_LABEL;

    if (
        propertyName &&
        node.properties[propertyName] !== undefined &&
        node.properties[propertyName] !== null
    ) {
        displayName = String(node.properties[propertyName]);
    }

    if (displayName.length > MAX_LABEL_LENGTH) {
        displayName =
            displayName.substring(0, MAX_LABEL_LENGTH) + "...";
    }

    return displayName;
}

// ==========================================================
// Extract lightweight properties
// Only the properties useful for tooltips/search
// ==========================================================

function getNodeProperties(node) {

    const props = node.properties;

    return {

        id:
            props.Institution_ID ??
            props.Publication_ID ??
            props.Patent_ID ??
            props.Grant_ID ??
            props.Thesis_ID ??
            props.Person_ID ??
            props.Department_ID ??
            props.Domain_ID ??
            props.Subdomain_ID ??
            props.Field_ID ??
            props.Keyword_ID ??
            props.IPC_ID ??
            props.Agency_ID ??
            props.Applicant_ID ??
            props.Location_ID ??
            null,

        year: props.Year ?? null,

        title:
            props.Title ??
            props.Patent_Title ??
            props.Institution ??
            props.Name ??
            props.Applicant_Name ??
            props.Funding_Agency ??
            props.Department ??
            props.Domain ??
            props.Subdomain ??
            props.Field ??
            props.Keyword ??
            props.IPC_Code ??
            props.Location ??
            null
    };

}

// ==========================================================
// Build Graph Node
// ==========================================================

function buildNode(node) {

    const nodeType = node.labels[0];

    return {

        id: node.identity.toString(),

        type: nodeType,

        label: getDisplayName(node),

        size: NODE_SIZES[nodeType] || DEFAULT_NODE_SIZE,

        properties: getNodeProperties(node)

    };

}

// ==========================================================
// Build Relationship
// ==========================================================

function buildRelationship(relationship) {

    return {

        id: relationship.identity.toString(),

        source: relationship.start.toString(),

        target: relationship.end.toString(),

        relation: relationship.type

    };

}

// ==========================================================
// Format Entire Graph
// ==========================================================

export function formatGraph(records) {

    const nodeMap = new Map();

    const linkMap = new Map();

    for (const record of records) {

        const sourceNode = record.get("n");
        const targetNode = record.get("m");
        const relationship = record.get("r");

        const source = buildNode(sourceNode);
        const target = buildNode(targetNode);
        const link = buildRelationship(relationship);

        if (!nodeMap.has(source.id)) {
            nodeMap.set(source.id, source);
        }

        if (!nodeMap.has(target.id)) {
            nodeMap.set(target.id, target);
        }

        const linkKey =
            `${link.source}-${link.target}-${link.relation}`;

        if (!linkMap.has(linkKey)) {
            linkMap.set(linkKey, link);
        }

    }

    return {

        nodes: Array.from(nodeMap.values()),

        links: Array.from(linkMap.values()),

        metadata: {

            nodeCount: nodeMap.size,

            relationshipCount: linkMap.size,

            generatedAt: new Date().toISOString(),

            graphVersion: "1.0"

        }

    };

}