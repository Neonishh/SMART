import * as chatbotService from "../services/chatbotService.js";
import { semanticSearch, retrieverHealth } from "../services/chat/semanticRetriever.js";
import { llmInfo } from "../services/llmService.js";
import driver from "../config/neo4j.js";

const MAX_MESSAGE_LENGTH = 2000;

function readBody(req) {
    const { message, history } = req.body || {};
    const text = typeof message === "string" ? message : "";
    return { text, history: Array.isArray(history) ? history : [] };
}

/** POST /chat  — body { message, history? } -> { reply, sources, cypher, suggestions, context, meta } */
export async function postChat(req, res) {
    try {
        const { text, history } = readBody(req);
        if (text.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ reply: `Please keep questions under ${MAX_MESSAGE_LENGTH} characters.`, sources: [], cypher: null });
        }

        const result = await chatbotService.getChatResponse(text, history);

        return res.status(200).json({
            reply: result.reply ?? "",
            sources: result.sources ?? [],
            cypher: result.cypher ?? null,
            suggestions: result.suggestions ?? [],
            context: result.context ?? null,
            meta: result.meta ?? {},
        });
    } catch (error) {
        console.error("Chatbot Controller Error:", error);
        return res.status(500).json({
            reply: "Sorry, something went wrong processing your message.",
            sources: [],
            cypher: null,
        });
    }
}

/** POST /chat/stream — same body, answers as Server-Sent Events */
export async function postChatStream(req, res) {
    const { text, history } = readBody(req);

    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const controller = new AbortController();
    // "close" on the response fires when the client goes away (or we end it)
    res.on("close", () => controller.abort());

    const send = (event, data) => {
        if (res.writableEnded) return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const keepAlive = setInterval(() => !res.writableEnded && res.write(": ping\n\n"), 15000);

    try {
        if (text.length > MAX_MESSAGE_LENGTH) {
            send("error", { message: `Please keep questions under ${MAX_MESSAGE_LENGTH} characters.` });
        } else {
            await chatbotService.streamChatResponse(text, history, send, controller.signal);
        }
    } catch (error) {
        console.error("Chatbot stream error:", error);
        send("error", { message: "Sorry, something went wrong processing your message." });
    } finally {
        clearInterval(keepAlive);
        res.end();
    }
}

/** GET /chat/health — which parts of the pipeline are up */
export async function getChatHealth(req, res) {
    let graph = "ok";
    try {
        await driver.verifyConnectivity();
    } catch (err) {
        graph = `down: ${err.message}`;
    }
    const retriever = await retrieverHealth();
    res.json({ graph, retriever, llm: llmInfo() });
}

/** POST /semantic-search — body { query, collection?, top_k?, institution?, year_from?, year_to? } */
export async function postSemanticSearch(req, res) {
    const { query, text, collection, top_k: topK, institution, year_from: yearFrom, year_to: yearTo } = req.body || {};
    const q = String(query || text || "").trim();
    if (!q) return res.status(400).json({ error: "query is required", results: [] });

    const result = await semanticSearch({ text: q, collection: collection || "all", topK: Number(topK) || 10, institution, yearFrom, yearTo, minScore: 0 });
    if (!result.ok) return res.status(503).json({ error: `Semantic search unavailable: ${result.error}`, query: q, results: [] });
    return res.json({ query: q, results: result.hits });
}
