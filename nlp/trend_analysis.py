import pandas as pd

df = pd.read_csv("topics/publication_topics.csv")

# Keep all topics including outliers
print("Documents:", len(df))
print("Topics:", df["topic_id"].nunique())

