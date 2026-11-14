// ==========================================================
// Ask SMART — chatbot orchestration (Hybrid RAG)
//
//   message + history
//        │
//        ├─ intentClassifier.classify()          (utils/intentClassifier.js)
//        ├─ memory.resolvePlan()                 follow-ups / pronouns
//        │
//        ├─ kgRetriever.retrieveFromGraph()  ┐   existing Neo4j services
//        ├─ semanticRetriever.semanticSearch()┘  python_retriever (FAISS)   — in parallel
//        │
//        ├─ contextBuilder.buildSources / buildPrompt
//        └─ llmService.generate[Stream]()    →   template answer if no LLM
//
// POST /chat contract is unchanged: { reply, sources, cypher } (+ extra fields)
// ==========================================================

import intentClassifier from "../utils/intentClassifier.js";
import { resolvePlan } from "./chat/memory.js";
import { retrieveFromGraph } from "./chat/kgRetriever.js";
import { semanticSearch } from "./chat/semanticRetriever.js";
import { buildSources, buildPrompt, semanticFacts, templateAnswer, suggestFollowUps } from "./chat/contextBuilder.js";
import * as llm from "./llmService.js";
import { findPersonByName } from "./chat/personLookup.js";

const MAX_MESSAGE_LENGTH = 2000;
const DEBUG = String(process.env.CHAT_DEBUG || "false").toLowerCase() === "true";

const COLLECTION_FOR_INTENT = {
    publications: "publications",
    patents: "patents",
    grants: "grants",
    theses: "theses",
    researchers: "publications",
};

const GREETING_REPLY =
    "Hi! I'm **Ask SMART**. I can answer questions about research from IISc, IIIT-B, PES University, RVCE, MSRIT, BMSCE, DSCE and CMRIT — publications, patents, grants, PhD theses, researchers and trends.\n\nTry asking:\n- *Most cited papers on graph neural networks from IISc*\n- *Who has the most patents at PES University?*\n- *Compare RVCE and BMSCE*\n- *What research areas are growing fastest?*";

const HELP_REPLY =
    "Here's what I can do:\n- **Find records** — publications, patents, grants and theses by topic, institution, researcher, agency or year (*\"patents on batteries from IISc since 2021\"*)\n- **Researchers** — profiles and top researchers in a domain (*\"Tell me about Satyam Suwas\"*, *\"top AI researchers\"*)\n- **Institutions** — profiles, rankings and comparisons (*\"Compare RVCE and BMSCE\"*)\n- **Funding** — agencies and principal investigators (*\"Top funding agencies\"*)\n- **Trends** — growth and emerging domains (*\"Is cybersecurity research growing?\"*)\n\nFollow-ups work too: *\"what about 2023?\"*, *\"show their patents\"*.";

// ----------------------------------------------------------
// helpers
// ----------------------------------------------------------

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
        .slice(-12)
        .map((h) => ({ role: h.role, content: h.content.slice(0, 4000), context: h.context && typeof h.context === "object" ? h.context : undefined }));
}

const NAME_INTENTS = new Set(["search", "unknown", "publications", "patents", "grants", "theses", "researchers"]);

/**
 * Words that might name a person, to check against real people:
 *  - "richa sharma?"                  (bare name)
 *  - "give shylaja ss patent titles"  (name inside a typed question)
 * Not when a person, domain or quoted title was already recognised.
 */
function nameToLookUp(plan) {
    const e = plan.entities;
    if (!NAME_INTENTS.has(plan.intent) || e.researcher || e.domain || !e.nameCandidate) return null;
    // a follow-up that inherited the old topic isn't naming someone new
    if (plan.followUp?.inherited?.includes("topic")) return null;
    return e.nameCandidate;
}

