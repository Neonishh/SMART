"""
SMART semantic retriever (FastAPI)
==================================

Loads the EXISTING NLP artifacts once at startup and serves k-NN search:

    nlp/faiss/<collection>_index.bin      <- built by nlp/build_faiss.py
    nlp/nlp_input/<collection>_nlp_input.csv
    nlp/topics/<topic>_topics.csv + <topic>_topic_info.csv   (BERTopic labels)
    knowledge_graph/csv/Nodes/<Label>.csv  (to map rows -> KG ids)

Nothing is re-embedded or rebuilt. FAISS row i == row i of the nlp_input CSV,
because that is exactly how nlp/generate_publication_embeddings.py and
nlp/build_faiss.py produced the indices (pd.read_csv -> clean_text -> encode).

Run (from the repo root):
    uvicorn python_retriever.app:app --port 8001
"""

from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("smart.retriever")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [retriever] %(message)s")

# ---------------------------------------------------------------------------
# Paths / config
# ---------------------------------------------------------------------------

ROOT = Path(os.getenv("SMART_ROOT", Path(__file__).resolve().parent.parent))
NLP_DIR = ROOT / "nlp"
FAISS_DIR = Path(os.getenv("FAISS_DIR", NLP_DIR / "faiss"))
NODES_DIR = ROOT / "knowledge_graph" / "csv" / "Nodes"
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


@dataclass
class CollectionSpec:
    name: str              # publications | patents | grants | theses
    csv: str               # file in nlp/nlp_input
    title_col: str
    institution_col: str
    snippet_cols: List[str]
    extra_cols: List[str]
    topic_prefix: str      # publication | patent | grant | thesis
    kg_csv: str            # Node CSV for id mapping
    kg_id_col: str
    kg_title_col: str


