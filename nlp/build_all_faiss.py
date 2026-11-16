"""
Build all four FAISS indices for the Ask SMART chatbot in one go.

Does exactly what generate_publication_embeddings.py + build_faiss.py do
(same CSVs, same column, same model, same row order, IndexFlatL2),
just for every collection instead of one at a time.

Run from anywhere:
    python nlp/build_all_faiss.py

Output:
    nlp/embeddings/<name>_embeddings.npy
    nlp/faiss/<name>_index.bin
"""

import sys
import time
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

NLP_DIR = Path(__file__).resolve().parent
COLLECTIONS = ["publications", "patents", "grants", "theses"]

# Optional: build only some, e.g.  python nlp/build_all_faiss.py patents grants
selected = [c for c in sys.argv[1:] if c in COLLECTIONS] or COLLECTIONS

(NLP_DIR / "embeddings").mkdir(exist_ok=True)
(NLP_DIR / "faiss").mkdir(exist_ok=True)

print("Loading model all-MiniLM-L6-v2 (first run downloads ~90 MB)...")
model = SentenceTransformer("all-MiniLM-L6-v2")

total_start = time.time()
for name in selected:
    start = time.time()
    csv_path = NLP_DIR / "nlp_input" / f"{name}_nlp_input.csv"
    print(f"\n=== {name} ===")

    df = pd.read_csv(csv_path)
    texts = df["clean_text"].fillna("").astype(str).tolist()
    print(f"Documents: {len(texts)}")

    embeddings = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True,
    ).astype("float32")

    np.save(NLP_DIR / "embeddings" / f"{name}_embeddings.npy", embeddings)

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    faiss.write_index(index, str(NLP_DIR / "faiss" / f"{name}_index.bin"))

    print(f"Saved faiss/{name}_index.bin  ({index.ntotal} vectors, {time.time() - start:.0f}s)")

print(f"\nAll done in {time.time() - total_start:.0f}s. Start the retriever next:")
print("    uvicorn python_retriever.app:app --port 8001")
