import express from "express";
import { listPublications, getPublicationById } from "../controllers/publicationController.js";

const router = express.Router();

// GET /publications
router.get("/", listPublications);

// GET /publications/:id
router.get("/:id", getPublicationById);

export default router;
