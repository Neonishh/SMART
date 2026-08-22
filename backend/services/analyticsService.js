import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const NLP_ROOT = path.join(PROJECT_ROOT, "nlp");
const TREND_OUTPUT_DIR = path.join(NLP_ROOT, "trend_engine", "outputs");
const TOPICS_DIR = path.join(NLP_ROOT, "topics");
const TREND_OUTPUTS_DIR = path.join(NLP_ROOT, "trend_outputs");
const REPORT_ENGINE_DIR = path.join(NLP_ROOT, "trend_engine", "report_engine");
const GENERATED_REPORTS_DIR = path.join(REPORT_ENGINE_DIR, "generated_reports");

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === "," && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).trim().toLowerCase();
    if (cleaned === "inf" || cleaned === "-inf" || cleaned === "infinity" || cleaned === "-infinity") {
        return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function readCSVFrom(baseDir, filename) {
    const filePath = path.join(baseDir, filename);
    const content = await fs.readFile(filePath, "utf8");

    const lines = content
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

    if (lines.length === 0) {
        return [];
    }

    const headers = parseCSVLine(lines[0]);

    return lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ?? "";
        });
        return row;
    });
}

function normalizeDomain(value = "") {
    return String(value).trim().toLowerCase();
}

function reportFileName(technology, year, extension) {
    const slug = String(technology).toLowerCase().replace(/\s+/g, "_");
    return `${slug}_${year}.${extension}`;
}

