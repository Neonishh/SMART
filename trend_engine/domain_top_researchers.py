import pandas as pd

print("Loading data...")

# =====================================================
# LOAD DATA
# =====================================================


topics = pd.read_csv("nlp/topics/publication_topics.csv")
pub = pd.read_csv("nlp/Final csvs/publications_processed.csv")

topic_domains = pd.read_csv("nlp/trend_outputs/topic_domains.csv")
domain_labels = pd.read_csv("nlp/trend_outputs/domain_labels.csv")
# ==========================================
# KEEP ONLY REQUIRED COLUMNS
# ==========================================

topics = topics[
    [
        "title",
        "institution",
        "topic_id"
    ]
]

pub = pub[
    [
        "title",
        "authors",
        "institution",
        "citations",
        "year",
        "venue"
    ]
].copy()
topic_domains = pd.read_csv("nlp/trend_outputs/topic_domains.csv")
domain_labels = pd.read_csv("nlp/trend_outputs/domain_labels.csv")

topic_domains = topic_domains[
    [
        "Topic",
        "domain_id",
        "source"
    ]
]

topic_domains.rename(
    columns={"Topic":"topic_id"},
    inplace=True
)

domain_labels = domain_labels[
    [
        "domain_id",
        "domain_name"
    ]
]
topics = topics.merge(

    topic_domains[
        topic_domains["source"]=="publication"
    ],

    on="topic_id",

    how="left"

)

topics = topics.merge(

    domain_labels,

    on="domain_id",

    how="left"

)
pub = pub.merge(

    topics[
        [
            "title",
            "domain_name"
        ]
    ],

    on="title",

    how="left"

)


# Clean column names
pub.columns = pub.columns.str.strip()

print("Publication columns:", pub.columns.tolist())
print("Total publications:", len(pub))

# =====================================================
# YEAR FILTER
# =====================================================

START_YEAR = 2019
END_YEAR = 2025

pub["year"] = pd.to_numeric(pub["year"], errors="coerce")

pub = pub[
    (pub["year"] >= START_YEAR) &
    (pub["year"] <= END_YEAR)
].copy()

print("After year filter:", len(pub))

# =====================================================
# FIND DOMAIN COLUMN
# =====================================================

domain_col = None

# NOTE: "domain_name" added (and checked first) since that's the
# actual column produced by the merge above. This was the bug -
# none of the other candidate names ever existed in `pub`, so
# domain_col stayed None and the script crashed with
# "No domain column found!"
for col in ["domain_name", "domain", "subdomain", "topic_label", "topic"]:
    if col in pub.columns:
        domain_col = col
        break

if domain_col is None:
    raise ValueError(
        "No domain column found!"
    )

print(f"Using domain column: {domain_col}")
print()
print("First 20 domain values:")
print(pub[domain_col].drop_duplicates().head(20).to_list())

# =====================================================
# CLEAN DATA
# =====================================================

pub["institution"] = (
    pub["institution"]
    .fillna("Unknown")
    .astype(str)
    .str.strip()
)

pub["domain"] = pub["domain_name"]


pub["authors"] = (
    pub["authors"]
    .fillna("")
    .astype(str)
)

# citations

if "citations" in pub.columns:

    pub["citations"] = (
        pd.to_numeric(pub["citations"], errors="coerce")
        .fillna(0)
    )

else:

    pub["citations"] = 0
# =====================================================
# CLASSIFY PUBLICATION VENUES
# =====================================================

import re

JOURNAL_KEYWORDS = [
    "journal", "transactions", "letters", "review",
    "reviews", "magazine", "bulletin", "annals",
    "nature", "ieee access", "acm computing surveys",
    "expert systems"
]

CONFERENCE_KEYWORDS = [
    "conference", "proceedings", "symposium",
    "workshop", "congress", "icml", "neurips",
    "cvpr", "iccv", "eccv", "ijcai", "aaai",
    "acl", "emnlp", "icra", "iros",
    "sigcomm", "sigir", "kdd"
]


def classify_venue(venue):
    if pd.isna(venue):
        return "unclassified"

    venue = str(venue).lower().strip()

    for word in JOURNAL_KEYWORDS:
        if re.search(r"\b" + re.escape(word) + r"\b", venue):
            return "journal"

    for word in CONFERENCE_KEYWORDS:
        if re.search(r"\b" + re.escape(word) + r"\b", venue):
            return "conference"

    return "unclassified"


pub["kind"] = pub["venue"].apply(classify_venue)
# =====================================================
# EXPLODE AUTHORS
# =====================================================

pub["researcher"] = pub["authors"].str.split(";")

