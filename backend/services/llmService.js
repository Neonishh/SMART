// ==========================================================
// LLM Service — provider-agnostic text generation
//
// Providers (set LLM_PROVIDER in backend/.env):
//   gemini  -> Google Gemini API            (GEMINI_API_KEY)
//   openai  -> any OpenAI-compatible API:   (OPENAI_API_KEY, OPENAI_BASE_URL)
//              OpenAI, Groq, OpenRouter, Together, local Ollama, LM Studio…
//   none    -> disabled; chatbot falls back to template answers
//
// Uses global fetch (Node 18+). No SDK dependencies.
// ==========================================================

import dotenv from "dotenv";

dotenv.config();

const PROVIDER = (process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "none")).toLowerCase();
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 45000);
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE ?? 0.2);
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 1200);

const GEMINI_MODEL = process.env.LLM_MODEL || process.env.GEMINI_MODEL || "gemini-flash-latest";
const OPENAI_MODEL = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

export function llmInfo() {
    const enabled =
        (PROVIDER === "gemini" && !!process.env.GEMINI_API_KEY) ||
        (PROVIDER === "openai" && (!!process.env.OPENAI_API_KEY || /localhost|127\.0\.0\.1/.test(OPENAI_BASE_URL)));
    return {
        enabled,
        provider: enabled ? PROVIDER : "none",
        model: PROVIDER === "gemini" ? GEMINI_MODEL : PROVIDER === "openai" ? OPENAI_MODEL : null,
    };
}

export function isLLMEnabled() {
    return llmInfo().enabled;
}

// ----------------------------------------------------------
// Request builders
// messages: [{ role: "user" | "assistant", content: string }]
// ----------------------------------------------------------

function geminiRequest({ system, messages }, stream) {
    const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    const sep = action.includes("?") ? "&" : "?";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:${action}${sep}key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

    // Gemini requires strictly alternating roles starting with "user"
    const contents = [];
    for (const m of messages) {
        const role = m.role === "assistant" ? "model" : "user";
        const last = contents[contents.length - 1];
        if (last && last.role === role) last.parts[0].text += `\n\n${m.content}`;
        else contents.push({ role, parts: [{ text: m.content }] });
    }
    if (contents[0]?.role === "model") contents.shift();

    return {
        url,
        init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents,
                generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_TOKENS },
            }),
        },
    };
}

function openaiRequest({ system, messages }, stream) {
    return {
        url: `${OPENAI_BASE_URL}/chat/completions`,
        init: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {}),
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                stream,
                messages: [{ role: "system", content: system }, ...messages],
            }),
        },
    };
}

function extractText(provider, json) {
    if (provider === "gemini") {
        return (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    }
    return json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.delta?.content ?? "";
}

async function fetchWithTimeout(url, init, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`LLM request timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    if (signal) signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`LLM ${PROVIDER} HTTP ${res.status}: ${body.slice(0, 300)}`);
        }
        return { res, clear: () => clearTimeout(timer) };
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/**
 * Some models (e.g. gpt-oss) cite with full-width brackets "【3】" or "【1, 4】".
 * The frontend renders citation chips for "[3]" / "[1, 4]", so normalise.
 */
export function normalizeCitations(text = "") {
    return String(text).replace(/【\s*(\d+(?:\s*[,，]\s*\d+)*)\s*】/g, (_, nums) => `[${nums.replace(/\s*[,，]\s*/g, ", ")}]`);
}

/** Non-streaming generation. Returns the full answer text. */
export async function generate({ system, messages }) {
    if (!isLLMEnabled()) throw new Error("LLM is not configured");
    const { url, init } = PROVIDER === "gemini" ? geminiRequest({ system, messages }, false) : openaiRequest({ system, messages }, false);
    const { res, clear } = await fetchWithTimeout(url, init);
    try {
        const json = await res.json();
        const text = extractText(PROVIDER, json);
        if (!text) throw new Error(`LLM returned an empty response: ${JSON.stringify(json).slice(0, 300)}`);
        return normalizeCitations(text);
    } finally {
        clear();
    }
}

/**
 * Streaming generation. Calls onToken(chunk) for every text delta and
 * resolves with the full text. Both providers stream Server-Sent Events.
 */
export async function generateStream({ system, messages, onToken, signal }) {
    if (!isLLMEnabled()) throw new Error("LLM is not configured");
    const { url, init } = PROVIDER === "gemini" ? geminiRequest({ system, messages }, true) : openaiRequest({ system, messages }, true);
    const { res, clear } = await fetchWithTimeout(url, init, signal);

    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    try {
        for await (const chunk of res.body) {
            buffer += decoder.decode(chunk, { stream: true });
            let nl;
            while ((nl = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                    const text = extractText(PROVIDER, JSON.parse(data));
                    if (text) {
                        full += text;
                        onToken?.(text);
                    }
                } catch {
                    // partial / keep-alive line — ignore
                }
            }
        }
    } finally {
        clear();
    }

    if (!full) throw new Error("LLM stream ended without any text");
    // Tokens were already sent raw (a "【1】" can span chunks); the frontend
    // normalises while rendering. The final reply is returned clean.
    return normalizeCitations(full);
}