function aggregateByYear(domainRows) {
    const map = new Map();

    for (const row of domainRows) {
        const year = toNumber(row.year);
        const current = map.get(year) || {
            year,
            publications: 0,
            patents: 0,
            grants: 0,
            theses: 0,
            total: 0,
        };

        current.publications += toNumber(row.publications);
        current.patents += toNumber(row.patents);
        current.grants += toNumber(row.grants);
        current.theses += toNumber(row.theses);
        current.total += toNumber(row.total);

        map.set(year, current);
    }

    return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

function buildOverallGrowthSeries(yearlySeries) {
    if (yearlySeries.length === 0) return [];

    return yearlySeries.map((row, index) => {
        if (index === 0) {
            return {
                year: row.year,
                total: row.total,
                yoyGrowthPercent: 0,
            };
        }

        const prev = yearlySeries[index - 1].total;
        const yoy = prev > 0 ? ((row.total - prev) / prev) * 100 : 0;

        return {
            year: row.year,
            total: row.total,
            yoyGrowthPercent: Number(yoy.toFixed(2)),
        };
    });
}

function computeSeriesCAGR(yearlySeries) {
    if (yearlySeries.length < 2) return 0;
    const first = yearlySeries[0];
    const last = yearlySeries[yearlySeries.length - 1];
    if (first.total <= 0) return 0;

    const years = Math.max(last.year - first.year, 1);
    const cagr = (Math.pow(last.total / first.total, 1 / years) - 1) * 100;
    return Number(cagr.toFixed(2));
}

async function runPythonReportEngine(technology, year) {
    const pythonCode = [
        "import json, sys",
        `sys.path.append(r'${REPORT_ENGINE_DIR.replace(/\\/g, "\\\\")}')`,
        "from report_builder import build_report",
        "from pdf_generator import generate_pdf",
        `report = build_report(${JSON.stringify(technology)}, ${Number(year)})`,
        "pdf_path = generate_pdf(report)",
        "print('JSON_RESULT::' + json.dumps({'report': report, 'pdf_path': pdf_path}))",
    ].join("\n");

    try {
        const { stdout, stderr } = await execFileAsync(
            "python",
            ["-c", pythonCode],
            {
                cwd: PROJECT_ROOT,
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 10,
            }
        );

        if (stderr && stderr.trim()) {
            console.warn(
                "Python report engine stderr:",
                stderr
            );
        }

        const marker = "JSON_RESULT::";

        const line = stdout
            .split(/\r?\n/)
            .find((entry) => entry.startsWith(marker));

        if (!line) {
            throw new Error(
                "Python report engine did not return a parseable result."
            );
        }

        const result = JSON.parse(
            line.slice(marker.length)
        );

        if (!result.report) {
            throw new Error(
                "Python report engine returned no report."
            );
        }

        if (!result.pdf_path) {
            throw new Error(
                "Python report engine did not return a PDF path."
            );
        }

        const pdfPath = path.resolve(
            PROJECT_ROOT,
            result.pdf_path
        );

        const pdfBuffer = await fs.readFile(pdfPath);

        if (pdfBuffer.length === 0) {
            throw new Error(
                `Generated PDF is empty: ${pdfPath}`
            );
        }

        const pdfHeader = pdfBuffer.subarray(0, 5);

        if (!pdfHeader.equals(Buffer.from("%PDF-"))) {
            throw new Error(
                `Generated file is not a valid PDF. Header: ${pdfHeader.toString()}`
            );
        }

        return {
            report: result.report,
            pdfPath,
        };
    } catch (error) {
        console.error(
            "Python report engine failed:",
            error
        );

        throw error;
    }
}

async function buildFallbackReport(technology, year) {
    const domainYearly = await readCSVFrom(TREND_OUTPUT_DIR, "domain_yearly_counts.csv");
    const domainYoY = await readCSVFrom(TREND_OUTPUT_DIR, "domain_yoy_growth.csv");
    const domainCAGR = await readCSVFrom(TREND_OUTPUT_DIR, "domain_cagr.csv");
    const domainResearchers = await readCSVFrom(TREND_OUTPUT_DIR, "domain_top_researchers.csv");

    const targetDomain = normalizeDomain(technology);
    const targetYear = Number(year);

    const yearRow = domainYearly.find(
        (row) => normalizeDomain(row.domain_name) === targetDomain && toNumber(row.year) === targetYear
    );

    const growthRow = domainYoY.find(
        (row) => normalizeDomain(row.domain_name) === targetDomain && toNumber(row.year) === targetYear
    );

    const cagrRow = domainCAGR.find((row) => normalizeDomain(row.domain_name) === targetDomain);

    const topResearchers = domainResearchers
        .filter((row) => normalizeDomain(row.domain) === targetDomain)
        .sort((a, b) => toNumber(b.research_score) - toNumber(a.research_score))
        .slice(0, 10)
        .map((row) => ({
            rank: toNumber(row.rank),
            researcher: row.researcher,
            institution: row.institution,
            publications: toNumber(row.publications),
            citations: toNumber(row.citations),
            research_score: toNumber(row.research_score),
        }));

    const publications = toNumber(yearRow?.publications);
    const patents = toNumber(yearRow?.patents);
    const grants = toNumber(yearRow?.grants);
    const theses = toNumber(yearRow?.theses);
    const total = toNumber(yearRow?.total);
    const yoy = toNumber(growthRow?.yoy_growth_percent);
    const cagr = toNumber(cagrRow?.cagr_percent);

    return {
        technology,
        year: targetYear,
        publication_statistics: {
            publications,
            patents,
            grants,
            theses,
            total_output: total,
        },
        growth_statistics: {
            yoy_growth_percent: yoy,
            cagr_percent: cagr,
        },
        grant_statistics: {
            average_impact_score: 0,
        },
        top_researchers: topResearchers,
        top_institutions: [],
        top_journals: [],
        top_conferences: [],
        top_venues: [],
        executive_summary: `${technology} produced ${total} total outputs in ${targetYear} with YoY growth of ${yoy}% and CAGR of ${cagr}%.`,
        recommendations: [
            yoy >= 0
                ? "Maintain growth through continued funding and collaboration."
                : "Address declining trend through strategic investments and domain partnerships.",
        ],
        generatedBy: "fallback-js",
    };
}

export async function getPublicationAnalytics() {
    const [domainYearlyRows, institutionRows] = await Promise.all([
        readCSVFrom(TREND_OUTPUT_DIR, "domain_yearly_counts.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "institution_analytics.csv"),
    ]);

    const trend = aggregateByYear(domainYearlyRows).map((row) => ({
        year: row.year,
        publications: row.publications,
    }));

    const byInstitution = institutionRows
        .map((row) => ({
            institution: row.institution,
            publications: toNumber(row.publications),
        }))
        .sort((a, b) => b.publications - a.publications)
        .slice(0, 10);

    const domainMap = new Map();
    for (const row of domainYearlyRows) {
        const domain = row.domain_name;
        const current = domainMap.get(domain) || 0;
        domainMap.set(domain, current + toNumber(row.publications));
    }

    const topDomains = Array.from(domainMap.entries())
        .map(([domain, papers]) => ({ domain, papers }))
        .sort((a, b) => b.papers - a.papers)
        .slice(0, 10);

    return {
        trend,
        byInstitution,
        topDomains,
    };
}

export async function getTechnologyDomains() {
    const rows = await readCSVFrom(TREND_OUTPUT_DIR, "domain_yearly_counts.csv");
    const domains = [...new Set(rows.map((row) => row.domain_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
    );

    return domains;
}

export async function getTrendAnalytics(params = {}) {
    const technology = params.technology ? String(params.technology).trim() : "";
    const year = params.year ? Number(params.year) : null;

    const [
        domainYearlyRows,
        domainYoYRows,
        domainCAGRRows,
        emergingRows,
        topResearchersRows,
        topVenuesRows,
        topJournalsRows,
        topConferencesRows,
        publicationTopics,
        patentTopics,
        grantTopics,
        thesisTopics,
        institutionDomainRows,
        institutionAnalyticsRows,
        publicationMomentumRows,
        patentMomentumRows,
        grantMomentumRows,
        thesisMomentumRows,
    ] = await Promise.all([
        readCSVFrom(TREND_OUTPUT_DIR, "domain_yearly_counts.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "domain_yoy_growth.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "domain_cagr.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "emerging_domains.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "domain_top_researchers.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "domain_top_venues.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "top_journals.csv"),
        readCSVFrom(TREND_OUTPUT_DIR, "top_conferences.csv"),
        readCSVFrom(TOPICS_DIR, "publication_topic_info.csv"),
        readCSVFrom(TOPICS_DIR, "patent_topic_info.csv"),
        readCSVFrom(TOPICS_DIR, "grant_topic_info.csv"),
        readCSVFrom(TOPICS_DIR, "thesis_topic_info.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "institution_domains.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "institution_analytics.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "publication_research_momentum.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "patent_research_momentum.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "grant_research_momentum.csv"),
        readCSVFrom(TREND_OUTPUTS_DIR, "thesis_research_momentum.csv"),
    ]);

    const domainFilter = normalizeDomain(technology);

    const filteredDomainYearly = domainFilter
        ? domainYearlyRows.filter((row) => normalizeDomain(row.domain_name) === domainFilter)
        : domainYearlyRows;

    const filteredDomainYoY = domainFilter
        ? domainYoYRows.filter((row) => normalizeDomain(row.domain_name) === domainFilter)
        : domainYoYRows;

    const filteredDomainCAGR = domainFilter
        ? domainCAGRRows.filter((row) => normalizeDomain(row.domain_name) === domainFilter)
        : domainCAGRRows;

    const yearlyTotals = aggregateByYear(filteredDomainYearly);
    const yoySeries = buildOverallGrowthSeries(yearlyTotals);

    const selectedYear = Number.isFinite(year) ? year : yearlyTotals[yearlyTotals.length - 1]?.year;
    const selectedYearTotals = yearlyTotals.find((row) => row.year === selectedYear) || {
        year: selectedYear,
        publications: 0,
        patents: 0,
        grants: 0,
        theses: 0,
        total: 0,
    };

    const lastGrowth = yoySeries.find((row) => row.year === selectedYear) || yoySeries[yoySeries.length - 1] || {
        yoyGrowthPercent: 0,
    };

    const cagr = domainFilter
        ? toNumber(filteredDomainCAGR[0]?.cagr_percent)
        : computeSeriesCAGR(yearlyTotals);

    const topicTransform = (row) => ({
        topic: row.Name || row.Topic || row.topic_id,
        count: toNumber(row.Count || row.total_docs),
        representation: row.Representation || "",
        representativeDocs: row.Representative_Docs || "",
    });

    const momentumTransform = (row) => ({
        topic_id: toNumber(row.topic_id),
        total_publications: toNumber(row.total_publications),
        trend_slope: toNumber(row.trend_slope),
        overall_growth_percent: toNumber(row.overall_growth_percent),
        momentum_label: row.momentum_label,
    });

    const researcherRows = (domainFilter
        ? topResearchersRows.filter((row) => normalizeDomain(row.domain) === domainFilter)
        : topResearchersRows
    )
        .sort((a, b) => toNumber(b.research_score) - toNumber(a.research_score))
        .slice(0, 10)
        .map((row) => ({
            rank: toNumber(row.rank),
            researcher: row.researcher,
            institution: row.institution,
            publications: toNumber(row.publications),
            citations: toNumber(row.citations),
            research_score: toNumber(row.research_score),
        }));

    const topVenues = (domainFilter
        ? topVenuesRows.filter((row) => normalizeDomain(row.domain).includes(domainFilter))
        : topVenuesRows
    )
        .slice(0, 12)
        .map((row) => ({
            domain: row.domain,
            venue_type: row.venue_type,
            venue: row.venue,
            publications: toNumber(row.publications),
        }));

    const institutionDomains = (domainFilter
        ? institutionDomainRows.filter((row) => normalizeDomain(row.domain_name) === domainFilter)
        : institutionDomainRows
    )
        .sort((a, b) => toNumber(b.total) - toNumber(a.total))
        .slice(0, 12)
        .map((row) => ({
            institution: row.institution,
            domain: row.domain_name,
            publications: toNumber(row.publications),
            patents: toNumber(row.patents),
            grants: toNumber(row.grants),
            theses: toNumber(row.theses),
            total: toNumber(row.total),
        }));

    const domains = [...new Set(domainYearlyRows.map((row) => row.domain_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
    );

    return {
        filters: {
            technology: technology || null,
            year: selectedYear || null,
        },
        availableDomains: domains,
        researchOutput: {
            byYear: yearlyTotals,
            totals: selectedYearTotals,
            yoyGrowthPercent: Number(lastGrowth.yoyGrowthPercent || 0),
            cagrPercent: cagr,
        },
        trendEngine: {
            domainYearly: filteredDomainYearly,
            domainYoY: filteredDomainYoY,
            domainCAGR: filteredDomainCAGR,
            emergingDomains: emergingRows
                .map((row) => ({
                    domain: row.domain_name,
                    publications: toNumber(row.publications),
                    patents: toNumber(row.patents),
                    grants: toNumber(row.grants),
                    theses: toNumber(row.theses),
                    total: toNumber(row.total),
                    research_score: toNumber(row.research_score),
                }))
                .sort((a, b) => b.research_score - a.research_score)
                .slice(0, 12),
            topResearchers: researcherRows,
            topJournals: topJournalsRows.slice(0, 12).map((row) => ({
                rank: toNumber(row.rank),
                venue: row.venue,
                publications: toNumber(row.publications),
            })),
            topConferences: topConferencesRows.slice(0, 12).map((row) => ({
                rank: toNumber(row.rank),
                venue: row.venue,
                publications: toNumber(row.publications),
            })),
            topVenues,
        },
        nlp: {
            publicationTopics: publicationTopics.filter((row) => String(row.Topic) !== "-1").slice(0, 20).map(topicTransform),
            patentTopics: patentTopics.filter((row) => String(row.Topic) !== "-1").slice(0, 20).map(topicTransform),
            grantTopics: grantTopics.filter((row) => String(row.Topic) !== "-1").slice(0, 20).map(topicTransform),
            thesisTopics: thesisTopics.filter((row) => String(row.Topic) !== "-1").slice(0, 20).map(topicTransform),
            momentum: {
                publications: publicationMomentumRows.slice(0, 12).map(momentumTransform),
                patents: patentMomentumRows.slice(0, 12).map(momentumTransform),
                grants: grantMomentumRows.slice(0, 12).map(momentumTransform),
                theses: thesisMomentumRows.slice(0, 12).map(momentumTransform),
            },
            institutionAnalysis: institutionDomains,
            institutionTotals: institutionAnalyticsRows
                .map((row) => ({
                    institution: row.institution,
                    publications: toNumber(row.publications),
                    patents: toNumber(row.patents),
                    grants: toNumber(row.grants),
                    theses: toNumber(row.theses),
                    total_research: toNumber(row.total_research),
                }))
                .sort((a, b) => b.total_research - a.total_research)
                .slice(0, 12),
        },
    };
}

export async function generateTechnologyReport(
    technology,
    year
) {
    let report;
    let pythonGenerated = true;
    let warning = null;

    try {
        const result = await runPythonReportEngine(
            technology,
            year
        );

        report = result.report;

    } catch (error) {
        pythonGenerated = false;

        warning =
            `Python report engine failed: ${error.message}`;

        report = await buildFallbackReport(
            technology,
            year
        );

        await fs.mkdir(
            GENERATED_REPORTS_DIR,
            { recursive: true }
        );

        const jsonPath = path.join(
            GENERATED_REPORTS_DIR,
            reportFileName(
                technology,
                year,
                "json"
            )
        );

        await fs.writeFile(
            jsonPath,
            JSON.stringify(report, null, 2),
            "utf8"
        );
    }

    return {
        success: true,
        pythonGenerated,
        warning,
        report,
        files: {
            json: reportFileName(
                technology,
                year,
                "json"
            ),
            pdf: reportFileName(
                technology,
                year,
                "pdf"
            ),
        },
    };
}

export async function getReportDownload(
    technology,
    year,
    format = "pdf"
) {
    const extension =
        String(format).toLowerCase() === "json"
            ? "json"
            : "pdf";

    const filename = reportFileName(
        technology,
        year,
        extension
    );

    const filePath = path.join(
        GENERATED_REPORTS_DIR,
        filename
    );

    // -----------------------------------------------------
    // JSON DOWNLOAD
    // -----------------------------------------------------

    if (extension === "json") {
        try {
            await fs.access(filePath);
        } catch {
            await generateTechnologyReport(
                technology,
                year
            );
        }

        const content = await fs.readFile(
            filePath,
            "utf8"
        );

        return {
            contentType: "application/json; charset=utf-8",
            filename,
            buffer: Buffer.from(
                content,
                "utf8"
            ),
        };
    }

    // -----------------------------------------------------
    // PDF DOWNLOAD
    // -----------------------------------------------------

    let pdfExists = true;

    try {
        await fs.access(filePath);
    } catch {
        pdfExists = false;
    }

    if (!pdfExists) {
        await runPythonReportEngine(
            technology,
            year
        );
    }

    const pdfBuffer = await fs.readFile(
        filePath
    );

    if (pdfBuffer.length === 0) {
        throw new Error(
            `Generated PDF is empty: ${filePath}`
        );
    }

    const header = pdfBuffer.subarray(
        0,
        5
    );

    if (!header.equals(Buffer.from("%PDF-"))) {
        throw new Error(
            `Invalid PDF file: ${filePath}. ` +
            `Expected %PDF- but received ${header.toString()}`
        );
    }

    return {
        contentType: "application/pdf",
        filename,
        buffer: pdfBuffer,
    };
}