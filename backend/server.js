import knowledgeGraphRoutes from "./routes/knowledgeGraph.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import patentRoutes from "./routes/patents.js";
import institutionRoutes from "./routes/institution.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        project: "SMART Knowledge Graph API",
        status: "Running"
    });
});

app.use("/dashboard", dashboardRoutes);
app.use("/patents", patentRoutes);
app.use("/knowledge-graph", knowledgeGraphRoutes);
app.use("/institution", institutionRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SMART Backend running on http://localhost:${PORT}`);
});