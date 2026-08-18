import * as analyticsService from "../services/analyticsService.js";

export async function getPublicationAnalytics(req, res) {
    try {
        const data = await analyticsService.getPublicationAnalytics();
        res.status(200).json(data);
    } catch (error) {
        console.error("Publication analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load publication analytics.",
            error: error.message,
        });
    }
}

export async function getTrendAnalytics(req, res) {
    try {
        const data = await analyticsService.getTrendAnalytics({
            technology: req.query.technology || req.query.domain || "",
            year: req.query.year ? Number(req.query.year) : null,
        });

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Trend analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load trend analytics.",
            error: error.message,
        });
    }
}

export async function listTrendDomains(req, res) {
    try {
        const domains = await analyticsService.getTechnologyDomains();
        res.status(200).json({
            success: true,
            data: domains,
        });
    } catch (error) {
        console.error("Trend domains error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load domains.",
            error: error.message,
        });
    }
}

export async function getTrendTopics(req, res) {
    try {
        const data = await analyticsService.getTrendAnalytics({
            technology: req.query.technology || req.query.domain || "",
            year: req.query.year ? Number(req.query.year) : null,
        });

        res.status(200).json({
            success: true,
            data: data.nlp,
        });
    } catch (error) {
        console.error("Trend topics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load topic analytics.",
            error: error.message,
        });
    }
}

export async function getTrendResearchers(req, res) {
    try {
        const data = await analyticsService.getTrendAnalytics({
            technology: req.query.technology || req.query.domain || "",
            year: req.query.year ? Number(req.query.year) : null,
        });

        res.status(200).json({
            success: true,
            data: {
                topResearchers: data.trendEngine.topResearchers,
                topJournals: data.trendEngine.topJournals,
                topConferences: data.trendEngine.topConferences,
                topVenues: data.trendEngine.topVenues,
            },
        });
    } catch (error) {
        console.error("Trend researchers error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load researcher analytics.",
            error: error.message,
        });
    }
}

export async function generateReport(req, res) {
    try {
        const technology = String(req.body.technology || "").trim();
        const year = Number(req.body.year);

        if (!technology || !Number.isFinite(year)) {
            return res.status(400).json({
                success: false,
                message: "technology and year are required",
            });
        }

        const data = await analyticsService.generateTechnologyReport(technology, year);

        return res.status(200).json(data);
    } catch (error) {
        console.error("Report generation error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate report.",
            error: error.message,
        });
    }
}

export async function downloadReport(req, res) {
    try {
        const technology = String(req.query.technology || "").trim();
        const year = Number(req.query.year);
        const format = String(req.query.format || "pdf").toLowerCase();

        if (!technology || !Number.isFinite(year)) {
            return res.status(400).json({
                success: false,
                message: "technology and year are required",
            });
        }

        const file = await analyticsService.getReportDownload(technology, year, format);

        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Disposition", `attachment; filename=\"${file.filename}\"`);
        return res.status(200).send(file.buffer);
    } catch (error) {
        console.error("Report download error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to download report.",
            error: error.message,
        });
    }
}