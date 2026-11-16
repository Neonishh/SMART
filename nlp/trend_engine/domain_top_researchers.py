from pathlib import Path

import pandas as pd


SCRIPT_DIR = Path(__file__).resolve().parent
NLP_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = NLP_DIR.parent


def project_path(*parts):
    return PROJECT_ROOT.joinpath(*parts)


def nlp_path(*parts):
    return NLP_DIR.joinpath(*parts)

print("Loading data...")

# =====================================================
# LOAD DATA
# =====================================================

topics = pd.read_csv(nlp_path("topics", "publication_topics.csv"))
pub = pd.read_csv(nlp_path("Final csvs", "publications_processed.csv"))
thesis = pd.read_csv(nlp_path("Final csvs", "theses_processed.csv"))

topics.columns = topics.columns.str.strip()
pub.columns = pub.columns.str.strip()
thesis.columns = thesis.columns.str.strip()
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
]

topic_domains = pd.read_csv(nlp_path("trend_outputs", "topic_domains.csv"))
domain_labels = pd.read_csv(nlp_path("trend_outputs", "domain_labels.csv"))

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

if "year" in thesis.columns:
    thesis["year"] = pd.to_numeric(thesis["year"], errors="coerce")
    thesis = thesis[
        (thesis["year"] >= START_YEAR) &
        (thesis["year"] <= END_YEAR)
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

# Classify publication types using the existing normalized venue labels,
# falling back to venue text when the processed dataset has no label.
def classify_venue(row):
    venue_type_value = row.get("venue_type", "")
    venue_type = "" if pd.isna(venue_type_value) else str(venue_type_value).strip().lower()
    if venue_type in {"journal", "conference"}:
        return venue_type

    venue_value = row.get("venue", "")
    venue = "" if pd.isna(venue_value) else str(venue_value).strip().lower()
    if any(word in venue for word in (
        "journal", "transactions", "letters", "review", "magazine",
        "bulletin", "annals", "nature", "science", "cell", "lancet",
        "ieee access", "acm computing surveys", "expert systems"
    )):
        return "journal"
    if any(word in venue for word in (
        "conference", "proceedings", "symposium", "workshop", "congress",
        "meeting", "icml", "neurips", "cvpr", "iccv", "eccv", "ijcai",
        "aaai", "acl", "emnlp", "icra", "iros", "sigcomm", "sigir", "kdd"
    )):
        return "conference"
    return "unknown"

pub["venue_type"] = pub.apply(classify_venue, axis=1)
pub["paper_citations"] = pub["citations"]

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

        citations=("citations", "sum"),

        h_index=("paper_citations", lambda values: sum(
            citation >= rank
            for rank, citation in enumerate(sorted(values, reverse=True), start=1)
        )),

        journal_papers=("venue_type", lambda values: (values == "journal").sum()),

        conference_papers=("venue_type", lambda values: (values == "conference").sum())

    )

)

print()

print("Columns after groupby:")

print(researcher_domain.columns.tolist())

print()

print("Unique researcher-domain rows:", len(researcher_domain))

# =====================================================
# THESIS GUIDANCE
# =====================================================

thesis_researcher_col = "researcher" if "researcher" in thesis.columns else "author"
thesis["researcher"] = thesis[thesis_researcher_col].fillna("").astype(str).str.strip()
thesis["institution"] = thesis["institution"].fillna("Unknown").astype(str).str.strip()
thesis_counts = (
    thesis[thesis["researcher"] != ""]
    .groupby(["researcher", "institution"], as_index=False)
    .agg(theses=("title", "count"))
)

researcher_domain = researcher_domain.merge(
    thesis_counts,
    on=["researcher", "institution"],
    how="left"
)
researcher_domain["theses"] = researcher_domain["theses"].fillna(0).astype(int)

# UGC-style baseline: 8 per journal paper, 2.5 per conference paper,
# 3 per thesis record, plus 2 points per h-index.
# Patent and grant points are omitted because the current source data does
# not link those records to individual researchers.
researcher_domain["research_score"] = (
    8 * researcher_domain["journal_papers"]
    + 2.5 * researcher_domain["conference_papers"]
    + 3 * researcher_domain["theses"]
    + 2 * researcher_domain["h_index"]
).round(2)

researcher_domain["score_method"] = "UGC-style baseline (journal/conference/thesis + 2x h-index)"
researcher_domain["score_data_limitations"] = "Researcher-linked patents and grants unavailable; thesis count treated as awarded"

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

                "journal_papers",

                "conference_papers",

                "theses",

                "citations",

                "h_index",

                "research_score",

                "score_method",

                "score_data_limitations"

            ]

        ].to_string(index=False)

    )

# =====================================================
# SAVE
# =====================================================

output = project_path("nlp", "trend_engine", "outputs", "domain_top_researchers.csv")

domain_top.to_csv(

    str(output),

    index=False

)

print()

print("=" * 70)

print("Total Domains :", domain_top["domain"].nunique())

print("Total Rows    :", len(domain_top))

print("Saved To      :", output)
