import pandas as pd
from bertopic import BERTopic

print("Loading publications...")

df = pd.read_csv(
    "nlp_input/publications_nlp_input.csv"
)

# Take only first 1000 records
docs = df["clean_text"].dropna().astype(str).head(1000).tolist()

print("Documents:", len(docs))

print("Training BERTopic...")

topic_model = BERTopic(
    verbose=True,
    calculate_probabilities=False
)

topics, probs = topic_model.fit_transform(docs)

print("\nNumber of topics:")
print(len(set(topics)))

topic_info = topic_model.get_topic_info()

print("\nTop topics:")
print(topic_info.head(10))

topic_info.to_csv(
    "publication_topics_test.csv",
    index=False
)

print("\nSaved successfully!")