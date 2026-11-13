import express from "express";

import { postSemanticSearch } from "../controllers/chatbotController.js";

const router = express.Router();

/**
 * POST /semantic-search
 * Body: { query: string, collection?: "publications"|"patents"|"grants"|"theses"|"all", top_k?, institution?, year_from?, year_to? }
 * Proxies the Python FAISS retriever (python_retriever/app.py).
 */
router.post("/", postSemanticSearch);

export default router;
