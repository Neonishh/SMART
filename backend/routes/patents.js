import express from "express";

import {
    getAllPatents,
    getPatentById,
    getPatentTrends
} from "../controllers/patentController.js";

const router = express.Router();
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listManual, create, remove } from "../controllers/contributionController.js";
/*
=========================================================
PATENT ANALYTICS
=========================================================
IMPORTANT:
Place this BEFORE "/:id"
otherwise "trends" will be interpreted as an id.
=========================================================
*/
router.get("/manual", listManual("Grant"));
router.post("/", requireAuth, create("Grant"));
router.delete("/:id", requireAuth, requireAdmin, remove("Grant"));
router.get("/trends", getPatentTrends);

/*
=========================================================
LIST ALL PATENTS
=========================================================
Supports filters

Examples:

GET /patents

GET /patents?year=2024

GET /patents?institution=RV College of Engineering

GET /patents?ipc=G06F

GET /patents?applicant=Indian Institute of Science Bangalore

=========================================================
*/

router.get("/", getAllPatents);

/*
=========================================================
PATENT PROFILE
=========================================================
*/

router.get("/:id", getPatentById);

export default router;