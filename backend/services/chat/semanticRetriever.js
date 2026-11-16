// ==========================================================
// Client for the Python FAISS retriever (python_retriever/app.py)
//
// Never throws: if the retriever is down the chatbot keeps working
// on Knowledge-Graph facts alone, and reports retrieval status in meta.
// ==========================================================

import dotenv from "dotenv";

dotenv.config();

const RETRIEVER_URL = (process.env.RETRIEVER_URL || "http://localhost:8001").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.RETRIEVER_TIMEOUT_MS || 8000);
const DISABLED = String(process.env.RETRIEVER_ENABLED || "true").toLowerCase() === "false";

// Avoid paying the timeout on every message when the service is down.
let downUntil = 0;

async function post(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${RETRIEVER_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`retriever HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

/**
 * semanticSearch({ text, collection, topK, institution, yearFrom, yearTo })
 * => { ok, hits: [...], error? }
 */
export async function semanticSearch({ text, collection = "all", topK = 6, institution, yearFrom, yearTo, minScore = 0.25 } = {}) {
    if (DISABLED) return { ok: false, hits: [], error: "disabled" };
    if (!text || !text.trim()) return { ok: true, hits: [] };
    if (Date.now() < downUntil) return { ok: false, hits: [], error: "retriever unavailable (cooling down)" };

    try {
        const hits = await post("/search", {
            text,
            collection,
            top_k: topK,
            institution: institution || null,
            year_from: yearFrom || null,
            year_to: yearTo || null,
            min_score: minScore,
        });
        return { ok: true, hits: Array.isArray(hits) ? hits : [] };
    } catch (err) {
        const message = err.name === "AbortError" ? `timed out after ${TIMEOUT_MS}ms` : err.message;
        // Connection refused / timeout => back off for 30s
        if (/fetch failed|ECONNREFUSED|timed out/i.test(message)) downUntil = Date.now() + 30000;
        console.warn(`[chat] semantic retriever unavailable: ${message}`);
        return { ok: false, hits: [], error: message };
    }
}

export async function retrieverHealth() {
    if (DISABLED) return { status: "disabled" };
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${RETRIEVER_URL}/health`, { signal: controller.signal });
        clearTimeout(timer);
        downUntil = 0;
        return await res.json();
    } catch (err) {
        return { status: "down", error: err.message, url: RETRIEVER_URL };
    }
}
