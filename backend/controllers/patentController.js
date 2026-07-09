import * as patentService from "../services/patentService.js";

/*
=========================================================
GET ALL PATENTS
GET /patents
=========================================================
*/

export async function getAllPatents(req, res) {

    try {

        const filters = {

            page: req.query.page || 1,

            limit: req.query.limit || 20,

            year: req.query.year || null,

            institution: req.query.institution || null,

            applicant: req.query.applicant || null,

            ipc: req.query.ipc || null,

            search: req.query.search || req.query.q || null

        };

        const result = await patentService.getAllPatents(filters);

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

        console.error("Patent Controller Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to retrieve patents.",

            error: error.message

        });

    }

}

/*
=========================================================
GET PATENT DETAILS
GET /patents/:id
=========================================================
*/

export async function getPatentById(req, res) {

    try {

        const { id } = req.params;

        const patent = await patentService.getPatentById(id);

        if (!patent) {

            return res.status(404).json({

                success: false,

                message: "Patent not found."

            });

        }

        res.status(200).json({

            success: true,

            data: patent

        });

    } catch (error) {

        console.error("Patent Controller Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to retrieve patent details.",

            error: error.message

        });

    }

}

/*
=========================================================
PATENT ANALYTICS
GET /patents/trends
=========================================================
*/

export async function getPatentTrends(req, res) {

    try {

        const analytics = await patentService.getPatentTrends();

        res.status(200).json({

            success: true,

            data: analytics

        });

    } catch (error) {

        console.error("Patent Analytics Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to load patent analytics.",

            error: error.message

        });

    }

}