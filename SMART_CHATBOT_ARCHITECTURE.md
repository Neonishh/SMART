SMART — Chatbot Architecture & Project Analysis
===============================================

This document is a workspace-grounded analysis of the existing SMART project and a blueprint for adding a RAG-based chatbot that reuses existing components. It is based only on files present in the repository.

Contents
- Existing SMART Architecture
- Components That Can Be Reused
- Missing Components (for the chatbot)
- Proposed Chatbot Architecture
- Implementation Roadmap (phased)

--------------------------------------------------------------------------------
Existing SMART Architecture
--------------------------------------------------------------------------------

1) Folder structure (top-level overview)
- backend/ — Node/Express API server, Neo4j connection, controllers, services, and utilities.
- frontend/ — Vite + React frontend, pages including `Chatbot` UI, services that call backend endpoints.
- knowledge_graph/ — CSV node/relationship dumps, Neo4j import cypher scripts, KG maintenance scripts.
- nlp/ — NLP pipelines (BERTopic, embeddings, FAISS builders), topic outputs, intermediate CSVs and indices.
- datasets/ — master CSVs for grants, patents, publications, theses.

See: [backend/server.js](backend/server.js#L1), [frontend/src/pages/Chatbot.jsx](frontend/src/pages/Chatbot.jsx#L1)

Major modules (by folder)
- backend/config: `neo4j.js` — Neo4j driver configured from env.
- backend/constants: `graphConstants.js` — display property mapping and node sizing.
- backend/utils: `graphFormatter.js` — formats Neo4j records into nodes/links for the frontend graph view.
- backend/services: domain services that perform Cypher queries using the `driver` (Neo4j) and return JSON-friendly objects (e.g., `grantService.js`, `patentService.js`, `dashboardService.js`, `knowledgeGraphService.js`).
- backend/controllers: thin adapters between Express routes and services (validate, handle errors).
- backend/routes: router files that mount endpoints (`/dashboard`, `/grants`, `/patents`, `/knowledge-graph`, `/institution`, `/theses`). Some routes are intentionally empty placeholders (`chatbot.js`, `search.js`, `researcher.js`).
- frontend/src/services/api.js: central HTTP client that calls backend endpoints; contains `sendChatMessage` and `semanticSearch` client functions (currently mocked until backend endpoints exist).
- nlp/: contains embedding generation (`generate_publication_embeddings.py`, `topic_embeddings.py`), FAISS index builders (`build_faiss.py`, `build_faiss_publications.py`), BERTopic scripts (`*_bertopic.py`), topic aggregation (`build_master_topics.py`) and trend analysis tools (`trend_engine/`).
- knowledge_graph/neo4j: `02_import_nodes.cypher` and `03_import_relationships.cypher` define node labels, properties and relationships.

Current data flow (high level)
1. Raw master CSVs are in `datasets/` and transformed into `knowledge_graph/csv/*` and `nlp/nlp_input/*`.
2. KG import: `knowledge_graph/neo4j/02_import_nodes.cypher` and `03_import_relationships.cypher` load the CSVs into Neo4j nodes and relationships.
3. Backend services run Cypher queries against Neo4j via `backend/config/neo4j.js` and `neo4j-driver`.
4. NLP pipeline reads `nlp/nlp_input/*` to produce:
   - BERTopic outputs in `nlp/topics/*` (document-topic maps + topic info),
   - embeddings saved to `nlp/embeddings/*.npy`,
   - FAISS indexes saved under `nlp/faiss/*.bin` (built by `build_faiss*.py`).
5. Frontend calls backend endpoints (or mock handlers) via `frontend/src/services/api.js` and renders data (tables, graphs, Chatbot UI).

Existing APIs and endpoints (from `backend/routes` and `server.js`)
- `GET /` — health/info (server.js)
- `GET /dashboard/overview` — dashboard stats (dashboardService)
- `GET /grants` — list grants with filters (grantService.getAllGrants)
- `GET /grants/:id` — grant profile (grantService.getGrantById)
- `GET /grants/analytics` — grant analytics (grantService.getGrantAnalytics)
- `GET /patents` — list patents (patentService.getAllPatents)
- `GET /patents/:id` — patent profile (patentService.getPatentById)
- `GET /patents/trends` — patent trends analytics
- `GET /knowledge-graph` — a sampled knowledge graph for visualization (knowledgeGraphService.getKnowledgeGraph)
- `GET /institution` — list institutions (institutionController)
- `GET /theses` and `GET /theses/:id` — thesis listing/profile

Notes: The frontend expects `POST /semantic-search` and `POST /chat` (see `frontend/src/services/api.js`) but these backend endpoints are not implemented (placeholders exist). Also `backend/routes/chatbot.js` and `backend/routes/search.js` are empty.

Knowledge Graph architecture (what exists)
- Connection setup: `backend/config/neo4j.js` creates a `neo4j-driver` instance from environment variables (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`) and exports `driver` for services to create sessions.
- Query execution pattern: domain services import `driver`, create `session = driver.session()`, run parameterized Cypher via `session.run(query, params)`, parse `result.records` and `session.close()` in finally clause.
- Node and relationship structure: defined in `knowledge_graph/neo4j/02_import_nodes.cypher` and `03_import_relationships.cypher`. Node labels include: `Institution, Publication, Patent, Grant, Thesis, Person, FundingAgency, Department, Domain, Subdomain, Field, Keyword, IPC, Applicant, Location`. Relationships include: `HAS_PUBLICATION, HAS_PATENT, HAS_GRANT, HAS_THESIS, FUNDED_BY, PI_OF, AUTHORED_PUBLICATION, AUTHORED_THESIS, INVENTED, APPLIED_FOR, HANDLES_GRANT, HANDLES_THESIS, LOCATED_IN, SUPERVISED, HAS_DOMAIN, HAS_SUBDOMAIN, HAS_KEYWORD, HAS_IPC, BELONGS_TO_FIELD` etc.
- Helper functions: `backend/utils/graphFormatter.js` converts Neo4j node/relationship objects into a compact nodes/links structure used by the frontend visualization. `backend/constants/graphConstants.js` centralizes label property names and node sizes.

NLP architecture (what exists)
- Inputs: cleaned documents in `nlp/nlp_input/{publications,patents,grants,theses}_nlp_input.csv` with columns including `record_id, institution, title, clean_text`.
- Embeddings: created using SentenceTransformers `all-MiniLM-L6-v2` (see `nlp/generate_publication_embeddings.py` and `nlp/topic_embeddings.py`), saved as numpy `.npy` files in `nlp/embeddings/` (scripts reference `embeddings/<name>_embeddings.npy`).
- FAISS index creation: `nlp/build_faiss.py` (generic) and `nlp/build_faiss_publications.py` (specific) load `.npy` embeddings, cast to float32, build `faiss.IndexFlatL2` and write `.bin` to `nlp/faiss/`.
- FAISS search implementation: There are FAISS build scripts, but I did not find a server-side FAISS search function (no Python server or Node JS wrapper calling faiss for runtime queries). No existing backend endpoint executes FAISS queries. The FAISS artifacts exist for offline retrieval and could be loaded by a Python process or a new service.
- BERTopic pipeline: scripts `publication_bertopic.py`, `patents_bertopic.py`, `grants_bertopic.py`, `theses_bertopic.py` train BERTopic models on `nlp_input/*_nlp_input.csv`, produce `topics/*_topics.csv` and `topics/*_topic_info.csv`. `nlp/build_master_topics.py` aggregates topic info into `trend_outputs/all_topics.csv`.
- Trend analysis: `nlp/trend_engine/` contains modules (e.g., `cagr.py`, `yoy_growth.py`, `domain_yearly_count.py`) and `trend_outputs/` has aggregated outputs like `all_topics.csv`, `domain_trends.csv`, `emerging_technologies.csv`.

Frontend architecture (what exists)
- React (Vite) single-page app in `frontend/`.
- Pages: `Chatbot.jsx` (UI), dashboard pages, knowledge graph page, grants/patents/theses pages.
- API client: `frontend/src/services/api.js` centralizes all HTTP calls and uses mock data when `VITE_API_BASE_URL` is not set. `sendChatMessage` and `semanticSearch` are present in the client and currently return mock responses until server endpoints exist.
- Chat UI: `Chatbot.jsx` maintains message history and calls `sendChatMessage` to POST `/chat` (or use mock).

--------------------------------------------------------------------------------
Components That Can Be Reused
--------------------------------------------------------------------------------
List every existing module that should be reused instead of rewritten:
- Neo4j connection and services
  - `backend/config/neo4j.js` — single driver; reuse for any Cypher execution from chatbot backend.
  - All domain services that perform Cypher queries: `backend/services/*.js` (grantService, patentService, dashboardService, knowledgeGraphService). These show patterns for parameterized queries, pagination, facets, and analytics — reuse as primitives for KG retrieval.
  - `backend/utils/graphFormatter.js` and `backend/constants/graphConstants.js` — reuse for KG results formatting and graph visual outputs.
- Frontend
  - `frontend/src/pages/Chatbot.jsx` — the UI and interaction pattern already exists and can be wired to a backend `/chat` endpoint.
  - `frontend/src/services/api.js` — contains `sendChatMessage` / `semanticSearch`; keep these as client-side contracts.
- NLP outputs and tooling
  - `nlp/topics/*_topic_info.csv` and `nlp/topics/*_topics.csv` — use as label maps and topic->document lookup tables.
  - `nlp/embeddings/*.npy` and `nlp/faiss/*.bin` — re-use FAISS indices and embedding arrays for semantic retrieval.
  - BERTopic artifacts and `nlp/trend_outputs/*` — use topic summaries and trend signals as part of context building and evidence for answers.
- Other useful files
  - `knowledge_graph/neo4j/02_import_nodes.cypher` and `03_import_relationships.cypher` for KG schema and property names.
  - `nlp/CONTEXT_FOR_CHATBOT.md` (created earlier) as a concise source list for prompt attachments.

--------------------------------------------------------------------------------
Missing Components (must be implemented)
--------------------------------------------------------------------------------
These are components not present in the repository and required to build the chatbot that uses RAG:
1. Chat API endpoint(s) on backend
   - `POST /chat` to accept user message + optional conversation history and return a grounded answer, generated by combining KG and semantic retrieval results.
2. Semantic search microservice or server-side FAISS lookup
   - A Python or Node service that loads `nlp/faiss/*.bin` and `nlp/embeddings/*.npy` and performs k-NN queries. (FAISS is available in Python; Node bindings are non-standard.)
3. Intent -> Cypher translator (or a small rule-based intent classifier)
   - A light-weight intent classifier that maps common question types to parameterized Cypher templates (e.g., institution->HAS_GRANT->Grant), or a few carefully designed templates plus a small LLM prompt to convert questions to Cypher securely.
4. Context builder / Retrieval orchestrator
   - A service that receives a user query, calls intent classifier + Cypher runner + FAISS retriever, merges results, and prepares the context (sources, citations) for LLM input.
5. RAG prompt templates and response generator (LLM integration)
   - A module that sends the built context + user question to an LLM (OpenAI/Gemini) and produces the final natural-language answer. It must also return `cypher` used, `sources` (IDs/URLs), and optionally the retrieval traces.
6. Backend route implementations and wiring
   - `backend/routes/chatbot.js` should be implemented and mounted in `server.js` (or reuse `/knowledge-graph` routes). Also `search.js` and `researcher.js` may need filling depending on features.
7. FAISS → record_id mapping
   - A small CSV or metadata map that ties FAISS vector indices to `record_id` values (so hits can be translated to publications/patents/grants records).
8. Deployment/topology decisions
   - Decide whether to add a Python microservice (recommended, for FAISS and SentenceTransformers) or implement FAISS search using a separate process callable from Node (e.g., via HTTP). The repo contains Python scripts already, so adding a Python retrieval service is the least disruptive.

--------------------------------------------------------------------------------
Proposed Chatbot Architecture (integrating with existing code)
--------------------------------------------------------------------------------
High-level goals
- Reuse the KG (Neo4j), embeddings (SentenceTransformers), FAISS indices, and BERTopic outputs.
- Keep the existing backend (Node/Express) and frontend unchanged as much as possible.
- Add a small retrieval microservice (Python) to host FAISS + embedding inference.

Recommended components (files and placement)

New files to add (suggested)
- backend/routes/chatbot.js — Express route that accepts POST /chat and forwards to an internal orchestration service.
- backend/controllers/chatbotController.js — validate input, call `backend/services/chatbotService.js`, return structured response.
- backend/services/chatbotService.js — orchestrates hybrid retrieval (calls Neo4j services and the retrieval microservice), builds context, calls LLM, and returns final answer object: { answer, cypher, sources, debug }.
- python_retriever/
  - app.py — small FastAPI app exposing `POST /search` and `POST /embed` endpoints. Loads SentenceTransformer model, loads FAISS indices, exposes nearest neighbors as record IDs + distances. Also optionally performs batch embedding generation for the `history` or user text.
  - metadata/embedding_index_map_{publications,patents,grants}.csv — maps FAISS index row -> record_id and metadata.
- prompts/chat_prompt_templates.md — canonical RAG prompts and templates used by chatbotService when calling LLM.
- docs/sample_prompt_attachments/ — small CSV samples from `nlp/nlp_input/` (50–200 rows) to attach to LLM when testing intent→cypher generation (optional).

Existing files to modify
- `backend/server.js` — import and mount `chatbot` router (e.g., `app.use('/chat', chatbotRoutes)`) or mount at `/chat` route.
- `frontend/src/services/api.js` — remove mock behavior for `sendChatMessage` when `VITE_API_BASE_URL` set; keep contract same (POST `/chat` with { message, history }). The client already expects this contract.
- (Optional) `frontend/src/pages/Chatbot.jsx` — keep same; will continue to call `sendChatMessage`.

API endpoints (summary)
- POST /chat
  - Input: { message: string, history?: [{role, content}] }
  - Behavior: orchestrates retrieval + LLM; returns { reply: string, cypher?: string, sources: [{type,id,title,url}], debug?: {retrieval}}.
  - Uses: `chatbotService` which executes: intent detection → neo4j retrieval (Cypher) + python_retriever FAISS search → context build → LLM call → final answer.

Class / Function responsibilities (conceptual)
- ChatbotController (backend/controllers/chatbotController.js)
  - Validate request, extract user message and metadata, call ChatbotService, handle errors, return HTTP result.
- ChatbotService (backend/services/chatbotService.js)
  - Input: user message, history
  - Steps:
    1. Intent detection / classification (fast rule-based + fallback LLM prompt).
    2. If KG-intent: build parameterized Cypher template and parameters (reuse patterns from grantService/patentService). Run Cypher via existing services (or call driver directly) and collect structured facts.
    3. Always perform semantic retrieval via python_retriever POST /search to fetch top-k documents (publications, patents, etc.).
    4. Merge KG facts + FAISS documents into a Context object (include provenance: node IDs, publication IDs, doc snippets, topic tags from `*_topic_info.csv`).
    5. Construct LLM prompt (RAG prompt) using `prompts/chat_prompt_templates.md` and send to LLM provider (OpenAI/Gemini) with the Context and question.
    6. Post-process LLM answer to add citations and return structured JSON: { reply, cypher (if executed), sources }.
- python_retriever (FastAPI)
  - Load SentenceTransformer model `all-MiniLM-L6-v2` and FAISS indices on startup; expose endpoints:
    - POST /embed — returns embedding for text (optional)
    - POST /search — accepts { text, index: 'publications'|'patents'|... , k } and returns [{ record_id, score, snippet, metadata }]
  - Use metadata CSV to translate FAISS index rows to `record_id` and return snippets from `nlp/nlp_input/*` or `Final csvs`.

Complete request flow (end-to-end)
1. User types question in `frontend` Chat UI and hits send.
2. Frontend `sendChatMessage` posts `{ message, history }` to `POST /chat` (backend).
3. `chatbotController` forwards to `chatbotService`.
4. `chatbotService` runs intent detection. Two branches:
   - KG-intent: generate parameterized Cypher and run one or more Cypher queries using existing services (grantService, patentService or direct driver). Collect structured rows for evidence.
   - Semantic-intent (or always): call `python_retriever` `POST /search` for relevant documents in FAISS (publications, patents, etc.). Get top K results with record IDs and snippets.
5. Build context: a compact set of structured facts (from KG) and unstructured snippets (from FAISS). Include BERTopic labels for those documents by looking up `topics/*_topics.csv` or `trend_outputs/all_topics.csv`.
6. Use a RAG prompt template and call the LLM with context + question. The LLM produces the natural language answer.
7. Return to frontend: `{ reply, cypher (if executed), sources: [{ type, id, title, url, score }] }`.

Retrieval pipeline details
- KG retrieval: reuse domain services (grantService, patentService, etc.) to return structured results and facets. These services already have robust Cypher templates and pagination.
- FAISS retrieval: python_retriever loads `nlp/faiss/<index>.bin` and the associated `embeddings/<index>_embeddings.npy` metadata map. On /search, compute or accept embedding, run `index.search()` and map neighbors to record ids using map CSV. Return snippets drawn from `nlp/nlp_input/*.csv` or `nlp/Final csvs/*`.
- Topic grounding: For any retrieved document, attach its BERTopic `topic_id` and the human-readable topic name from `nlp/topics/*_topic_info.csv` and `nlp/trend_outputs/all_topics.csv`.

Hybrid RAG architecture
- Combine KG facts and FAISS snippets into one context. Prefer short structured KG facts first (facts, counts, top-N lists), then append top-K document snippets (with citations). Provide a short instruction telling the LLM to prioritize KG facts for structured queries (counts, who/what/where) and use FAISS snippets for semantic answers (summary, related works, descriptions).

Response generation pipeline
1. Context assembly: JSON object of KG facts + FAISS snippets + topic labels + sources.
2. RAG prompt: include system instruction (be a Research Intelligence Assistant), the context, explicit citation markers, and the user question. Keep total tokens within LLM limits by truncating low-score snippets.
3. LLM call: synchronous call to OpenAI/Gemini (configurable) with a temperature tuned for factual answers (e.g., 0–0.2).
4. Post-processing: format citations, optionally convert to markdown, attach `sources` array with structured metadata.

--------------------------------------------------------------------------------
Implementation Roadmap (phased)
--------------------------------------------------------------------------------
Phase 0 — Prep & discovery (0.5 day)
- Confirm environment choices (LLM provider, Python vs Node for FAISS). Decide on Python retrieval microservice.
- Prepare small sample exports (50 rows) from `nlp/nlp_input/*` and `nlp/topics/*_topic_info.csv` for prompt testing.

Phase 1 — Minimal backend chat endpoint + mock retrieval (1 day)
- Implement `backend/routes/chatbot.js` + `backend/controllers/chatbotController.js` + `backend/services/chatbotService.js` that returns mock/placeholder retrievals and wire into `server.js`.
- Unmock frontend by setting `VITE_API_BASE_URL` to local backend and test end-to-end Chat UI calling `POST /chat`. Initially chatbotService returns canned responses using existing `dashboardService`/`grantService` patterns for KG answers.

Phase 2 — FAISS retrieval microservice (2–3 days)
- Create `python_retriever/` FastAPI service that loads `all-MiniLM-L6-v2`, loads `nlp/faiss/*.bin` and `nlp/embeddings/*.npy`, exposes `POST /search` returning record_id + snippet + score.
- Add metadata CSV mapping index rows to `record_id` (extractable from existing `nlp` outputs). Provide a small CLI to build those maps from `nlp` artifacts.

Phase 3 — Chatbot orchestration & simple RAG (2–3 days)
- Implement `chatbotService` to call both Neo4j services and `python_retriever /search`, assemble context, and call an LLM with a RAG prompt, returning structured reply + sources.
- Add basic prompt templates and debug logging.

Phase 4 — Intent → Cypher templates & rules (1–2 days)
- Implement a compact intent classifier (rules + few-shot LLM fallback) to detect KG-specific question types and generate parameterized Cypher templates. Reuse grantService/patentService query patterns.

Phase 5 — Hybrid tuning, citations, and front-end polish (2–3 days)
- Improve context ranking/truncation, add explicit source citations in the reply, show `cypher` used in debug panel, format results for `Chatbot.jsx` (markdown/links). Add streaming responses (frontend) if needed.

Phase 6 — Recommendations & advanced features (3–5 days)
- Add collaborator/publication/patent recommendation modules using combined embeddings and KG signals. Integrate BERTopic growth signals to recommend emerging domains.

Total (MVP): 7–12 days for a working hybrid RAG chatbot (back-end + retrieval microservice + basic LLM prompts + frontend integration). Work can be staged — the frontend UI already exists and will work earlier with the minimal `POST /chat` implementation.

--------------------------------------------------------------------------------
Notes and constraints
- I did not add or invent modules beyond the repository: recommended Python retrieval microservice uses existing `nlp` artifacts and is consistent with python scripts already in `nlp/`.
- The repository currently lacks runtime FAISS search endpoints and the `/chat` route required by the frontend; these are the two highest-priority items to implement.
- For practical development: because FAISS and SentenceTransformers are Python-native and already used in `nlp/`, running a small Python FastAPI retriever is the least disruptive integration approach. The Node backend can call it via HTTP.

--------------------------------------------------------------------------------
Where I looked (representative files)
- backend/server.js
- backend/config/neo4j.js
- backend/routes/*.js
- backend/controllers/*.js
- backend/services/*.js (grantService.js, knowledgeGraphService.js, dashboardService.js)
- backend/utils/graphFormatter.js
- frontend/src/pages/Chatbot.jsx
- frontend/src/services/api.js
- knowledge_graph/neo4j/02_import_nodes.cypher
- knowledge_graph/neo4j/03_import_relationships.cypher
- nlp/*.py, nlp/topics/*, nlp/nlp_input/*, nlp/trend_outputs/*

--------------------------------------------------------------------------------
Next recommended actionable step (I can do immediately)
- Export 50-row samples for `nlp/nlp_input/*` and write `python_retriever/metadata/*` mapping rows to `record_id` entries, then scaffold the FastAPI retriever (`python_retriever/app.py`) and a small `README` that documents how to run it locally.

If you want me to proceed, tell me whether to implement the Python retriever microservice next or to first implement the minimal `/chat` backend endpoint that uses mock retrieval. 
