import express from "express";

import {
    getAllPatents,
    getPatentById,
    getPatentTrends
} from "../controllers/patentController.js";

const router = express.Router();

/*
=========================================================
PATENT ANALYTICS
=========================================================
IMPORTANT:
Place this BEFORE "/:id"
otherwise "trends" will be interpreted as an id.
=========================================================
*/

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