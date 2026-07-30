import express from "express";
import { getTheses, getThesis } from "../controllers/thesisController.js";

const router = express.Router();

// Mounted at "/theses" in server.js, so these are relative:
// GET /theses      -> getTheses
// GET /theses/:id  -> getThesis
router.get("/", getTheses);
router.get("/:id", getThesis);

export default router;