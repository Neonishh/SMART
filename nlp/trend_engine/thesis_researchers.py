import pandas as pd

print("Loading datasets...")

# =====================================================
# LOAD
# =====================================================
pub    = pd.read_csv("Final csvs/publications_processed.csv")
thesis = pd.read_csv("Final csvs/theses_processed.csv")

# =====================================================
# FIX — strip hidden whitespace from ALL column names
# =====================================================
pub.columns    = pub.columns.str.strip()
thesis.columns = thesis.columns.str.strip()

print(f"Publication columns : {pub.columns.tolist()}")
print(f"Thesis columns      : {thesis.columns.tolist()}")

# =====================================================
# ADD CITATIONS COLUMN IF MISSING
# =====================================================
if "citations" not in pub.columns:
    pub["citations"] = 0
    print("Note: No citations column — defaulting to 0")

# =====================================================
# FILTER YEARS (2019-2025)
# =====================================================
START_YEAR = 2019
END_YEAR   = 2025

pub["year"]    = pd.to_numeric(pub["year"],    errors="coerce")
thesis["year"] = pd.to_numeric(thesis["year"], errors="coerce")

pub    = pub[(pub["year"] >= START_YEAR)       & (pub["year"] <= END_YEAR)].copy()
thesis = thesis[(thesis["year"] >= START_YEAR) & (thesis["year"] <= END_YEAR)].copy()

print(f"\nPublications after year filter : {len(pub)}")
print(f"Theses after year filter       : {len(thesis)}")

# =====================================================
# BAD NAME LIST
# =====================================================
bad_names = ["", "unknown", "nan", "none"]

# =====================================================
# PUBLICATIONS — explode authors by semicolon
# =====================================================
pub["authors"] = pub["authors"].fillna("")

pub_exp = pub.assign(
    researcher=pub["authors"].str.split(";")
).explode("researcher")

pub_exp["researcher"] = pub_exp["researcher"].str.strip()

pub_exp = pub_exp[
    ~pub_exp["researcher"].str.lower().isin(bad_names)
]

publication_df = pub_exp.groupby(
    ["researcher", "institution"], as_index=False
).agg(
    publications=("title", "count"),
    citations=("citations", "sum")
)
publication_df["theses"] = 0

print(f"\nUnique researcher-institution pairs (publications) : {len(publication_df)}")

# =====================================================
# THESES
# =====================================================
researcher_col = "researcher" if "researcher" in thesis.columns else "author"
print(f"Using thesis column : '{researcher_col}'")

thesis["researcher_clean"] = thesis[researcher_col].astype(str).str.strip()

thesis = thesis[
    ~thesis["researcher_clean"].str.lower().isin(bad_names)
].copy()

thesis_df = thesis.groupby(
    ["researcher_clean", "institution"], as_index=False
).agg(
    theses=("researcher_clean", "count")
).rename(columns={"researcher_clean": "researcher"})

thesis_df["publications"] = 0
thesis_df["citations"]    = 0

print(f"Unique researcher-institution pairs (theses)       : {len(thesis_df)}")

# =====================================================
# MERGE PUBLICATIONS + THESES
# =====================================================
combined = pd.concat([publication_df, thesis_df], ignore_index=True)

combined = combined.groupby(
    ["researcher", "institution"], as_index=False
).sum()

print(f"\nTotal unique researchers after merge : {len(combined)}")

# =====================================================
# RESEARCH SCORE
# publications × 2 | theses × 3 | citations / 50
# =====================================================
combined["research_score"] = (
    (2 * combined["publications"])
    + (3 * combined["theses"])
    + (combined["citations"] / 50)
).round(2)

combined = combined.sort_values(
    "research_score", ascending=False
).reset_index(drop=True)

# =====================================================
# CHECK — how many have theses > 0
# =====================================================
with_theses = combined[combined["theses"] > 0]
print(f"\nResearchers with theses > 0 : {len(with_theses)}")
if len(with_theses) > 0:
    print(with_theses.head(10).to_string(index=False))
else:
    print("No researchers matched across both datasets (name format mismatch — normal)")

# =====================================================
# SAVE — combined top researchers
# =====================================================
out1 = "trend_engine/outputs/top_researchers.csv"
combined.to_csv(out1, index=False)

print("\n" + "="*55)
print("TOP 20 RESEARCHERS (combined score)")
print("="*55)
print(combined.head(20).to_string(index=False))
print(f"\nTotal researchers found : {len(combined)}")
print(f"Saved to                : {out1}")

# =====================================================
# INSTITUTION-WISE TOP 10
# =====================================================
institution_top = (
    combined
    .groupby("institution", group_keys=False)
    .apply(lambda x: x.nlargest(10, "research_score"))
    .reset_index(drop=True)
)

institution_top["rank"] = (
    institution_top
    .groupby("institution")["research_score"]
    .rank(ascending=False, method="first")
    .astype(int)
)

institution_top = institution_top.sort_values(
    ["institution", "rank"]
).reset_index(drop=True)

out2 = "trend_engine/outputs/institution_top_researchers.csv"
institution_top.to_csv(out2, index=False)

print("\n" + "="*55)
print("TOP 3 PER INSTITUTION (preview)")
print("="*55)
for inst, group in institution_top.groupby("institution"):
    print(f"\n{inst}")
    print("-" * 45)
    print(
        group[["rank", "researcher", "publications",
               "theses", "citations", "research_score"]]
        .head(3)
        .to_string(index=False)
    )

print(f"\nSaved to : {out2}")

# =====================================================
# THESIS-ONLY RESEARCHERS (separate scoring)
# =====================================================
thesis_only = thesis.groupby(
    ["researcher_clean", "institution"], as_index=False
).agg(
    theses=("researcher_clean", "count")
).rename(columns={"researcher_clean": "researcher"})

thesis_only["research_score"] = (3 * thesis_only["theses"]).round(2)

thesis_only = thesis_only.sort_values(
    "research_score", ascending=False
).reset_index(drop=True)

out3 = "trend_engine/outputs/top_thesis_researchers.csv"
thesis_only.to_csv(out3, index=False)

print("\n" + "="*55)
print("TOP 20 THESIS RESEARCHERS (thesis score only)")
print("="*55)
print(thesis_only.head(20).to_string(index=False))
print(f"\nSaved to : {out3}")

# =====================================================
# INSTITUTION-WISE TOP THESIS RESEARCHERS
# =====================================================
inst_thesis_top = (
    thesis_only
    .groupby("institution", group_keys=False)
    .apply(lambda x: x.nlargest(5, "research_score"))
    .reset_index(drop=True)
)

inst_thesis_top["rank"] = (
    inst_thesis_top
    .groupby("institution")["research_score"]
    .rank(ascending=False, method="first")
    .astype(int)
)

inst_thesis_top = inst_thesis_top.sort_values(
    ["institution", "rank"]
).reset_index(drop=True)

out4 = "trend_engine/outputs/institution_top_thesis_researchers.csv"
inst_thesis_top.to_csv(out4, index=False)

print("\n" + "="*55)
print("ALL OUTPUTS SAVED")
print("="*55)
print(f"1. {out1}")
print(f"2. {out2}")
print(f"3. {out3}")
print(f"4. {out4}")