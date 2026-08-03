// ==========================================================
// Researcher Routes
// ==========================================================

import express from "express";

import {
    fetchResearchers,
    fetchTopResearchers,
    fetchResearcherProfile
} from "../controllers/researcherController.js";
console.log("Researcher routes loaded");

const router = express.Router();
console.log("Top route registered");
router.get("/top", fetchTopResearchers);

router.get("/", fetchResearchers);

router.get("/:id", fetchResearcherProfile);

export default router;