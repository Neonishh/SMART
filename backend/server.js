import express from "express";
import cors from "cors";
import trendEngineRoutes from "./routes/trend_engine.js";
import dotenv from "dotenv";

import knowledgeGraphRoutes from "./routes/knowledgeGraph.js";
import patentRoutes from "./routes/patents.js";
import grantRoutes from "./routes/grants.js";
import institutionRoutes from "./routes/institution.js";
import dashboardRoutes from "./routes/dashboard.js";
import analyticsRoutes from "./routes/analytics.js";
import thesisRoutes from "./routes/thesisRoutes.js";
import researcherRoutes from "./routes/researcher.js";

import { loadResearchersCSV } from "./services/researcherService/csvLoader.js";

import publicationsRoutes from "./routes/publications.js";
import chatbotRoutes from "./routes/chatbot.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/trend-engine", trendEngineRoutes);

app.get("/", (req, res) => {
    res.json({
        project: "SMART Knowledge Graph API",
        status: "Running"
    });
});

app.use("/dashboard", dashboardRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/patents", patentRoutes);
app.use("/grants", grantRoutes);
app.use("/knowledge-graph", knowledgeGraphRoutes);
app.use("/institution", institutionRoutes);
app.use("/theses", thesisRoutes);
app.use("/researcher", researcherRoutes);
app.use("/chat", chatbotRoutes);
app.use("/publications", publicationsRoutes);

const PORT = process.env.PORT || 5000;

// ==========================================================
// Start Server
// ==========================================================

async function startServer() {

    try {

        // Load researcher CSV into memory
        await loadResearchersCSV();

        app.listen(PORT, () => {
            console.log(`SMART Backend running on http://localhost:${PORT}`);
        });

    }

    catch (err) {

        console.error("Failed to start server:", err);

    }

}

startServer();