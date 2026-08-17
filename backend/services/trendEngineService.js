// ==========================================================
// SMART Trend Engine Service
// ==========================================================
// This service exposes the Trend Engine analytics generated
// by the Python Trend Engine.
//
// The actual CSV reading and processing is implemented in:
// backend/routes/trend_engine.js
// ==========================================================

import {
    getDomainYearlyCounts,
    getDomainYoYGrowth,
    getDomainCAGR,
    getEmergingDomains,
    getInstitutionCAGR,
    getGrantImpact,
    getTopResearchers
} from "../routes/trend_engine.js";


// ==========================================================
// COMPLETE TREND ENGINE ANALYTICS
// ==========================================================

export async function getTrendEngineAnalytics() {

    const [
        domainYearly,
        domainYoY,
        domainCAGR,
        emergingDomains,
        institutionCAGR,
        grantImpact,
        topResearchers
    ] = await Promise.all([

        getDomainYearlyCounts(),

        getDomainYoYGrowth(),

        getDomainCAGR(),

        getEmergingDomains(),

        getInstitutionCAGR(),

        getGrantImpact(),

        getTopResearchers()

    ]);

    return {

        success: true,

        domainYearly,

        domainYoY,

        domainCAGR,

        emergingDomains,

        institutionCAGR,

        grantImpact,

        topResearchers

    };

}