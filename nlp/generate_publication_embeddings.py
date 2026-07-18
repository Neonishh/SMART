from sentence_transformers import SentenceTransformer
import pandas as pd
import numpy as np

print("Loading data...")

df = pd.read_csv(
    "nlp_input/theses_nlp_input.csv"
)


texts = df["clean_text"].fillna("").astype(str).tolist()

print("Documents:", len(texts))

print("Loading model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Generating embeddings...")

embeddings = model.encode(
    texts,
    batch_size=64,
    show_progress_bar=True,
    convert_to_numpy=True
)

print("Shape:", embeddings.shape)

np.save(
    "embeddings/theses_embeddings.npy",
    embeddings
)

print("Saved successfully!")