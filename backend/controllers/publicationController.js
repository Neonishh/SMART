import * as publicationService from "../services/publicationService.js";

export async function listPublications(req, res) {
    try {
        const filters = {
            page: req.query.page || 1,
            limit: req.query.limit || 20,
            year: req.query.year || null,
            institution: req.query.institution || null,
            author: req.query.author || null,
            keyword: req.query.keyword || req.query.search || null,
            title: req.query.title || null
        };

        const result = await publicationService.getAllPublications(filters);

        res.status(200).json({
            success: true,
            count: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            facets: result.facets,
            data: result.data
        });

    } catch (error) {
        console.error("Publication Controller Error:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve publications.", error: error.message });
    }
}

export async function getPublicationById(req, res) {
    try {
        const { id } = req.params;
        const pub = await publicationService.getPublicationById(id);
        if (!pub) return res.status(404).json({ success: false, message: "Publication not found." });
        res.status(200).json({ success: true, data: pub });
    } catch (error) {
        console.error("Publication Controller Error:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve publication.", error: error.message });
    }
}
