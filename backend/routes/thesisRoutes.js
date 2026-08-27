import express from "express";
import {
    getTheses,
    getThesis,
    addThesis,
    deleteThesis,
} from "../controllers/thesisController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /theses - active theses only
router.get("/", getTheses);

// POST /theses - manual thesis contribution
router.post("/", requireAuth, addThesis);

// DELETE /theses/:id - soft delete
router.delete("/:id", requireAuth, requireAdmin, deleteThesis);

// GET /theses/:id - thesis details
router.get("/:id", getThesis);

export default router;
