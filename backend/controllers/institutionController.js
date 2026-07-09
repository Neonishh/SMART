import * as institutionService from "../services/institutionService.js";

export async function getInstitutions(req, res) {
    try {
        const data = await institutionService.getInstitutions();
        res.status(200).json(data);
    } catch (error) {
        console.error("Institution Controller Error");
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to load institutions.",
            error: error.message
        });
    }
}