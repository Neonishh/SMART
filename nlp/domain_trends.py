import pandas as pd

# =====================================================
# LOAD FILES
# =====================================================

domains = pd.read_csv(
    "trend_outputs/topic_domains.csv"
)

labels = pd.read_csv(
    "trend_outputs/domain_labels.csv"
)

pub = pd.read_csv(
    "trend_outputs/topic_growth.csv"
)

pat = pd.read_csv(
    "trend_outputs/patent_trends.csv"
)

gra = pd.read_csv(
    "trend_outputs/grant_trends.csv"
)

the = pd.read_csv(
    "trend_outputs/thesis_trends.csv"
)

# =====================================================
# FIX DOMAIN FILE
# =====================================================

domains = domains.rename(
    columns={
        "Topic": "topic_id"
    }
)

# Keep only needed columns
domains = domains[
    ["topic_id", "domain_id"]
]

# =====================================================
# MERGE DOMAIN IDS
# =====================================================

pub = pub.merge(
    domains,
    on="topic_id",
    how="left"
)

pat = pat.merge(
    domains,
    on="topic_id",
    how="left"
)

gra = gra.merge(
    domains,
    on="topic_id",
    how="left"
)

the = the.merge(
    domains,
    on="topic_id",
    how="left"
)

# =====================================================
# PUBLICATION DOMAIN SCORE
# =====================================================

pub_score = (
    pub.groupby("domain_id")["growth_percent"]
    .mean()
    .reset_index()
    .rename(
        columns={
            "growth_percent":
            "publication_score"
        }
    )
)

# =====================================================
# PATENT DOMAIN SCORE
# =====================================================

pat_score = (
    pat.groupby("domain_id")["trend_score"]
    .mean()
    .reset_index()
    .rename(
        columns={
            "trend_score":
            "patent_score"
        }
    )
)

# =====================================================
# GRANT DOMAIN SCORE
# =====================================================

gra_score = (
    gra.groupby("domain_id")["trend_score"]
    .mean()
    .reset_index()
    .rename(
        columns={
            "trend_score":
            "grant_score"
        }
    )
)

# =====================================================
# THESIS DOMAIN SCORE
# =====================================================

the_score = (
    the.groupby("domain_id")["trend_score"]
    .mean()
    .reset_index()
    .rename(
        columns={
            "trend_score":
            "thesis_score"
        }
    )
)

# =====================================================
# MERGE ALL SCORES
# =====================================================

final = pub_score

final = final.merge(
    pat_score,
    on="domain_id",
    how="outer"
)

final = final.merge(
    gra_score,
    on="domain_id",
    how="outer"
)

final = final.merge(
    the_score,
    on="domain_id",
    how="outer"
)

final = final.fillna(0)

# =====================================================
# OVERALL TREND SCORE
# =====================================================

final["overall_score"] = (
      0.40 * final["publication_score"]
    + 0.30 * final["patent_score"]
    + 0.20 * final["grant_score"]
    + 0.10 * final["thesis_score"]
)

# =====================================================
# ADD DOMAIN NAMES
# =====================================================

final = final.merge(
    labels,
    on="domain_id",
    how="left"
)

# =====================================================
# SORT
# =====================================================

final = final.sort_values(
    "overall_score",
    ascending=False
)

# =====================================================
# SAVE
# =====================================================

final.to_csv(
    "trend_outputs/domain_trends.csv",
    index=False
)

# =====================================================
# DISPLAY RESULTS
# =====================================================

print("\nTop Emerging Domains\n")

print(
    final[
        [
            "domain_name",
            "publication_score",
            "patent_score",
            "grant_score",
            "thesis_score",
            "overall_score"
        ]
    ].head(25)
)

print(
    "\nSaved: trend_outputs/domain_trends.csv"
)
