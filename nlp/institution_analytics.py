import pandas as pd

from institution_normalizer import normalize

# =====================================================
# LOAD DATA
# =====================================================

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# =====================================================
# NORMALIZE INSTITUTION NAMES
# =====================================================

pub["institution"] = normalize(pub["institution"])

gra["institution"] = normalize(gra["institution"])

the["institution"] = normalize(the["institution"])

pat["Institution"] = normalize(pat["Institution"])
pat.rename(columns={"Institution": "institution"}, inplace=True)

# =====================================================
# COUNT RECORDS
# =====================================================

pub_count = (
    pub.groupby("institution")
       .size()
       .reset_index(name="publications")
)

pat_count = (
    pat.groupby("institution")
       .size()
       .reset_index(name="patents")
)

gra_count = (
    gra.groupby("institution")
       .size()
       .reset_index(name="grants")
)

the_count = (
    the.groupby("institution")
       .size()
       .reset_index(name="theses")
)

# =====================================================
# MERGE
# =====================================================

final = (
    pub_count
    .merge(pat_count, on="institution", how="outer")
    .merge(gra_count, on="institution", how="outer")
    .merge(the_count, on="institution", how="outer")
)

final = final.fillna(0)

# =====================================================
# TOTAL RESEARCH OUTPUT
# =====================================================

final["total_research"] = (
    final["publications"]
    + final["patents"]
    + final["grants"]
    + final["theses"]
)

# =====================================================
# SORT
# =====================================================

final = final.sort_values(
    "total_research",
    ascending=False
)

# =====================================================
# SAVE
# =====================================================

final.to_csv(
    "trend_outputs/institution_analytics.csv",
    index=False
)

print("\nTop Institutions\n")
print(final.head(25))

print("\nSaved to:")
print("trend_outputs/institution_analytics.csv")