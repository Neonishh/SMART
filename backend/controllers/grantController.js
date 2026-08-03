import * as grantService from "../services/grantService.js";

/*
=========================================================
GET ALL GRANTS
GET /grants
=========================================================
*/

export async function getAllGrants(req, res) {

    try {

        const filters = {

            page: req.query.page || 1,

            limit: req.query.limit || 20,

            year: req.query.year || null,

            institution: req.query.institution || null,

            agency: req.query.agency || null,

            pi: req.query.pi || null,

            search: req.query.search || req.query.q || null

        };

        const result = await grantService.getAllGrants(filters);

        res.status(200).json({

            success: true,

            count: result.total,

            page: result.page,

            limit: result.limit,

            totalPages: result.totalPages,

            facets: result.facets,

            data: result.data

        });

    }

    catch (error) {

        console.error("Grant Controller Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to retrieve grants.",

            error: error.message

        });

    }

}

/*
=========================================================
GET GRANT DETAILS
GET /grants/:id
=========================================================
*/

export async function getGrantById(req, res) {

    try {

        const { id } = req.params;

        const grant = await grantService.getGrantById(id);

        if (!grant) {

            return res.status(404).json({

                success: false,

                message: "Grant not found."

            });

        }

        res.status(200).json({

            success: true,

            data: grant

        });

    }

    catch (error) {

        console.error("Grant Controller Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to retrieve grant details.",

            error: error.message

        });

    }

}

/*
=========================================================
GRANT ANALYTICS
GET /grants/analytics
=========================================================
*/

export async function getGrantAnalytics(req, res) {

    try {

        const analytics = await grantService.getGrantAnalytics();

        res.status(200).json({

            success: true,

            data: analytics

        });

    }

    catch (error) {

        console.error("Grant Analytics Error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to load grant analytics.",

            error: error.message

        });

    }

}