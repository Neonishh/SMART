import { listTheses, getThesisById } from "../services/thesisService.js";

export async function getTheses(req, res) {
    try {
        const theses = await listTheses();
        res.json(theses);
    } catch (error) {
        console.error("Error fetching theses:", error);
        res.status(500).json({ error: "Failed to fetch theses" });
    }
}

export async function getThesis(req, res) {
    try {
        const thesis = await getThesisById(req.params.id);

        if (!thesis) {
            return res.status(404).json({ error: "Thesis not found" });
        }

        res.json(thesis);
    } catch (error) {
        console.error("Error fetching thesis:", error);
        res.status(500).json({ error: "Failed to fetch thesis" });
    }
}