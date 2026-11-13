// ==========================================================
// Read-only access to precomputed trend-engine CSVs that no
// existing service exposes (funding agencies, PIs, institution CAGR).
// Files are produced by nlp/trend_engine/*.py — cached after first read.
// ==========================================================

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../../nlp/trend_engine/outputs");

const cache = new Map();

function parseLine(line) {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
            else quoted = !quoted;
        } else if (ch === "," && !quoted) {
            out.push(cur); cur = "";
        } else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
}

async function readCSV(file) {
    if (cache.has(file)) return cache.get(file);
    try {
        const text = (await fs.readFile(path.join(OUTPUT_DIR, file), "utf8")).replace(/^﻿/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map((l) => {
            const vals = parseLine(l);
            return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        });
        cache.set(file, rows);
        return rows;
    } catch (err) {
        console.warn(`[chat] could not read ${file}: ${err.message}`);
        cache.set(file, []);
        return [];
    }
}

const num = (v) => (v === "" || v === undefined || v === null ? null : Number(v));

export async function topFundingAgencies(limit = 10) {
    const rows = await readCSV("top_funding_agencies.csv");
    return rows
        .map((r) => ({
            agency: r.funding_agency,
            projects: num(r.total_projects),
            fundingLakhs: num(r.total_funding_lakhs),
            institutions: num(r.institutions_supported),
        }))
        .filter((a) => a.agency && !/^(unknown|nan|n\/a|none)$/i.test(a.agency))
        .sort((a, b) => (b.projects || 0) - (a.projects || 0))
        .slice(0, limit);
}

export async function topPrincipalInvestigators({ institution, limit = 10 } = {}) {
    const rows = await readCSV("top_principal_investigators.csv");
    return rows
        .filter((r) => !institution || r.institution === institution)
        .map((r) => ({
            name: r.pi_name,
            institution: r.institution,
            projects: num(r.total_projects),
            fundingLakhs: num(r.total_funding_lakhs),
        }))
        .sort((a, b) => (b.projects || 0) - (a.projects || 0) || (b.fundingLakhs || 0) - (a.fundingLakhs || 0))
        .slice(0, limit);
}

export async function institutionGrowth(institution) {
    const rows = await readCSV("institution_cagr.csv");
    const row = rows.find((r) => r.institution === institution);
    if (!row) return null;
    const yearly = Object.keys(row)
        .filter((k) => /^\d{4}$/.test(k))
        .map((y) => ({ year: Number(y), total: num(row[y]) }));
    return { cagrPercent: num(row.cagr_percent), trend: row.trend, yearly };
}
