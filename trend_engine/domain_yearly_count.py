import pandas as pd

print("Loading datasets...")

# =====================================================
# LOAD DATASETS
# =====================================================

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# =====================================================
# LOAD DOMAIN MAPPING
# =====================================================

topic_domains = pd.read_csv("trend_outputs/topic_domains.csv")
domain_labels = pd.read_csv("trend_outputs/domain_labels.csv")

# Keep only required columns
topic_domains = topic_domains[
    ["Topic", "domain_id", "source"]
]

domain_labels = domain_labels[
    ["domain_id", "domain_name"]
]

# =====================================================
# RENAME TOPIC COLUMN
# =====================================================

topic_domains.rename(
    columns={"Topic": "topic_id"},
    inplace=True
)

# =====================================================
# ADD DOMAIN IDs
# =====================================================

pub = pub.merge(
    topic_domains[topic_domains["source"] == "publication"],
    on="topic_id",
    how="left"
)

pat = pat.merge(
    topic_domains[topic_domains["source"] == "patent"],
    on="topic_id",
    how="left"
)

gra = gra.merge(
    topic_domains[topic_domains["source"] == "grant"],
    on="topic_id",
    how="left"
)

the = the.merge(
    topic_domains[topic_domains["source"] == "thesis"],
    on="topic_id",
    how="left"
)

# =====================================================
# ADD DOMAIN NAMES
# =====================================================

pub = pub.merge(domain_labels, on="domain_id", how="left")
pat = pat.merge(domain_labels, on="domain_id", how="left")
gra = gra.merge(domain_labels, on="domain_id", how="left")
the = the.merge(domain_labels, on="domain_id", how="left")

# =====================================================
# KEEP REQUIRED COLUMNS
# =====================================================

pub = pub[["domain_name", "year"]]
pat = pat[["domain_name", "year"]]
gra = gra[["domain_name", "year"]]
the = the[["domain_name", "year"]]

# =====================================================
# CLEAN YEARS
# =====================================================

for df in [pub, pat, gra, the]:

    df["year"] = pd.to_numeric(
        df["year"],
        errors="coerce"
    )

    df.dropna(subset=["year"], inplace=True)

    df["year"] = df["year"].astype(int)

    df = df[
        (df["year"] >= 2019) &
        (df["year"] <= 2025)
    ]

# =====================================================
# FILTER YEARS
# =====================================================

pub = pub[
    (pub["year"] >= 2019) &
    (pub["year"] <= 2025)
]

pat = pat[
    (pat["year"] >= 2019) &
    (pat["year"] <= 2025)
]

gra = gra[
    (gra["year"] >= 2019) &
    (gra["year"] <= 2025)
]

the = the[
    (the["year"] >= 2019) &
    (the["year"] <= 2025)
]

# =====================================================
# COUNT PUBLICATIONS
# =====================================================

pub_count = (
    pub.groupby(
        ["domain_name", "year"]
    )
    .size()
    .reset_index(name="publications")
)

# =====================================================
# COUNT PATENTS
# =====================================================

pat_count = (
    pat.groupby(
        ["domain_name", "year"]
    )
    .size()
    .reset_index(name="patents")
)

# =====================================================
# COUNT GRANTS
# =====================================================

gra_count = (
    gra.groupby(
        ["domain_name", "year"]
    )
    .size()
    .reset_index(name="grants")
)

# =====================================================
# COUNT THESES
# =====================================================

the_count = (
    the.groupby(
        ["domain_name", "year"]
    )
    .size()
    .reset_index(name="theses")
)

print("\nPublication Counts")
print(pub_count.head())

print("\nPatent Counts")
print(pat_count.head())

print("\nGrant Counts")
print(gra_count.head())

print("\nThesis Counts")
print(the_count.head())

# =====================================================
# MERGE ALL COUNTS
# =====================================================

final = pub_count.merge(
    pat_count,
    on=["domain_name", "year"],
    how="outer"
)

final = final.merge(
    gra_count,
    on=["domain_name", "year"],
    how="outer"
)

final = final.merge(
    the_count,
    on=["domain_name", "year"],
    how="outer"
)

# =====================================================
# FILL MISSING VALUES
# =====================================================

final = final.fillna(0)

# =====================================================
# CONVERT TO INTEGER
# =====================================================

for col in [
    "publications",
    "patents",
    "grants",
    "theses"
]:
    final[col] = final[col].astype(int)

# =====================================================
# TOTAL RESEARCH OUTPUT
# =====================================================

final["total"] = (
    final["publications"]
    + final["patents"]
    + final["grants"]
    + final["theses"]
)

# =====================================================
# SORT
# =====================================================

final = final.sort_values(
    ["domain_name", "year"]
).reset_index(drop=True)

# =====================================================
# SAVE
# =====================================================

import os

os.makedirs(
    "trend_engine/outputs",
    exist_ok=True
)

final.to_csv(
    "trend_engine/outputs/domain_yearly_counts.csv",
    index=False
)

# =====================================================
# DISPLAY
# =====================================================

print("\nDomain-Year Counts\n")
print(final.head(20))

print("\nSaved to:")
print("trend_engine/outputs/domain_yearly_counts.csv")