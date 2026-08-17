import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";


// =========================================================
// EXPRESS ROUTER
// =========================================================

const router = express.Router();


// =========================================================
// PATH CONFIGURATION
// =========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ---------------------------------------------------------
// Trend Engine output directory
//
// backend/routes
//      ↓ ../
// backend
//      ↓ ../
// SMART
//      ↓
// trend_engine/outputs
// ---------------------------------------------------------

const OUTPUT_DIR = path.resolve(
    __dirname,
    "../../trend_engine/outputs"
);


// =========================================================
// CSV PARSER
// =========================================================

function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (let i = 0; i < line.length; i++) {

        const char = line[i];


        if (char === '"') {

            if (
                insideQuotes &&
                line[i + 1] === '"'
            ) {

                current += '"';

                i++;

            } else {

                insideQuotes = !insideQuotes;

            }


        } else if (
            char === "," &&
            !insideQuotes
        ) {

            result.push(current.trim());

            current = "";


        } else {

            current += char;

        }

    }


    result.push(current.trim());

    return result;

}


// =========================================================
// READ CSV
// =========================================================

async function readCSV(filename) {

    const filePath = path.join(
        OUTPUT_DIR,
        filename
    );


    const content = await fs.readFile(
        filePath,
        "utf-8"
    );


    const lines = content
        .split(/\r?\n/)
        .filter(
            line => line.trim() !== ""
        );


    if (lines.length === 0) {

        return [];

    }


    const headers = parseCSVLine(
        lines[0]
    );


    return lines.slice(1).map(line => {

        const values = parseCSVLine(line);

        const row = {};


        headers.forEach(
            (header, index) => {

                row[header] =
                    values[index] !== undefined
                        ? values[index]
                        : "";

            }
        );


        return row;

    });

}


// =========================================================
// NUMBER HELPER
// =========================================================

function number(value) {

    const n = Number(value);


    return Number.isFinite(n)
        ? n
        : 0;

}


// =========================================================
// DOMAIN YEARLY COUNTS
// =========================================================

export async function getDomainYearlyCounts() {

    const rows = await readCSV(
        "domain_yearly_counts.csv"
    );


    return rows.map(row => ({

        domain:
            row.domain_name,

        year:
            number(row.year),

        publications:
            number(row.publications),

        patents:
            number(row.patents),

        grants:
            number(row.grants),

        theses:
            number(row.theses),

        total:
            number(row.total)

    }));

}


// =========================================================
// DOMAIN YOY GROWTH
// =========================================================

export async function getDomainYoYGrowth() {

    const rows = await readCSV(
        "domain_yoy_growth.csv"
    );


    return rows.map(row => ({

        domain:
            row.domain_name,

        year:
            number(row.year),

        publications:
            number(row.publications),

        patents:
            number(row.patents),

        grants:
            number(row.grants),

        theses:
            number(row.theses),

        total:
            number(row.total),

        yoy:
            number(row.total_yoy),

        yoyGrowth:
            number(row.yoy_growth_percent),

        trend:
            row.trend

    }));

}


// =========================================================
// DOMAIN CAGR
// =========================================================

export async function getDomainCAGR() {

    const rows = await readCSV(
        "domain_cagr.csv"
    );


    return rows.map(row => ({

        domain:
            row.domain_name,

        cagr:
            number(row.cagr_percent),

        trend:
            row.trend,

        years: {

            2019:
                number(row["2019"]),

            2020:
                number(row["2020"]),

            2021:
                number(row["2021"]),

            2022:
                number(row["2022"]),

            2023:
                number(row["2023"]),

            2024:
                number(row["2024"]),

            2025:
                number(row["2025"])

        }

    }));

}


// =========================================================
// EMERGING DOMAINS
// =========================================================

export async function getEmergingDomains() {

    const rows = await readCSV(
        "emerging_domains.csv"
    );


    return rows.map(row => ({

        domain:
            row.domain_name,

        publications:
            number(row.publications),

        patents:
            number(row.patents),

        grants:
            number(row.grants),

        theses:
            number(row.theses),

        total:
            number(row.total),

        institutions:
            number(row.institutions),

        researchScore:
            number(row.research_score)

    }));

}


// =========================================================
// INSTITUTION CAGR
// =========================================================

export async function getInstitutionCAGR() {

    const rows = await readCSV(
        "institution_cagr.csv"
    );


    return rows.map(row => ({

        institution:
            row.institution,

        cagr:
            number(row.cagr_percent),

        trend:
            row.trend,

        years: {

            2019:
                number(row["2019"]),

            2020:
                number(row["2020"]),

            2021:
                number(row["2021"]),

            2022:
                number(row["2022"]),

            2023:
                number(row["2023"]),

            2024:
                number(row["2024"]),

            2025:
                number(row["2025"])

        }

    }));

}


// =========================================================
// GRANT IMPACT
// =========================================================

export async function getGrantImpact() {

    const rows = await readCSV(
        "grant_impact_score.csv"
    );


    return rows.map(row => ({

        rank:
            number(row.rank),

        institution:
            row.institution,

        totalProjects:
            number(row.total_projects),

        totalFundingLakhs:
            number(
                row.total_funding_lakhs
            ),

        averageGrantLakhs:
            number(
                row.average_grant_lakhs
            ),

        grantCAGR:
            number(row.grant_cagr),

        impactScore:
            number(row.impact_score)

    }));

}


// =========================================================
// TOP RESEARCHERS
// =========================================================

export async function getTopResearchers() {

    const rows = await readCSV(
        "top_researchers.csv"
    );


    return rows;

}


// =========================================================
// COMPLETE TREND ENGINE ANALYTICS
// =========================================================

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


// =========================================================
// GET /trend-engine
// =========================================================

router.get("/", async (req, res) => {

    try {

        const data =
            await getTrendEngineAnalytics();


        res.status(200).json(data);


    } catch (error) {

        console.error(
            "Trend Engine Error:"
        );

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Failed to load Trend Engine analytics.",

            error:
                error.message

        });

    }

});


// =========================================================
// EXPORT ROUTER
// =========================================================

export default router;