import pandas as pd

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gr = pd.read_csv("topics/grant_topics.csv")
th = pd.read_csv("topics/thesis_topics.csv")

all_data = pd.concat([pub, pat, gr, th])

all_data.to_csv("trend_master.csv", index=False)

print(all_data.shape)