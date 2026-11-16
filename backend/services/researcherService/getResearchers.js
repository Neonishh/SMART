// ==========================================================
// Get Researchers (CSV Version)
// ==========================================================

import { getResearchersData } from "./csvLoader.js";

export const sameInstitutionKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getResearchers(
    page = 1,
    limit = 20,
    search = "",
    institution = "",
    domain = "",
    sort = "rank"
) {

    console.log("======================================");
    console.log("✅ CSV getResearchers() called");
    console.log("Researchers Loaded:", getResearchersData().length);
    console.log("Sort:", sort);
    console.log("======================================");

    let researchers = [...getResearchersData()];

    // ======================================================
    // Search
    // ======================================================

    if (search) {

        const term = search.toLowerCase();

        researchers = researchers.filter(r =>
            r.researcher.toLowerCase().includes(term)
        );

    }

    // ======================================================
    // Institution Filter
    // ======================================================

    if (institution) {

        // The CSV says "M.S. Ramaiah Institute of Technology", Neo4j says
        // "M S Ramaiah Institute of Technology" — compare ignoring punctuation/spaces.
        const key = sameInstitutionKey(institution);
        researchers = researchers.filter(
            r => sameInstitutionKey(r.institution) === key
        );

    }

    // ======================================================
    // Sort
    // ======================================================

    if (sort === "rank") {

        researchers.sort((a, b) => a.rank - b.rank);

    }

    else if (sort === "name") {

        researchers.sort((a, b) =>
            a.researcher.localeCompare(b.researcher)
        );

    }

    else if (sort === "publications") {

        researchers.sort((a, b) =>
            b.publications - a.publications
        );

    }

    else if (sort === "citations") {

        researchers.sort((a, b) =>
            b.citations - a.citations
        );

    }

    else if (sort === "score") {

        researchers.sort((a, b) =>
            b.research_score - a.research_score
        );

    }

    console.log("\nFirst 5 After Sorting:");
    console.table(researchers.slice(0, 5));

    // ======================================================
    // Pagination
    // ======================================================

    const total = researchers.length;

    const start = (page - 1) * limit;

    const end = start + limit;

    const pageResearchers = researchers.slice(start, end);

    return {

        researchers: pageResearchers.map(r => ({

            id: r.rank,

            rank: r.rank,

            name: r.researcher,

            institution: r.institution,

            domain: "Research",

            publications: r.publications,

            grants: 0,

            patents: 0,

            theses: r.theses,

            citations: r.citations,

            researchScore: r.research_score

        })),

        total,

        page,

        limit,

        totalPages: Math.ceil(total / limit)

    };

}