SPECS: Dict[str, CollectionSpec] = {
    "publications": CollectionSpec(
        "publications", "publications_nlp_input.csv", "title", "institution",
        ["title"], ["domain", "subdomain"], "publication",
        "Publication.csv", "Publication_ID", "Title"),
    "patents": CollectionSpec(
        "patents", "patents_nlp_input.csv", "title", "Institution",
        ["abstract"], ["field_of_invention"], "patent",
        "Patent.csv", "Patent_ID", "Patent_Title"),
    "grants": CollectionSpec(
        "grants", "grants_nlp_input.csv", "project_title", "institution",
        ["project_title"], ["department"], "grant",
        "Grant.csv", "Grant_ID", "Title"),
    "theses": CollectionSpec(
        "theses", "theses_nlp_input.csv", "title", "institution",
        ["abstract"], ["department"], "thesis",
        "Thesis.csv", "Thesis_ID", "Title"),
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def norm_title(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def clean_snippet(value: Any, limit: int = 320) -> str:
    text = str(value or "")
    text = re.sub(r"\bnewline\b", " ", text)          # Shodhganga artefact
    text = re.sub(r"\s+", " ", text).strip()
    if text.lower() in ("nan", "none"):
        return ""
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def read_csv(path: Path) -> pd.DataFrame:
    # utf-8-sig strips the BOM some of the CSVs carry ("﻿record_id")
    return pd.read_csv(path, encoding="utf-8-sig", low_memory=False)


def to_int(value: Any) -> Optional[int]:
    try:
        if pd.isna(value):
            return None
        return int(float(value))
    except (TypeError, ValueError):
        return None


@dataclass
class LoadedCollection:
    spec: CollectionSpec
    df: Optional[pd.DataFrame] = None
    index: Any = None
    normalized: bool = True
    kg_ids: List[Optional[str]] = field(default_factory=list)
    topics: List[Optional[str]] = field(default_factory=list)
    error: Optional[str] = None

    @property
    def ready(self) -> bool:
        return self.index is not None and self.df is not None


class State:
    model = None
    model_error: Optional[str] = None
    collections: Dict[str, LoadedCollection] = {}


STATE = State()

# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------


def build_kg_id_map(spec: CollectionSpec) -> Dict[str, str]:
    path = NODES_DIR / spec.kg_csv
    if not path.exists():
        log.warning("KG node file missing for %s: %s", spec.name, path)
        return {}
    nodes = read_csv(path)
    mapping: Dict[str, str] = {}
    for kg_id, title in zip(nodes[spec.kg_id_col], nodes[spec.kg_title_col]):
        key = norm_title(title)
        if key and key not in mapping:
            mapping[key] = str(kg_id)
    return mapping


def load_topics(spec: CollectionSpec, df: pd.DataFrame) -> List[Optional[str]]:
    topics_path = NLP_DIR / "topics" / f"{spec.topic_prefix}_topics.csv"
    info_path = NLP_DIR / "topics" / f"{spec.topic_prefix}_topic_info.csv"
    if not topics_path.exists() or not info_path.exists():
        return [None] * len(df)

    info = read_csv(info_path)
    names = {}
    for tid, name in zip(info["Topic"], info["Name"]):
        if int(tid) == -1:
            continue  # outlier bucket, not a meaningful label
        # "76_iot_intrusion_threat_botnet" -> "iot, intrusion, threat, botnet"
        parts = str(name).split("_")[1:]
        names[int(tid)] = ", ".join(parts)

    doc_topics = read_csv(topics_path)[["record_id", "topic_id"]]
    by_record = dict(zip(doc_topics["record_id"].astype(str), doc_topics["topic_id"]))
    return [names.get(to_int(by_record.get(str(rid)))) for rid in df["record_id"]]


def load_collection(spec: CollectionSpec) -> LoadedCollection:
    import faiss  # imported lazily so /health still works if faiss is missing

    col = LoadedCollection(spec)
    index_path = FAISS_DIR / f"{spec.name}_index.bin"
    csv_path = NLP_DIR / "nlp_input" / spec.csv

    if not index_path.exists():
        col.error = (f"FAISS index not found at {index_path}. Copy the existing "
                     f"nlp/faiss/{spec.name}_index.bin from the machine that built it.")
        return col
    if not csv_path.exists():
        col.error = f"NLP input CSV not found at {csv_path}"
        return col

    df = read_csv(csv_path)
    index = faiss.read_index(str(index_path))

    if index.ntotal != len(df):
        col.error = (f"Row mismatch: {index_path.name} has {index.ntotal} vectors but "
                     f"{spec.csv} has {len(df)} rows. The index must be built from this CSV.")
        return col

    # all-MiniLM-L6-v2 emits unit vectors, so squared-L2 maps cleanly to cosine.
    # Verify on a sample instead of assuming.
    sample = np.vstack([index.reconstruct(i) for i in range(min(25, index.ntotal))])
    col.normalized = bool(np.allclose(np.linalg.norm(sample, axis=1), 1.0, atol=1e-2))

    kg_map = build_kg_id_map(spec)
    col.kg_ids = [kg_map.get(norm_title(t)) for t in df[spec.title_col]]
    col.topics = load_topics(spec, df)
    col.df = df
    col.index = index

    mapped = sum(1 for k in col.kg_ids if k)
    log.info("Loaded %-12s %6d vectors (dim %d) · %d mapped to KG ids · normalized=%s",
             spec.name, index.ntotal, index.d, mapped, col.normalized)
    return col


def load_model():
    try:
        from sentence_transformers import SentenceTransformer
        STATE.model = SentenceTransformer(MODEL_NAME)
        log.info("Embedding model loaded: %s", MODEL_NAME)
    except Exception as exc:  # noqa: BLE001
        STATE.model_error = f"{type(exc).__name__}: {exc}"
        log.error("Could not load embedding model %s: %s", MODEL_NAME, STATE.model_error)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    for name, spec in SPECS.items():
        try:
            STATE.collections[name] = load_collection(spec)
        except Exception as exc:  # noqa: BLE001
            STATE.collections[name] = LoadedCollection(spec, error=f"{type(exc).__name__}: {exc}")
        if STATE.collections[name].error:
            log.warning("%s unavailable: %s", name, STATE.collections[name].error)
    yield


app = FastAPI(title="SMART Semantic Retriever", version="1.0.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

CollectionName = Literal["publications", "patents", "grants", "theses", "all"]


class SearchRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    collection: CollectionName = "all"
    top_k: int = Field(5, ge=1, le=50)
    institution: Optional[str] = None   # exact or partial institution name
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    min_score: float = Field(0.0, ge=-1.0, le=1.0)


class SearchHit(BaseModel):
    record_id: str
    kg_id: Optional[str]
    collection: str
    title: str
    score: float
    snippet: str
    metadata: Dict[str, Any]


def embed(text: str) -> np.ndarray:
    if STATE.model is None:
        raise HTTPException(503, f"Embedding model not loaded: {STATE.model_error}")
    vec = STATE.model.encode([text], convert_to_numpy=True, normalize_embeddings=True)
    return vec.astype("float32")


def search_collection(col: LoadedCollection, qvec: np.ndarray, req: SearchRequest) -> List[SearchHit]:
    spec, df = col.spec, col.df
    filtered = bool(req.institution or req.year_from or req.year_to)
    # Flat index search is cheap (≤30k vectors); oversample when filtering.
    k = min(col.index.ntotal, max(req.top_k * 40, 400) if filtered else req.top_k * 3)
    distances, ids = col.index.search(qvec, k)

    inst_q = (req.institution or "").lower().strip()
    hits: List[SearchHit] = []
    for dist, row in zip(distances[0], ids[0]):
        if row < 0:
            continue
        r = df.iloc[int(row)]
        year = to_int(r.get("year"))
        institution = str(r.get(spec.institution_col) or "")

        if inst_q and inst_q not in institution.lower():
            continue
        if req.year_from and (year is None or year < req.year_from):
            continue
        if req.year_to and (year is None or year > req.year_to):
            continue

        d = float(dist)
        score = 1.0 - d / 2.0 if col.normalized else 1.0 / (1.0 + d)
        if score < req.min_score:
            continue

        snippet = ""
        for c in spec.snippet_cols:
            snippet = clean_snippet(r.get(c))
            if snippet:
                break

        metadata = {"institution": institution, "year": year, "topic": col.topics[int(row)]}
        for c in spec.extra_cols:
            v = r.get(c)
            metadata[c] = None if pd.isna(v) else str(v)

        hits.append(SearchHit(
            record_id=str(r.get("record_id")),
            kg_id=col.kg_ids[int(row)],
            collection=spec.name,
            title=clean_snippet(r.get(spec.title_col), 300),
            score=round(score, 4),
            snippet=snippet,
            metadata=metadata,
        ))
        if len(hits) >= req.top_k:
            break
    return hits


@app.get("/health")
def health():
    return {
        "status": "ok" if STATE.model is not None and any(c.ready for c in STATE.collections.values()) else "degraded",
        "model": MODEL_NAME,
        "model_error": STATE.model_error,
        "collections": {
            name: {"ready": c.ready,
                   "vectors": int(c.index.ntotal) if c.index is not None else 0,
                   "error": c.error}
            for name, c in STATE.collections.items()
        },
    }


@app.post("/search", response_model=List[SearchHit])
def search(req: SearchRequest):
    names = list(SPECS) if req.collection == "all" else [req.collection]
    ready = [STATE.collections[n] for n in names if n in STATE.collections and STATE.collections[n].ready]
    if not ready:
        reasons = {n: STATE.collections.get(n).error if n in STATE.collections else "not loaded" for n in names}
        raise HTTPException(503, {"message": "No requested collection is available", "reasons": reasons})

    qvec = embed(req.text)
    hits: List[SearchHit] = []
    for col in ready:
        hits.extend(search_collection(col, qvec, req))
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[: req.top_k]
