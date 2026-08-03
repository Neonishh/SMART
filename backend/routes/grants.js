import express from "express";

import {
    getAllGrants,
    getGrantById,
    getGrantAnalytics
} from "../controllers/grantController.js";

const router = express.Router();

/*
=========================================================
GRANT ANALYTICS
=========================================================
IMPORTANT:
Keep this BEFORE "/:id"
Otherwise "analytics" will be interpreted as an id.
=========================================================
*/

router.get("/analytics", getGrantAnalytics);

/*
=========================================================
LIST ALL GRANTS
=========================================================

Supports:

GET /grants

GET /grants?year=2024

GET /grants?institution=Indian Institute of Science Bangalore

GET /grants?agency=ANRF

GET /grants?pi=John Doe

GET /grants?search=Artificial Intelligence

=========================================================
*/

router.get("/", getAllGrants);

/*
=========================================================
GRANT PROFILE
=========================================================
*/

router.get("/:id", getGrantById);

export default router;