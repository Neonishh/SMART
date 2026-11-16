import express from "express";
import {
    getPublications,
    searchPublicationsHandler,
    getPublication,
    getAuthors,
    getRelated,
    getRelatedPatents,
} from "../controllers/publicationController.js";


import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listManual, create, remove } from "../controllers/contributionController.js";
const router = express.Router();

// Static paths MUST come before "/:id" — otherwise Express treats
// "search" as an :id value and the search route never gets hit.
router.get("/manual", listManual("Grant"));
router.post("/", requireAuth, create("Grant"));
router.delete("/:id", requireAuth, requireAdmin, remove("Grant"));
router.get("/search", searchPublicationsHandler);
router.get("/:id/authors", getAuthors);
router.get("/:id/related", getRelated);
router.get("/:id/related-patents", getRelatedPatents);

router.get("/:id", getPublication);
router.get("/", getPublications);


export default router;