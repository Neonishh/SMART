import numpy as np
import faiss

print("Loading embeddings...")

embeddings = np.load(
    "embeddings/publications_embeddings.npy"
)

print("Shape:", embeddings.shape)

embeddings = embeddings.astype("float32")

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

print("Building index...")

index.add(embeddings)

print("Vectors indexed:", index.ntotal)

faiss.write_index(
    index,
    "faiss/publications_index.bin"
)

print("Saved successfully!")