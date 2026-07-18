import numpy as np
import faiss
import sys

name = sys.argv[1]

print(f"\nLoading {name} embeddings...")

embeddings = np.load(
    f"embeddings/{name}_embeddings.npy"
)

embeddings = embeddings.astype("float32")

print("Shape:", embeddings.shape)

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

print("Building index...")

index.add(embeddings)

print("Vectors indexed:", index.ntotal)

faiss.write_index(
    index,
    f"faiss/{name}_index.bin"
)

print("Saved successfully!")