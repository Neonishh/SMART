import pandas as pd
from bertopic import BERTopic

print("Loading grants...")

df = pd.read_csv("nlp_input/grants_nlp_input.csv")

docs = df["clean_text"].fillna("").astype(str).tolist()

print(f"Documents: {len(docs)}")

topic_model = BERTopic(
    language="english",
    calculate_probabilities=False,
    verbose=True
)

topics, probs = topic_model.fit_transform(docs)

df["topic_id"] = topics

df.to_csv(
    "topics/grant_topics.csv",
    index=False
)

topic_info = topic_model.get_topic_info()

topic_info.to_csv(
    "topics/grant_topic_info.csv",
    index=False
)

print("Done!")
print("Topics:", len(topic_info))