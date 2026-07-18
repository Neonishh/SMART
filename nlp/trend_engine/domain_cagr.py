import pandas as pd

print("Loading domain yearly counts...")

# =====================================================
# SETTINGS
# =====================================================

START_YEAR = 2019
END_YEAR = 2025

# =====================================================
# LOAD
# =====================================================

df = pd.read_csv(
    "trend_engine/outputs/domain_yearly_counts.csv"
)

# =====================================================
# KEEP REQUIRED YEARS
# =====================================================

df = df[
    (df["year"] >= START_YEAR) &
    (df["year"] <= END_YEAR)
]

# =====================================================
# CREATE MATRIX
# =====================================================

matrix = df.pivot_table(
    index="domain_name",
    columns="year",
    values="total",
    fill_value=0
)

print("\nDomain-Year Matrix\n")
print(matrix.head())

# =====================================================
# CAGR
# =====================================================

years = END_YEAR - START_YEAR

cagr = []

for _, row in matrix.iterrows():

    start = row[START_YEAR]
    end = row[END_YEAR]

    if start == 0:
        cagr.append(0)

    else:

        value = (
            ((end / start) ** (1 / years)) - 1
        ) * 100

        cagr.append(round(value, 2))

matrix["cagr_percent"] = cagr

# =====================================================
# TREND LABEL
# =====================================================

def classify(x):

    if x >= 20:
        return "Very High Growth"

    elif x >= 10:
        return "High Growth"

    elif x >= 5:
        return "Growing"

    elif x >= -5:
        return "Stable"

    elif x >= -15:
        return "Declining"

    else:
        return "Rapid Decline"

matrix["trend"] = matrix["cagr_percent"].apply(classify)

# =====================================================
# SORT
# =====================================================

matrix = matrix.sort_values(
    "cagr_percent",
    ascending=False
)

# =====================================================
# RESULT
# =====================================================

result = matrix.reset_index()

result = result[
    [
        "domain_name",
        2019,
        2020,
        2021,
        2022,
        2023,
        2024,
        2025,
        "cagr_percent",
        "trend",
    ]
]

# =====================================================
# SAVE
# =====================================================

output = "trend_engine/outputs/domain_cagr.csv"

result.to_csv(
    output,
    index=False
)

print("\nTop Growing Domains\n")

print(result.head(20))

print("\nSaved to:")
print(output)