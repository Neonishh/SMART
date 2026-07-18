import pandas as pd

print("Loading datasets...")

# =====================================================
# LOAD DATASETS
# =====================================================

pub = pd.read_csv("Final csvs/publications_processed.csv")
thesis = pd.read_csv("Final csvs/theses_processed.csv")

# =====================================================
# CLEAN COLUMN NAMES
# =====================================================

pub.columns = pub.columns.str.strip()
thesis.columns = thesis.columns.str.strip()

print("\nPublication Columns:")
print(pub.columns.tolist())

print("\nThesis Columns:")
print(thesis.columns.tolist())

# =====================================================
# SETTINGS
# =====================================================

START_YEAR = 2019
END_YEAR = 2025

# =====================================================
# YEAR FILTER
# =====================================================

pub["year"] = pd.to_numeric(
    pub["year"],
    errors="coerce"
)

thesis["year"] = pd.to_numeric(
    thesis["year"],
    errors="coerce"
)

pub = pub[
    (pub["year"] >= START_YEAR) &
    (pub["year"] <= END_YEAR)
].copy()

thesis = thesis[
    (thesis["year"] >= START_YEAR) &
    (thesis["year"] <= END_YEAR)
].copy()

print(f"\nPublications (2019-2025): {len(pub)}")
print(f"Theses (2019-2025): {len(thesis)}")

# =====================================================
# REMOVE DUPLICATE PUBLICATIONS
# =====================================================

pub = pub.drop_duplicates(
    subset=[
        "title",
        "institution"
    ]
)

# =====================================================
# CITATIONS
# =====================================================

if "citations" not in pub.columns:

    pub["citations"] = 0

pub["citations"] = pd.to_numeric(
    pub["citations"],
    errors="coerce"
).fillna(0)

# =====================================================
# BAD RESEARCHER NAMES
# =====================================================

bad_names = [

    "",

    "unknown",

    "nan",

    "none"

]

# =====================================================
# PUBLICATIONS
# =====================================================

pub["authors"] = (
    pub["authors"]
    .fillna("")
    .astype(str)
)

pub_exp = pub.assign(

    researcher=pub["authors"].str.split(";")

).explode("researcher")

pub_exp["researcher"] = (

    pub_exp["researcher"]

    .str.replace(".", "", regex=False)

    .str.replace(",", "", regex=False)

    .str.replace("  ", " ", regex=False)

    .str.strip()

)

pub_exp = pub_exp[
    ~pub_exp["researcher"]
    .str.lower()
    .isin(bad_names)
]

publication_df = (

    pub_exp

    .groupby(

        [

            "researcher",

            "institution"

        ],

        as_index=False

    )

    .agg(

        publications=("title", "count"),

        citations=("citations", "sum")

    )

)

publication_df["theses"] = 0

print(
    "\nUnique Publication Researchers:",
    len(publication_df)
)

# =====================================================
# THESIS
# =====================================================

researcher_col = (

    "researcher"

    if "researcher" in thesis.columns

    else "author"

)

thesis["researcher"] = (

    thesis[researcher_col]

    .fillna("")

    .astype(str)

    .str.replace(".", "", regex=False)

    .str.replace(",", "", regex=False)

    .str.replace("  ", " ", regex=False)

    .str.strip()

)

thesis = thesis[
    ~thesis["researcher"]
    .str.lower()
    .isin(bad_names)
]

thesis_df = (

    thesis

    .groupby(

        [

            "researcher",

            "institution"

        ],

        as_index=False

    )

    .agg(

        theses=("researcher", "count")

    )

)

thesis_df["publications"] = 0
thesis_df["citations"] = 0

print(
    "Unique Thesis Researchers:",
    len(thesis_df)
)

# =====================================================
# MERGE PUBLICATIONS + THESIS
# =====================================================

combined = pd.concat(
    [
        publication_df,
        thesis_df
    ],
    ignore_index=True
)

combined = (
    combined
    .groupby(
        [
            "researcher",
            "institution"
        ],
        as_index=False
    )
    .sum()
)

print("\nTotal Researchers :", len(combined))

# =====================================================
# RESEARCH SCORE
# =====================================================

combined["research_score"] = (

      (combined["publications"] * 2)

    + (combined["theses"] * 3)

    + (combined["citations"] / 20)

).round(2)

# =====================================================
# SORT
# =====================================================

combined = combined.sort_values(
    "research_score",
    ascending=False
).reset_index(drop=True)

