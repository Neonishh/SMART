import express from "express";

import {
    createManualEntry,
    listManualEntries,
    getManualEntrySchemas,
    requireContributorAccess
} from "../controllers/manualEntryController.js";

const router = express.Router();

/*
=========================================================
MANUAL ENTRIES
=========================================================
These records are NOT part of the NLP pipeline or the
Neo4j knowledge graph. They're captured separately and
shown alongside the live data with a clear "pending
processing" label until someone runs them through the
full pipeline manually.
=========================================================
*/

router.get("/schemas", getManualEntrySchemas);

router.get("/", listManualEntries);

router.post("/", requireContributorAccess, createManualEntry);

export default router;
