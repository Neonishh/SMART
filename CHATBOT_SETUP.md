# Ask SMART — Hybrid RAG Chatbot: Setup & Status

This picks up from the earlier status note ("KG chatbot done, FAISS / LLM / memory / frontend polish remaining") and completes those phases.

```
                 User question  (+ history with context)
                        │
          intentClassifier ──► memory.resolvePlan  (follow-ups, "their", "what about RVCE?")
                        │
        ┌───────────────┴────────────────┐
        ▼                                ▼
  kgRetriever                     semanticRetriever ──► python_retriever (FastAPI + FAISS)
  (existing Neo4j services)              │                 loads EXISTING nlp/faiss/*.bin
        ▼                                ▼
  exact facts + records          similar documents + BERTopic themes
        └───────────────┬────────────────┘
                        ▼
                 contextBuilder  →  numbered sources [n]
                        ▼
         llmService (Gemini / OpenAI-compatible)  ── no key? → template answer
                        ▼
       POST /chat  (JSON)   ·   POST /chat/stream  (Server-Sent Events)
```

---

## 1. What changed

### New files
| File | Purpose |
|---|---|
| `python_retriever/app.py` | FastAPI service. Loads the **existing** FAISS indices + `nlp_input` CSVs once, maps rows → KG ids, attaches BERTopic labels, serves `POST /search`, `GET /health`. Nothing is re-embedded or rebuilt. |
| `python_retriever/requirements.txt` | Python deps for the retriever. |
| `backend/services/llmService.js` | Gemini or any OpenAI-compatible API (OpenAI, Groq, OpenRouter, Ollama). Normal + streaming. No SDKs. |
| `backend/services/chat/kgRetriever.js` | Intent → calls into the existing services (publication, patent, grant, thesis, institution, researcher, analytics, dashboard). Returns facts + citable records + "focus" for follow-ups. |
| `backend/services/chat/semanticRetriever.js` | HTTP client for the retriever. Never throws; backs off for 30 s if the retriever is down. |
| `backend/services/chat/memory.js` | Conversation memory: carries topic / institution / years / intent forward, resolves "their/his/her" to the researcher from the previous answer. |
| `backend/services/chat/contextBuilder.js` | Merges + de-duplicates sources, builds the RAG prompt, template answer, follow-up suggestions. |
| `backend/services/chat/trendData.js` | Reads trend-engine CSVs no service exposed yet (top funding agencies, top PIs, institution CAGR). |
| `frontend/src/components/chat/MarkdownMessage.jsx` | Dependency-free Markdown renderer with clickable `[n]` citation chips. |
| `frontend/src/components/chat/SourceList.jsx` | Collapsible source cards linking to publication / researcher pages. |

### Modified files
| File | Change |
|---|---|
| `backend/services/chatbotService.js` | Rewritten as the orchestration layer (classify → memory → KG ∥ FAISS → context → LLM). Adds `streamChatResponse`. |
| `backend/utils/intentClassifier.js` | Still only intent/entity extraction. **Fixed institution map** (it mapped IIT-B/IIT-M/IIT-D/NITK which are not in the dataset and missed RVCE, PES, MSRIT, BMSCE, DSCE, CMRIT). Adds year ranges ("since 2021", "last 3 years"), topic, technology domain, compare, follow-up flags. |
| `backend/controllers/chatbotController.js` | Adds `/chat/stream`, `/chat/health`, `/semantic-search` handlers. |
| `backend/routes/chatbot.js`, `backend/routes/search.js`, `backend/server.js` | Routes for the above. `POST /chat` contract unchanged (`reply`, `sources`, `cypher` + extra fields). |
| `backend/services/publicationService.js` | **Added `getAllPublications()`** — the old chatbot called it but it didn't exist, so every publication/researcher question crashed. Paginated, with institution + year facets. |
| `backend/services/patentService.js` | Added `yearFrom/yearTo` + `inventor` filters and `getTopInventors()`. |
| `backend/services/grantService.js` | Added `yearFrom/yearTo` filters. |
| `backend/.env.example` | LLM + retriever settings. |
| `frontend/src/pages/Chatbot.jsx` | Streaming answers, Markdown, citations, sources, follow-up suggestions, stop button, new chat, status dots, session persistence. |
| `frontend/src/services/api.js` | `streamChatMessage()`, `getChatHealth()`; `/chat` timeout raised to 60 s. |

---

## 2. Run it locally

1. **Neo4j** — start your existing database (the one loaded from `knowledge_graph/neo4j/SMART.dump`).

2. **Copy the FAISS indices into the repo.** They are git-ignored (`*.bin`), so they only exist on the machine that built them. Put them here:
   ```
   nlp/faiss/publications_index.bin
   nlp/faiss/patents_index.bin
   nlp/faiss/grants_index.bin
   nlp/faiss/theses_index.bin
   ```
   They must have been built from the `nlp/nlp_input/*_nlp_input.csv` files in this repo (row *i* of the index = row *i* of the CSV). The retriever checks the row counts and refuses a mismatched index with a clear message in `/health`.

