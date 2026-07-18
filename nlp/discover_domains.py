import pandas as pd
import numpy as np
from sklearn.cluster import KMeans

df = pd.read_csv(
    "trend_outputs/all_topics.csv"
)

embeddings = np.load(
    "trend_outputs/topic_embeddings.npy"
)

kmeans = KMeans(
    n_clusters=25,
    random_state=42
)

labels = kmeans.fit_predict(
    embeddings
)

df["domain_id"] = labels

print(
    "Domains discovered:",
    len(set(labels))
)

print(
    df["domain_id"].value_counts()
)

df.to_csv(
    "trend_outputs/topic_domains.csv",
    index=False
)