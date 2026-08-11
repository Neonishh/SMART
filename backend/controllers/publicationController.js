import {
    listPublications,
    getPublicationById,
    searchPublications,
    getAuthorsForPublication,
    getRelatedPublications,
    getRelatedPatentsByAuthor,
} from "../services/publicationService.js";

export async function getPublications(req, res) {
    try {
        const publications = await listPublications();
        res.json(publications);
    } catch (error) {
        console.error("Error fetching publications:", error);
        res.status(500).json({ error: "Failed to fetch publications" });
    }
}

export async function searchPublicationsHandler(req, res) {
    try {
        const { search, institution, domain, author, year, venue } = req.query;
        const results = await searchPublications({ search, institution, domain, author, year, venue });
        res.json(results);
    } catch (error) {
        console.error("Error searching publications:", error);
        res.status(500).json({ error: "Failed to search publications" });
    }
}

export async function getPublication(req, res) {
    try {
        const publication = await getPublicationById(req.params.id);
        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }
        res.json(publication);
    } catch (error) {
        console.error("Error fetching publication:", error);
        res.status(500).json({ error: "Failed to fetch publication" });
    }
}

export async function getAuthors(req, res) {
    try {
        const authors = await getAuthorsForPublication(req.params.id);
        res.json(authors);
    } catch (error) {
        console.error("Error fetching authors:", error);
        res.status(500).json({ error: "Failed to fetch authors" });
    }
}

export async function getRelated(req, res) {
    try {
        const related = await getRelatedPublications(req.params.id);
        res.json(related);
    } catch (error) {
        console.error("Error fetching related publications:", error);
        res.status(500).json({ error: "Failed to fetch related publications" });
    }
}

export async function getRelatedPatents(req, res) {
    try {
        const patents = await getRelatedPatentsByAuthor(req.params.id);
        res.json(patents);
    } catch (error) {
        console.error("Error fetching related patents:", error);
        res.status(500).json({ error: "Failed to fetch related patents" });
    }
}