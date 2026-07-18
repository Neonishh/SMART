import pandas as pd
from bertopic import BERTopic

print("Loading publications...")

# Load data
df = pd.read_csv("nlp_input/publications_nlp_input.csv")

# Use clean text
docs = df["clean_text"].fillna("").astype(str).tolist()

print(f"Documents: {len(docs)}")

# Create BERTopic model
topic_model = BERTopic(
    language="english",
    calculate_probabilities=False,
    verbose=True
)

print("Training BERTopic...")
topics, probs = topic_model.fit_transform(docs)

print("Saving outputs...")

# Add topic assignment to each publication
df["topic_id"] = topics

# Save publication-topic mapping
df.to_csv(
    "topics/publication_topics.csv",
    index=False
)

# Save topic summary information
topic_info = topic_model.get_topic_info()

topic_info.to_csv(
    "topics/publication_topic_info.csv",
    index=False
)

print("\nDone!")
print(f"Number of topics: {len(topic_info)}")