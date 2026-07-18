import pandas as pd

from institution_normalizer import normalize

# ==========================================================
# LOAD DATA
# ==========================================================

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# ==========================================================
# NORMALIZE INSTITUTION NAMES
# ==========================================================

pub["institution"] = normalize(pub["institution"])
gra["institution"] = normalize(gra["institution"])
the["institution"] = normalize(the["institution"])

pat["Institution"] = normalize(pat["Institution"])
pat.rename(columns={"Institution": "institution"}, inplace=True)

# ==========================================================
# LOAD TOPIC -> DOMAIN MAP
# ==========================================================

topic_domain = pd.read_csv("trend_outputs/topic_domains.csv")

topic_domain = topic_domain.rename(
    columns={
        "Topic": "topic_id"
    }
)

topic_domain = topic_domain[
    ["topic_id", "domain_id"]
]

# ==========================================================
# LOAD DOMAIN LABELS
# ==========================================================

domain_labels = pd.read_csv(
    "trend_outputs/domain_labels.csv"
)

topic_domain = topic_domain.merge(
    domain_labels,
    on="domain_id",
    how="left"
)

topic_domain = topic_domain[
    ["topic_id", "domain_name"]
]

# ==========================================================
# ADD DOMAIN NAME TO EACH DATASET
# ==========================================================

pub = pub.merge(
    topic_domain,
    on="topic_id",
    how="left"
)

pat = pat.merge(
    topic_domain,
    on="topic_id",
    how="left"
)

gra = gra.merge(
    topic_domain,
    on="topic_id",
    how="left"
)

the = the.merge(
    topic_domain,
    on="topic_id",
    how="left"
)

# ==========================================================
# COUNT PUBLICATIONS
# ==========================================================

pub_count = (
    pub.groupby(
        ["institution", "domain_name"]
    )
    .size()
    .reset_index(name="publications")
)

# ==========================================================
# COUNT PATENTS
# ==========================================================

pat_count = (
    pat.groupby(
        ["institution", "domain_name"]
    )
    .size()
    .reset_index(name="patents")
)

# ==========================================================
# COUNT GRANTS
# ==========================================================

gra_count = (
    gra.groupby(
        ["institution", "domain_name"]
    )
    .size()
    .reset_index(name="grants")
)

# ==========================================================
# COUNT THESES
# ==========================================================

the_count = (
    the.groupby(
        ["institution", "domain_name"]
    )
    .size()
    .reset_index(name="theses")
)

# ==========================================================
# MERGE EVERYTHING
# ==========================================================

final = pub_count

final = final.merge(
    pat_count,
    on=["institution", "domain_name"],
    how="outer"
)

final = final.merge(
    gra_count,
    on=["institution", "domain_name"],
    how="outer"
)

final = final.merge(
    the_count,
    on=["institution", "domain_name"],
    how="outer"
)

final = final.fillna(0)

# ==========================================================
# TOTAL RESEARCH
# ==========================================================

final["total"] = (
      final["publications"]
    + final["patents"]
    + final["grants"]
    + final["theses"]
)

# ==========================================================
# REMOVE UNKNOWN DOMAINS
# ==========================================================

final = final[
    final["domain_name"].notna()
]

# Optional: remove BERTopic outlier topic if it appears
final = final[
    final["domain_name"] != "-1"
]

# ==========================================================
# SORT
# ==========================================================

final = final.sort_values(
    ["institution", "total"],
    ascending=[True, False]
)

# ==========================================================
# SAVE
# ==========================================================

final.to_csv(
    "trend_outputs/institution_domains.csv",
    index=False
)

# ==========================================================
# DISPLAY
# ==========================================================

print("\nInstitution Domain Analytics\n")

print(final.head(40))

print("\nSaved to:")
print("trend_outputs/institution_domains.csv")