function shouldUseSemantic(plan) {
    const e = plan.entities;
    if (["greeting", "help", "dashboard statistics", "knowledge graph", "funding agencies", "trends", "rank-people"].includes(plan.intent)) return false;
    if (e.researchers?.length) return false; // "their publications" for several named people
    if (plan.intent === "researchers" && (e.researcher || e.domain)) return false; // exact profile / domain ranking
    if (plan.intent === "compare" && !e.topic) return false;
    if (plan.intent === "institutions" && !e.topic) return false;
    if (plan.intent === "unknown" || plan.intent === "search") return true;
    return Boolean(e.topic);
}

function semanticQuery(plan) {
    const e = plan.entities;
    const yr = e.yearRange || {};
    const wide = ["institutions", "compare", "search", "unknown"].includes(plan.intent) || (plan.intent === "researchers" && !e.domain);
    // Short acronyms ("AI", "IoT") embed poorly — search the full domain name instead
    const topic = e.topic && e.topic.replace(/\s+/g, "").length <= 3 && e.domain ? e.domain : e.topic;
    return {
        text: topic || plan.text,
        collection: COLLECTION_FOR_INTENT[plan.intent] || "all",
        topK: wide ? 30 : 8,
        institution: plan.intent === "compare" ? null : e.institution,
        yearFrom: yr.from || null,
        yearTo: yr.to || null,
    };
}

function publicContext(plan, focus) {
    const e = plan.entities;
    return {
        intent: plan.intent,
        entities: {
            institution: e.institution || null,
            institutions: e.institutions || [],
            yearRange: e.yearRange || null,
            topic: e.topic || null,
            domain: e.domain || null,
            researcher: e.researcher || null,
            fundingAgency: e.fundingAgency || null,
        },
        focus: focus || (e.researcher ? { researcher: e.researcher } : null),
    };
}

// ----------------------------------------------------------
// Retrieval stage (shared by /chat and /chat/stream)
// ----------------------------------------------------------

