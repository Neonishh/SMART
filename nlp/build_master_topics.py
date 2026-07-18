import pandas as pd

pub = pd.read_csv("topics/publication_topic_info.csv")
pat = pd.read_csv("topics/patent_topic_info.csv")
gra = pd.read_csv("topics/grant_topic_info.csv")
the = pd.read_csv("topics/thesis_topic_info.csv")

pub["source"] = "publication"
pat["source"] = "patent"
gra["source"] = "grant"
the["source"] = "thesis"

all_topics = pd.concat(
    [pub, pat, gra, the],
    ignore_index=True
)

all_topics = all_topics[
    all_topics["Topic"] != -1
]

all_topics.to_csv(
    "trend_outputs/all_topics.csv",
    index=False
)

print("Topics:", len(all_topics))