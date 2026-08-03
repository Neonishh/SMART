// ==========================================================
// CSV Loader
// Loads the ranked researchers CSV ONCE when the server starts
// ==========================================================

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Change this path if your CSV is stored elsewhere
const csvPath = path.join(
    __dirname,
    "../../data/top_researchers.csv"
);

let researchers = [];
let loaded = false;

// ==========================================================
// Load CSV
// ==========================================================

export async function loadResearchersCSV() {

    if (loaded) return;

    return new Promise((resolve, reject) => {

        const rows = [];

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {

                rows.push({

                    rank: Number(row.rank),

                    researcher: row.researcher,

                    institution: row.institution,

                    publications: Number(row.publications),

                    theses: Number(row.theses),

                    citations: Number(row.citations),

                    research_score: Number(row.research_score)

                });

            })
            .on("end", () => {

                researchers = rows;

                loaded = true;

                console.log(
                    `✅ Loaded ${researchers.length} researchers from CSV`
                );

                resolve();

            })
            .on("error", reject);

    });

}

// ==========================================================
// Return Cached Data
// ==========================================================

export function getResearchersData() {

    return researchers;

}