// ==========================================================
// Researcher Controller
// ==========================================================

import {
    getResearchers,
    getTopResearchers,
    getResearcherProfile
} from "../services/researcherService/index.js";

// ==========================================================
// Top Researchers
// ==========================================================

export async function fetchTopResearchers(req, res) {

    try {

        const researchers = await getTopResearchers();

        res.status(200).json(researchers);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch top researchers"
        });

    }

}

// ==========================================================
// All Researchers
// ==========================================================

export async function fetchResearchers(req, res) {

    try {

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        const search = req.query.search || "";

        const institution = req.query.institution || "";

        const domain = req.query.domain || "";

        // Default sort should now be RANK
        const sort = req.query.sort || "rank";

        const researchers = await getResearchers(
            page,
            limit,
            search,
            institution,
            domain,
            sort
        );

        res.status(200).json(researchers);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch researchers"
        });

    }

}

// ==========================================================
// Single Researcher Profile
// ==========================================================

export async function fetchResearcherProfile(req, res) {

    try {

        const { id } = req.params;

        const researcher = await getResearcherProfile(id);

        if (!researcher) {

            return res.status(404).json({
                message: "Researcher not found"
            });

        }

        res.status(200).json(researcher);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch researcher profile"
        });

    }

}