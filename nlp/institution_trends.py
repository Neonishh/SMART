import pandas as pd

from institution_normalizer import normalize

# ============================================================
# LOAD DATASETS
# ============================================================

print("Loading datasets...")

pub = pd.read_csv("topics/publication_topics.csv")
pat = pd.read_csv("topics/patent_topics.csv")
gra = pd.read_csv("topics/grant_topics.csv")
the = pd.read_csv("topics/thesis_topics.csv")

# ============================================================
# NORMALIZE INSTITUTION NAMES
# ============================================================

pub["institution"] = normalize(pub["institution"])
gra["institution"] = normalize(gra["institution"])
the["institution"] = normalize(the["institution"])

pat["Institution"] = normalize(pat["Institution"])
pat.rename(columns={"Institution": "institution"}, inplace=True)

# ============================================================
# KEEP REQUIRED COLUMNS
# ============================================================

pub = pub[["institution", "year"]]
pat = pat[["institution", "year"]]
gra = gra[["institution", "year"]]
the = the[["institution", "year"]]

# ============================================================
# MERGE EVERYTHING
# ============================================================

all_data = pd.concat(
    [pub, pat, gra, the],
    ignore_index=True
)

# ============================================================
# CLEAN YEARS
# ============================================================

all_data["year"] = pd.to_numeric(
    all_data["year"],
    errors="coerce"
)

all_data = all_data.dropna(subset=["year"])

all_data["year"] = all_data["year"].astype(int)

# ============================================================
# KEEP ONLY 2019-2026
# ============================================================

all_data = all_data[
    (all_data["year"] >= 2019) &
    (all_data["year"] <= 2026)
]

print("\nYears Used:")
print(sorted(all_data["year"].unique()))

# ============================================================
# COUNT RECORDS PER YEAR
# ============================================================

yearly = (
    all_data
    .groupby(["institution", "year"])
    .size()
    .reset_index(name="count")
)

# ============================================================
# CREATE YEAR MATRIX
# ============================================================

matrix = yearly.pivot_table(
    index="institution",
    columns="year",
    values="count",
    fill_value=0
)

years = [2019,2020,2021,2022,2023,2024,2025,2026]

for y in years:
    if y not in matrix.columns:
        matrix[y] = 0

matrix = matrix[years]

matrix["total_research"] = matrix[years].sum(axis=1)

# ============================================================
# CALCULATE GROWTH
# ============================================================

previous_window = [2019, 2020, 2021, 2022]
recent_window = [2023, 2024, 2025]

print("\nPrevious Window:", previous_window)
print("Recent Window  :", recent_window)

previous_total = matrix[previous_window].sum(axis=1)
recent_total = matrix[recent_window].sum(axis=1)

growth = []

for prev, recent in zip(previous_total, recent_total):

    if prev == 0:

        if recent == 0:
            growth.append(0)

        else:
            growth.append(100)

    else:

        g = ((recent - prev) / prev) * 100
        growth.append(round(g, 2))

matrix["growth_percent"] = growth

# ============================================================
# TREND LABELS
# ============================================================

def classify(g):

    if g >= 50:
        return "High Growth"

    elif g >= 15:
        return "Growing"

    elif g <= -15:
        return "Declining"

    else:
        return "Stable"

matrix["trend"] = matrix["growth_percent"].apply(classify)

# ============================================================
# SORT RESULTS
# ============================================================

matrix = matrix.sort_values(
    by="growth_percent",
    ascending=False
)

# ============================================================
# RESET INDEX
# ============================================================

matrix = matrix.reset_index()

# ============================================================
# ROUND NUMERIC COLUMNS
# ============================================================

matrix["growth_percent"] = matrix["growth_percent"].round(2)

# ============================================================
# SAVE RESULTS
# ============================================================

output_file = "trend_outputs/institution_trends.csv"

matrix.to_csv(
    output_file,
    index=False
)

# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\nInstitution Trends\n")

print(
    matrix[
        [
            "institution",
            2019,
            2020,
            2021,
            2022,
            2023,
            2024,
            2025,
            2026,
            "total_research",
            "growth_percent",
            "trend"
        ]
    ].head(20)
)

print("\nSaved to:")
print(output_file)