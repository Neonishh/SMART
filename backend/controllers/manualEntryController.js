import db from "../config/manualEntriesDb.js";
import { MANUAL_ENTRY_SCHEMAS, MANUAL_ENTRY_TYPES } from "../constants/manualEntrySchemas.js";

/*
=========================================================
ACCESS CODE CHECK
=========================================================
Short-term gate until real auth (Login) is wired up.
Set CONTRIBUTOR_ACCESS_CODE in backend/.env
=========================================================
*/

export function requireContributorAccess(req, res, next) {

    const code = req.headers["x-contributor-code"];

    const expected = process.env.CONTRIBUTOR_ACCESS_CODE;

    if (!expected) {
        console.warn("CONTRIBUTOR_ACCESS_CODE is not set — manual entry submission is unprotected.");
        return next();
    }

    if (code !== expected) {
        return res.status(401).json({
            success: false,
            message: "Invalid or missing contributor access code."
        });
    }

    next();

}

/*
=========================================================
CREATE MANUAL ENTRY
POST /manual-entries
=========================================================
*/

export function createManualEntry(req, res) {

    try {

        const { type, payload, submitted_by } = req.body;

        if (!MANUAL_ENTRY_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Must be one of: ${MANUAL_ENTRY_TYPES.join(", ")}`
            });
        }

        const expectedFields = MANUAL_ENTRY_SCHEMAS[type];

        if (!payload || typeof payload !== "object") {
            return res.status(400).json({
                success: false,
                message: "Missing payload."
            });
        }

        // Reject unknown fields and require every expected field to be present
        // (even if empty) so contributed rows stay column-uniform with the CSVs.
        const payloadKeys = Object.keys(payload);

        const unknownFields = payloadKeys.filter((k) => !expectedFields.includes(k));

        const missingFields = expectedFields.filter((f) => !payloadKeys.includes(f));

        if (unknownFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unexpected fields for type "${type}": ${unknownFields.join(", ")}`
            });
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing fields for type "${type}": ${missingFields.join(", ")}`
            });
        }

        const stmt = db.prepare(`
            INSERT INTO manual_entries (type, payload, submitted_by)
            VALUES (?, ?, ?)
        `);

        const result = stmt.run(type, JSON.stringify(payload), submitted_by || null);

        res.status(201).json({
            success: true,
            id: result.lastInsertRowid
        });

    }

    catch (error) {

        console.error("Manual Entry Controller Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save manual entry.",
            error: error.message
        });

    }

}

/*
=========================================================
LIST MANUAL ENTRIES
GET /manual-entries?type=Grant
=========================================================
*/

export function listManualEntries(req, res) {

    try {

        const { type } = req.query;

        let rows;

        if (type) {

            if (!MANUAL_ENTRY_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid type. Must be one of: ${MANUAL_ENTRY_TYPES.join(", ")}`
                });
            }

            rows = db.prepare(`
                SELECT * FROM manual_entries WHERE type = ? ORDER BY submitted_at DESC
            `).all(type);

        } else {

            rows = db.prepare(`
                SELECT * FROM manual_entries ORDER BY submitted_at DESC
            `).all();

        }

        const data = rows.map((row) => ({
            id: row.id,
            type: row.type,
            submitted_by: row.submitted_by,
            submitted_at: row.submitted_at,
            ...JSON.parse(row.payload)
        }));

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    }

    catch (error) {

        console.error("Manual Entry Controller Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve manual entries.",
            error: error.message
        });

    }

}

/*
=========================================================
GET SCHEMAS (so the frontend never hardcodes field lists twice)
GET /manual-entries/schemas
=========================================================
*/

export function getManualEntrySchemas(req, res) {

    res.status(200).json({
        success: true,
        data: MANUAL_ENTRY_SCHEMAS
    });

}
