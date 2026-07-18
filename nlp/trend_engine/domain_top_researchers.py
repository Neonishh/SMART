import pandas as pd

print("Loading data...")

# =====================================================
# LOAD DATA
# =====================================================

topics = pd.read_csv("topics/publication_topics.csv")
pub = pd.read_csv("Final csvs/publications_processed.csv")

topics.columns = topics.columns.str.strip()
pub.columns = pub.columns.str.strip()
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
        "year"
    ]
]

topic_domains = pd.read_csv("trend_outputs/topic_domains.csv")
domain_labels = pd.read_csv("trend_outputs/domain_labels.csv")

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

pub["domain"] = pub[domain_col]

# =====================================================
# GROUP
# =====================================================

researcher_domain = (

    pub

    .groupby(
        [
            "researcher",
            "institution",
            "domain"
        ],
        as_index=False
    )

    .agg(

        publications=("title", "count"),

        citations=("citations", "sum")

    )

)

print()

print("Columns after groupby:")

print(researcher_domain.columns.tolist())

print()

print("Unique researcher-domain rows:", len(researcher_domain))

# =====================================================
# SCORE
# =====================================================

researcher_domain["research_score"] = (

    2 * researcher_domain["publications"]

    +

    researcher_domain["citations"] / 50

).round(2)

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