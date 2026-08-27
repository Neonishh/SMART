import {
    listTheses,
    getThesisById,
    createThesis,
    softDeleteThesis,
} from "../services/thesisService.js";

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

export async function addThesis(req, res) {
    try {
        const thesis = await createThesis(req.body);

        res.status(201).json({
            success: true,
            message: "Thesis added successfully.",
            data: thesis,
        });
    } catch (error) {
        console.error("Error creating thesis:", error);

        const status = error.statusCode || 500;

        res.status(status).json({
            success: false,
            error: error.message || "Failed to add thesis",
        });
    }
}

export async function deleteThesis(req, res) {
    try {
        const { id } = req.params;
        const deletedBy = req.user?.name || "SMART Admin";

        const result = await softDeleteThesis(id, "", deletedBy, true);

        res.json({
            success: true,
            message: "Thesis deleted successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Error deleting thesis:", error);

        const status = error.statusCode || 500;

        res.status(status).json({
            success: false,
            error: error.message || "Failed to delete thesis",
        });
    }
}