pub = pub.explode("researcher")

pub["researcher"] = (
    pub["researcher"]
    .astype(str)
    .str.strip()
)

# Remove invalid names

bad = [
    "",
    "unknown",
    "nan",
    "none"
]

pub = pub[
    ~pub["researcher"]
    .str.lower()
    .isin(bad)
].copy()

print("After explode:", len(pub))

# =====================================================
# CREATE STANDARD DOMAIN COLUMN
# =====================================================
# GROUP + SMART-ADAPTED UGC SCORING
# =====================================================

def calculate_h_index(citations):
    values = sorted(
        [
            max(0, int(c))
            for c in citations
            if pd.notna(c)
        ],
        reverse=True
    )

    return sum(
        c >= i
        for i, c in enumerate(values, start=1)
    )


# Exclude records without a mapped research domain
pub = pub[
    pub["domain"].notna()
    & pub["domain"].astype(str).str.strip().ne("")
].copy()

# Avoid counting the same publication twice for a researcher
pub = pub.drop_duplicates(
    subset=[
        "researcher",
        "institution",
        "domain",
        "title"
    ]
)

# Provisional journal score:
# 8 points per journal-classified publication.
# Conference points require additional eligibility data.
pub["journal_points"] = (
    (pub["kind"] == "journal").astype(int) * 8
)

pub["conference_points"] = 0.0

# Group researcher contributions within each domain
researcher_domain = (
    pub.groupby(
        ["researcher", "institution", "domain"],
        as_index=False
    )
    .agg(
        publications=("title", "count"),
        citations=("citations", "sum"),
        journal_publications=(
            "kind",
            lambda s: int((s == "journal").sum())
        ),
        conference_publications=(
            "kind",
            lambda s: int((s == "conference").sum())
        ),
        unclassified_publications=(
            "kind",
            lambda s: int((s == "unclassified").sum())
        ),
        journal_points=("journal_points", "sum"),
        conference_points=("conference_points", "sum"),
        h_index=("citations", calculate_h_index)
    )
)

# The domain dataset currently does not provide verified
# researcher-attributed patent, grant or thesis-guidance points.
researcher_domain["patent_points"] = 0.0
researcher_domain["grant_points"] = 0.0
researcher_domain["guidance_points"] = 0.0

researcher_domain["ugc_based_score"] = (
    researcher_domain[
        [
            "journal_points",
            "conference_points",
            "patent_points",
            "grant_points",
            "guidance_points"
        ]
    ].sum(axis=1)
).round(2)

# SMART-specific citation enhancement
researcher_domain["h_index_bonus"] = (
    2 * researcher_domain["h_index"]
)

researcher_domain["research_score"] = (
    researcher_domain["ugc_based_score"]
    + researcher_domain["h_index_bonus"]
).round(2)

researcher_domain["score_method"] = (
    "SMART-adapted UGC-inspired rubric + 2*h-index"
)

researcher_domain["score_period"] = "2019-2025"

print("\nDomain researcher scoring completed.")
print(
    researcher_domain[
        [
            "researcher",
            "domain",
            "journal_publications",
            "h_index",
            "ugc_based_score",
            "research_score"
        ]
    ].head(10).to_string(index=False)
)

# =====================================================
# SORT
# =====================================================

researcher_domain = researcher_domain.sort_values(

    [

        "domain",

        "research_score"

    ],

    ascending=[True, False]

)

# =====================================================
# TOP 5 PER DOMAIN
# =====================================================

domain_top = (

    researcher_domain

    .groupby(

        "domain",

        group_keys=False

    )

    .head(5)

    .reset_index(drop=True)

)

# =====================================================
# RANK
# =====================================================

domain_top["rank"] = (

    domain_top

    .groupby("domain")

    .cumcount()

    + 1

)

# =====================================================
# PREVIEW
# =====================================================

print()

print("=" * 70)

print("TOP RESEARCHERS PER DOMAIN")

print("=" * 70)

domains = domain_top["domain"].unique()[:5]

for d in domains:

    print()

    print(f"Domain : {d}")

    print("-" * 70)

    print(

        domain_top[

            domain_top["domain"] == d

        ][

            [

                "rank",

                "researcher",

                "institution",

                "publications",

                "citations",

                "research_score"

            ]

        ].to_string(index=False)

    )

# =====================================================
# SAVE
# =====================================================

output = "trend_engine/outputs/domain_top_researchers.csv"

domain_top.to_csv(

    output,

    index=False

)

print()

print("=" * 70)

print("Total Domains :", domain_top["domain"].nunique())

print("Total Rows    :", len(domain_top))

print("Saved To      :", output)