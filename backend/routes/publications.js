import express from "express";
import {
    getPublications,
    searchPublicationsHandler,
    getPublication,
    getAuthors,
    getRelated,
    getRelatedPatents,
} from "../controllers/publicationController.js";

const router = express.Router();

// Static paths MUST come before "/:id" — otherwise Express treats
// "search" as an :id value and the search route never gets hit.
router.get("/search", searchPublicationsHandler);
router.get("/:id/authors", getAuthors);
router.get("/:id/related", getRelated);
router.get("/:id/related-patents", getRelatedPatents);
router.get("/:id", getPublication);
router.get("/", getPublications);

export default router;