3. **Start the retriever** (from the repo root):
   ```bash
   python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
   pip install -r python_retriever/requirements.txt
   uvicorn python_retriever.app:app --port 8001
   ```
   The first start downloads `all-MiniLM-L6-v2` (~90 MB). Check `http://localhost:8001/health` — all four collections should say `"ready": true`.

4. **Configure the backend** — copy `backend/.env.example` to `backend/.env`, fill in Neo4j, then pick an LLM:
   - Gemini (free key from https://aistudio.google.com/apikey): `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=...`
   - Groq (free, fast): `LLM_PROVIDER=openai`, `OPENAI_BASE_URL=https://api.groq.com/openai/v1`, `OPENAI_API_KEY=...`, `LLM_MODEL=<a Groq model id>`
   - No key: `LLM_PROVIDER=none` — still works, answers are formatted facts + sources.

5. **Start the backend**: `cd backend && npm install && npm start`, then open `http://localhost:5000/chat/health` — expect `graph: "ok"`, `retriever.status: "ok"`, `llm.enabled: true`.

6. **Start the frontend**: `cd frontend && npm install && npm run dev` (with `frontend/.env` → `VITE_API_BASE_URL=http://localhost:5000`) and open **Ask SMART** in the dashboard. The three dots at the top of the chat show Graph / Semantic / AI-answers status.

---

## 3. Questions to demo

| Try | Exercises |
|---|---|
| Most cited papers on graph neural networks from IISc | KG title search + citation sort + FAISS |
| what about RVCE? | follow-up: keeps topic, swaps institution |
| Show AI researchers → Who has most patents? → Show their publications → and their patents? | memory chain from the status note |
| Who has the most patents at PES University? | top inventors (Person–INVENTED) |
| DST funded grants at MSRIT between 2020 and 2023 | agency + institution + year range |
| Compare RVCE and BMSCE | institution comparison + CAGR |
| Which institutions lead in quantum computing? | KG facets + semantic distribution |
| Is cybersecurity research growing? | trend engine (CAGR, YoY, top researchers) |
| Top funding agencies | trend-engine CSV |
| Find work related to intrusion detection in IoT | pure semantic search |

Set `CHAT_DEBUG=true` in `backend/.env` to log the classifier plan for every message.

---

## 4. API

`POST /chat` — body `{ message, history? }`

```json
{
  "reply": "markdown answer with [1] citations",
  "sources": [{ "n": 1, "type": "publication", "id": "PUB_013676", "title": "...", "year": 2025,
                "institution": "...", "url": "...", "snippet": "...", "score": 0.71, "origin": "graph+semantic" }],
  "cypher": null,
  "suggestions": ["Show the most cited ones", "..."],
  "context": { "intent": "publications", "entities": { ... }, "focus": { "researcher": "..." } },
  "meta": { "mode": "llm|template|canned", "retrieval": { "graph": "ok", "semantic": "ok (8 hits)" }, "trace": ["..."] }
}
```

Send `context` back inside each assistant entry of `history` — that's what makes follow-ups work (the frontend already does this).

`POST /chat/stream` — same body; SSE events `meta`, `token`, `done`, `error`.
`POST /semantic-search` — `{ query, collection?, top_k?, institution?, year_from?, year_to? }`.
`GET /chat/health` — status of Neo4j, retriever, LLM.

---

## 5. How it was tested (and what wasn't)

Tested in a sandbox without Neo4j or internet access to Hugging Face, so:

- **Retriever**: run for real against the repo's `nlp_input` CSVs and BERTopic files, with stand-in indices of identical shape (the real `.bin` files aren't in git). KG-id mapping: 27,964 / 28,338 publications, 100 % of patents, grants and theses.
- **Backend**: the real routes, controller, orchestrator, classifier, memory, context builder and LLM service were run end-to-end. Neo4j-backed services were replaced with in-memory versions built from `knowledge_graph/csv`; analytics + researcher CSV services ran for real. LLM tested with a mock OpenAI-compatible server (normal + streaming), plus failure paths (retriever down, LLM unreachable).
- **Cypher**: every query added or changed was captured from the real functions with all filters on and validated with Neo4j's official parser (`@neo4j-cypher/language-support`).
- **Frontend**: built with Vite, linted with oxlint, and exercised in headless Chromium.

Still to verify on your machine: the real Neo4j queries against live data, the real embedding model (scores will differ from the stand-in), and the Gemini/OpenAI call with a real key.

---

## 6. Known data-quality issues surfaced by the chatbot

- Some `Person` nodes are organisations (e.g. "CMR Institute of Technology" as an inventor). The chatbot filters them out of "top inventors", but cleaning them in the ETL would be better.
- Duplicate inventor spellings ("Dr. Kesavamoorthy R." vs "Kesavamoorthy R") split patent counts.
- Funding agency names are inconsistent ("DST" vs "Department of Science and Technology"); grant search falls back to text match when the exact agency filter finds nothing.
