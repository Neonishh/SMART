from institution_normalizer import normalize
import pandas as pd

# ======================================
# LOAD DATA
# ======================================

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# ======================================
# NORMALIZE INSTITUTION NAMES
# ======================================

pub["institution"] = normalize(pub["institution"])

gra["institution"] = normalize(gra["institution"])

the["institution"] = normalize(the["institution"])

pat["Institution"] = normalize(pat["Institution"])
pat.rename(columns={"Institution": "institution"}, inplace=True)

# ======================================
# COUNT PUBLICATIONS
# ======================================

pub_topics = (
    pub.groupby(["institution", "topic_id"])
       .size()
       .reset_index(name="publications")
)

# ======================================
# COUNT PATENTS
# ======================================

pat_topics = (
    pat.groupby(["institution", "topic_id"])
       .size()
       .reset_index(name="patents")
)

# ======================================
# COUNT GRANTS
# ======================================

gra_topics = (
    gra.groupby(["institution", "topic_id"])
       .size()
       .reset_index(name="grants")
)

# ======================================
# COUNT THESES
# ======================================

the_topics = (
    the.groupby(["institution", "topic_id"])
       .size()
       .reset_index(name="theses")
)

# ======================================
# MERGE
# ======================================

final = (
    pub_topics
    .merge(pat_topics, on=["institution","topic_id"], how="outer")
    .merge(gra_topics, on=["institution","topic_id"], how="outer")
    .merge(the_topics, on=["institution","topic_id"], how="outer")
)

final = final.fillna(0)

for c in ["publications","patents","grants","theses"]:
    final[c] = final[c].astype(int)

final["total"] = (
    final["publications"]
    + final["patents"]
    + final["grants"]
    + final["theses"]
)

final = final.sort_values(
    ["institution","total"],
    ascending=[True,False]
)

final.to_csv(
    "trend_outputs/institution_topics.csv",
    index=False
)

print("\nInstitution Topic Analytics\n")
print(final.head(30))

print("\nSaved to:")
print("trend_outputs/institution_topics.csv")