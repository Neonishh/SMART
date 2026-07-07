import * as dashboardService from "../services/dashboardService.js";

export async function getDashboardOverview(req, res) {

    try {

        const data = await dashboardService.getDashboardOverview();

        res.status(200).json(data);

    } catch (error) {

        console.error("Dashboard Controller Error");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard.",
            error: error.message
        });

    }

}