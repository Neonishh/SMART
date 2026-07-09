// ==========================================================
// SMART Graph Service
// ==========================================================

import axios from "axios";

// ==========================================================
// Backend API
// ==========================================================

const API = axios.create({

    baseURL: "http://localhost:5000"

});

// ==========================================================
// Fetch Knowledge Graph
// ==========================================================

export async function fetchKnowledgeGraph() {

    try {

        const response = await API.get("/knowledge-graph");

        return response.data;

    }

    catch (error) {

        console.error("Knowledge Graph Error:", error);

        throw error;

    }

}