import pandas as pd

from institution_normalizer import normalize
print("Loading datasets...")

# ==========================================================
# LOAD DATASETS
# ==========================================================

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# ==========================================================
# NORMALIZE INSTITUTIONS
# ==========================================================

pub["institution"] = normalize(pub["institution"])
gra["institution"] = normalize(gra["institution"])
the["institution"] = normalize(the["institution"])

pat["Institution"] = normalize(pat["Institution"])
pat.rename(columns={"Institution": "institution"}, inplace=True)

# ==========================================================
# KEEP ONLY 2019-2026
# ==========================================================

datasets = [pub, pat, gra, the]

for df in datasets:

    df["year"] = pd.to_numeric(
        df["year"],
        errors="coerce"
    )

    df.dropna(
        subset=["year"],
        inplace=True
    )

    df["year"] = df["year"].astype(int)

pub = pub[(pub["year"] >= 2019) & (pub["year"] <= 2026)]
pat = pat[(pat["year"] >= 2019) & (pat["year"] <= 2026)]
gra = gra[(gra["year"] >= 2019) & (gra["year"] <= 2026)]
the = the[(the["year"] >= 2019) & (the["year"] <= 2026)]

# ==========================================================
# YEARLY COUNTS
# ==========================================================

pub_count = (
    pub.groupby(
        ["institution", "year"]
    )
    .size()
    .reset_index(name="publications")
)

pat_count = (
    pat.groupby(
        ["institution", "year"]
    )
    .size()
    .reset_index(name="patents")
)

gra_count = (
    gra.groupby(
        ["institution", "year"]
    )
    .size()
    .reset_index(name="grants")
)

the_count = (
    the.groupby(
        ["institution", "year"]
    )
    .size()
    .reset_index(name="theses")
)

# ==========================================================
# MERGE
# ==========================================================

final = pub_count.merge(
    pat_count,
    on=["institution", "year"],
    how="outer"
)

final = final.merge(
    gra_count,
    on=["institution", "year"],
    how="outer"
)

final = final.merge(
    the_count,
    on=["institution", "year"],
    how="outer"
)

final = final.fillna(0)

# ==========================================================
# CONVERT TO INTEGER
# ==========================================================

for col in [
    "publications",
    "patents",
    "grants",
    "theses"
]:

    final[col] = final[col].astype(int)

# ==========================================================
# TOTAL RESEARCH
# ==========================================================

final["total_research"] = (
      final["publications"]
    + final["patents"]
    + final["grants"]
    + final["theses"]
)

# ==========================================================
# SORT
# ==========================================================

final = final.sort_values(
    ["institution", "year"]
)

# ==========================================================
# SAVE
# ==========================================================

output = "trend_engine/outputs/institution_yearly_counts.csv"

final.to_csv(
    output,
    index=False
)

print("\nSaved to:")
print(output)

print("\nPreview\n")

print(final.head(20))