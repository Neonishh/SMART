import express from "express";
import {
	downloadReport,
	generateReport,
	getPublicationAnalytics,
	getTrendAnalytics,
	getTrendResearchers,
	getTrendTopics,
	listTrendDomains,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/publications", getPublicationAnalytics);

router.get("/trends", getTrendAnalytics);
router.get("/trends/domains", listTrendDomains);
router.get("/trends/topics", getTrendTopics);
router.get("/trends/researchers", getTrendResearchers);

router.post("/reports", generateReport);
router.get("/reports/download", downloadReport);

export default router;
