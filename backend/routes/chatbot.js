import express from "express";

import { postChat } from "../controllers/chatbotController.js";

const router = express.Router();

/**
 * POST /chat
 * Body: { message: string, history?: Array }
 */
router.post("/", postChat);

export default router;
