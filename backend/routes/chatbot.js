import express from "express";

import { postChat, postChatStream, getChatHealth } from "../controllers/chatbotController.js";

const router = express.Router();

/**
 * POST /chat
 * Body: { message: string, history?: Array<{ role, content, context? }> }
 * Returns: { reply, sources, cypher, suggestions, context, meta }
 */
router.post("/", postChat);

/**
 * POST /chat/stream — same body, Server-Sent Events (meta, token, done, error)
 */
router.post("/stream", postChatStream);

/** GET /chat/health — Neo4j / retriever / LLM status */
router.get("/health", getChatHealth);

export default router;
