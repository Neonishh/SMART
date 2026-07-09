import express from "express";

import { fetchKnowledgeGraph } from "../controllers/knowledgeGraphController.js";

const router = express.Router();

router.get("/", fetchKnowledgeGraph);

export default router;