async function prepare(message, history) {
    const text = String(message ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
    const hist = sanitizeHistory(history);
    const classification = intentClassifier.classify(text);
    const plan = resolvePlan(classification, hist, text);

    if (DEBUG) console.log("[chat] plan", JSON.stringify({ intent: plan.intent, entities: plan.entities, flags: plan.flags, followUp: plan.followUp }));

    if (plan.intent === "greeting" || plan.intent === "help") {
        return { text, plan, hist, canned: plan.intent === "greeting" ? GREETING_REPLY : HELP_REPLY };
    }

    // A name without a "by"/"Dr." cue ("richa sharma?", "give shylaja ss patent
    // titles") looks like a topic to the classifier. If it is a real person, use it.
    const candidate = nameToLookUp(plan);
    if (candidate) {
        const person = await findPersonByName(candidate);
        if (person) {
            if (["search", "unknown"].includes(plan.intent)) plan.intent = "researchers";
            plan.entities = { ...plan.entities, researcher: person, topic: null, keywords: null, domain: null };
            if (DEBUG) console.log("[chat] name ->", candidate, "=>", person);
        }
    }

    const useSemantic = shouldUseSemantic(plan);
    const [kg, sem] = await Promise.all([
        retrieveFromGraph(plan),
        useSemantic ? semanticSearch(semanticQuery(plan)) : Promise.resolve({ ok: true, hits: [], skipped: true }),
    ]);

    const facts = [...kg.facts, ...semanticFacts(plan, sem.hits)];
    const sources = buildSources(kg.records, sem.hits);
    const notes = [];
    if (!kg.ok) notes.push(`${kg.error}. Answers may be incomplete.`);
    if (useSemantic && !sem.ok && !sem.skipped) notes.push("Semantic search is offline, so only exact knowledge-graph matches are shown.");

    return { text, plan, hist, history: hist, kg, sem, facts, sources, notes, focus: kg.focus, useSemantic };
}

function buildMeta(prep, mode, extra = {}) {
    const { plan, kg, sem } = prep;
    return {
        mode,
        llm: llm.llmInfo(),
        intent: plan.intent,
        confidence: plan.confidence,
        followUp: plan.followUp,
        retrieval: kg
            ? {
                graph: kg.ok ? "ok" : `error: ${kg.error}`,
                semantic: !prep.useSemantic ? "skipped" : sem.ok ? `ok (${sem.hits.length} hits)` : `unavailable: ${sem.error}`,
            }
            : null,
        trace: kg?.trace || [],
        ...extra,
    };
}

function emptyAnswer(prep) {
    return !prep.facts.length && !prep.sources.length;
}

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/** POST /chat — full answer in one response. */
export async function getChatResponse(message, history = []) {
    const text = String(message ?? "").trim();
    if (!text) {
        return { reply: "Please type a question to start the chat.", sources: [], cypher: null, suggestions: [], context: null, meta: { mode: "none" } };
    }

    try {
        const prep = await prepare(text, history);
        const context = publicContext(prep.plan, prep.focus);

        if (prep.canned) {
            return { reply: prep.canned, sources: [], cypher: null, suggestions: suggestFollowUps(prep.plan, null), context, meta: buildMeta(prep, "canned") };
        }

        const suggestions = suggestFollowUps(prep.plan, prep.focus);
        let reply;
        let mode = "template";
        let llmError = null;

        if (llm.isLLMEnabled() && !emptyAnswer(prep)) {
            try {
                reply = await llm.generate(buildPrompt(prep));
                mode = "llm";
            } catch (err) {
                llmError = err.message;
                console.error("[chat] LLM failed, using template answer:", err.message);
            }
        }
        if (!reply) reply = templateAnswer(prep);

        return {
            reply,
            sources: prep.sources,
            cypher: null,
            suggestions,
            context,
            meta: buildMeta(prep, mode, llmError ? { llmError } : {}),
        };
    } catch (error) {
        console.error("Chatbot Service Error:", error);
        return { reply: "Sorry, an error occurred while processing the message.", sources: [], cypher: null, suggestions: [], context: null, meta: { mode: "error", error: error.message } };
    }
}

/**
 * POST /chat/stream — Server-Sent Events.
 * send(event, data) is provided by the controller. Events:
 *   meta  { sources, suggestions, context, meta }   (retrieval done)
 *   token { text }                                   (answer delta)
 *   done  { reply, meta }
 *   error { message }
 */
export async function streamChatResponse(message, history = [], send, signal) {
    const text = String(message ?? "").trim();
    if (!text) {
        send("meta", { sources: [], suggestions: [], context: null, meta: { mode: "none" } });
        send("token", { text: "Please type a question to start the chat." });
        send("done", { reply: "Please type a question to start the chat." });
        return;
    }

    let prep;
    try {
        prep = await prepare(text, history);
    } catch (error) {
        console.error("Chatbot stream prepare error:", error);
        send("error", { message: "Sorry, an error occurred while processing the message." });
        return;
    }

    const context = publicContext(prep.plan, prep.focus);
    const suggestions = prep.canned ? suggestFollowUps(prep.plan, null) : suggestFollowUps(prep.plan, prep.focus);
    const willUseLLM = !prep.canned && llm.isLLMEnabled() && !emptyAnswer(prep);

    send("meta", {
        sources: prep.sources || [],
        suggestions,
        context,
        meta: buildMeta(prep, prep.canned ? "canned" : willUseLLM ? "llm" : "template"),
    });

    if (!willUseLLM) {
        const reply = prep.canned || templateAnswer(prep);
        send("token", { text: reply });
        send("done", { reply });
        return;
    }

    let streamed = "";
    try {
        const reply = await llm.generateStream({
            ...buildPrompt(prep),
            signal,
            onToken: (t) => {
                streamed += t;
                send("token", { text: t });
            },
        });
        send("done", { reply });
    } catch (err) {
        if (signal?.aborted) return;
        console.error("[chat] LLM stream failed:", err.message);
        const fallback = templateAnswer(prep);
        // If nothing was streamed yet, replace silently; otherwise append.
        const reply = streamed ? `${streamed}\n\n---\n${fallback}` : fallback;
        send("token", { text: streamed ? `\n\n---\n${fallback}` : fallback });
        send("done", { reply, meta: { mode: "template", llmError: err.message } });
    }
}
