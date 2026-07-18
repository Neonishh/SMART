import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np

df = pd.read_csv(
    "trend_outputs/all_topics.csv"
)

# combine topic information
texts = (
    df["Name"].fillna("")
    + " "
    + df["Representation"].fillna("")
)

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

embeddings = model.encode(
    texts.tolist(),
    show_progress_bar=True
)

np.save(
    "trend_outputs/topic_embeddings.npy",
    embeddings
)

print(
    "Embeddings shape:",
    embeddings.shape
)