# =====================================================
# RANK
# =====================================================

combined.insert(
    0,
    "rank",
    range(1, len(combined) + 1)
)

# =====================================================
# REORDER COLUMNS
# =====================================================

combined = combined[
    [
        "rank",
        "researcher",
        "institution",
        "publications",
        "theses",
        "citations",
        "research_score"
    ]
]

# =====================================================
# STATISTICS
# =====================================================

print("\n===================================")
print("TOP RESEARCHERS")
print("===================================\n")

print(combined.head(20).to_string(index=False))

print("\n-----------------------------------")

print("Researchers with Publications :",
      (combined["publications"] > 0).sum())

print("Researchers with Thesis :",
      (combined["theses"] > 0).sum())

print("Highest Research Score :",
      combined["research_score"].max())

# =====================================================
# SAVE
# =====================================================

output = "trend_engine/outputs/top_researchers.csv"

combined.to_csv(
    output,
    index=False
)

print("\nSaved to:")
print(output)

# =====================================================
# INSTITUTION-WISE TOP RESEARCHERS
# =====================================================

institution_top = (

    combined

    .sort_values(
        [
            "institution",
            "research_score"
        ],
        ascending=[True, False]
    )

    .groupby("institution")

    .head(10)

    .reset_index(drop=True)

)

institution_top["rank"] = (

    institution_top

    .groupby("institution")

    .cumcount()

    + 1

)

institution_top = institution_top[
    [
        "institution",
        "rank",
        "researcher",
        "publications",
        "theses",
        "citations",
        "research_score"
    ]
]

output2 = "trend_engine/outputs/institution_top_researchers.csv"

institution_top.to_csv(
    output2,
    index=False
)

print("\n==========================================")
print("TOP RESEARCHERS BY INSTITUTION")
print("==========================================")

for inst in institution_top["institution"].unique()[:5]:

    print(f"\n{inst}")
    print("-" * 60)

    print(

        institution_top[
            institution_top["institution"] == inst
        ].head(3).to_string(index=False)

    )

print("\nSaved to:")
print(output2)

# =====================================================
# THESIS-ONLY RESEARCHERS
# =====================================================

thesis_only = thesis_df.copy()

thesis_only["research_score"] = (
    thesis_only["theses"] * 3
).round(2)

thesis_only = thesis_only.sort_values(
    "research_score",
    ascending=False
).reset_index(drop=True)

thesis_only.insert(
    0,
    "rank",
    range(1, len(thesis_only) + 1)
)

thesis_only = thesis_only[
    [
        "rank",
        "researcher",
        "institution",
        "theses",
        "research_score"
    ]
]

output3 = "trend_engine/outputs/top_thesis_researchers.csv"

thesis_only.to_csv(
    output3,
    index=False
)

print("\n==========================================")
print("TOP THESIS RESEARCHERS")
print("==========================================")

print(
    thesis_only.head(20).to_string(index=False)
)

print("\nSaved to:")
print(output3)

# =====================================================
# INSTITUTION-WISE TOP THESIS RESEARCHERS
# =====================================================

inst_thesis = (

    thesis_only

    .sort_values(
        [
            "institution",
            "research_score"
        ],
        ascending=[True, False]
    )

    .groupby("institution")

    .head(5)

    .reset_index(drop=True)

)

inst_thesis["rank"] = (

    inst_thesis

    .groupby("institution")

    .cumcount()

    + 1

)

inst_thesis = inst_thesis[
    [
        "institution",
        "rank",
        "researcher",
        "theses",
        "research_score"
    ]
]

output4 = "trend_engine/outputs/institution_top_thesis_researchers.csv"

inst_thesis.to_csv(
    output4,
    index=False
)

print("\n==========================================")
print("TOP THESIS RESEARCHERS BY INSTITUTION")
print("==========================================")

for inst in inst_thesis["institution"].unique()[:5]:

    print(f"\n{inst}")
    print("-" * 60)

    print(

        inst_thesis[
            inst_thesis["institution"] == inst
        ].head(3).to_string(index=False)

    )

print("\nSaved to:")
print(output4)

# =====================================================
# SUMMARY
# =====================================================

print("\n==========================================")
print("ALL FILES GENERATED SUCCESSFULLY")
print("==========================================")

print(f"1. {output}")
print(f"2. {output2}")
print(f"3. {output3}")
print(f"4. {output4}")