import pandas as pd
import numpy as np

print("Loading yearly counts...")

# ==========================================================
# LOAD YEARLY COUNTS
# ==========================================================

df = pd.read_csv(
    "trend_engine/outputs/institution_yearly_counts.csv"
)

print("\nYears Available:")
print(sorted(df["year"].unique()))

# ==========================================================
# USE ONLY 2019-2025
# ==========================================================

START_YEAR = 2019
END_YEAR = 2025

df = df[
    (df["year"] >= START_YEAR) &
    (df["year"] <= END_YEAR)
]

print("\nUsing Years:")
print(sorted(df["year"].unique()))

# ==========================================================
# TOTAL RESEARCH
# ==========================================================

df["total_research"] = (
      df["publications"]
    + df["patents"]
    + df["grants"]
    + df["theses"]
)

# ==========================================================
# CREATE YEAR MATRIX
# ==========================================================

matrix = df.pivot_table(
    index="institution",
    columns="year",
    values="total_research",
    fill_value=0
)

# Ensure every year exists

for year in range(START_YEAR, END_YEAR + 1):
    if year not in matrix.columns:
        matrix[year] = 0

matrix = matrix[
    sorted(matrix.columns)
]

print("\nInstitution-Year Matrix\n")
print(matrix)

# ==========================================================
# CALCULATE CAGR
# ==========================================================

years = END_YEAR - START_YEAR

cagr_values = []

for _, row in matrix.iterrows():

    start = row[START_YEAR]
    end = row[END_YEAR]

    if start <= 0:

        cagr = 0

    else:

        cagr = (
            ((end / start) ** (1 / years)) - 1
        ) * 100

    cagr_values.append(round(cagr, 2))

matrix["cagr_percent"] = cagr_values

# ==========================================================
# TREND LABELS
# ==========================================================

def classify(cagr):

    if cagr >= 20:
        return "Very High Growth"

    elif cagr >= 10:
        return "High Growth"

    elif cagr >= 5:
        return "Growing"

    elif cagr >= -5:
        return "Stable"

    elif cagr >= -15:
        return "Declining"

    else:
        return "Rapid Decline"


matrix["trend"] = matrix["cagr_percent"].apply(classify)

# ==========================================================
# SORT
# ==========================================================

matrix = matrix.sort_values(
    "cagr_percent",
    ascending=False
)

# ==========================================================
# FINAL RESULT
# ==========================================================

result = matrix.reset_index()

result = result[
    [
        "institution",
        2019,
        2020,
        2021,
        2022,
        2023,
        2024,
        2025,
        "cagr_percent",
        "trend"
    ]
]

# ==========================================================
# SAVE
# ==========================================================

output = "trend_engine/outputs/institution_cagr.csv"

result.to_csv(
    output,
    index=False
)

# ==========================================================
# DISPLAY
# ==========================================================

print("\nTop CAGR Rankings\n")

print(
    result[
        [
            "institution",
            "cagr_percent",
            "trend"
        ]
    ]
)

print("\nSaved to:")
print(output)