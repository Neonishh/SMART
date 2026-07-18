import pandas as pd

print("Loading yearly counts...")

df = pd.read_csv(
    "trend_engine/outputs/institution_yearly_counts.csv"
)

# ----------------------------------------------------
# USE ONLY HISTORICAL YEARS (2019-2025)
# ----------------------------------------------------

df = df[
    (df["year"] >= 2019) &
    (df["year"] <= 2025)
].copy()

print("\nYears Used:")
print(sorted(df["year"].unique()))
# ----------------------------------------------------
# SORT
# ----------------------------------------------------

df = df.sort_values(
    ["institution", "year"]
)

print("\nPreview")

print(df.head(10))
# ----------------------------------------------------
# CALCULATE YoY GROWTH
# ----------------------------------------------------

df["yoy_growth_percent"] = (
    df.groupby("institution")["total_research"]
      .pct_change()
      * 100
)

df["yoy_growth_percent"] = (
    df["yoy_growth_percent"]
    .round(2)
)

# ----------------------------------------------------
# TREND DIRECTION
# ----------------------------------------------------

def trend_label(x):

    if pd.isna(x):
        return "Base Year"

    if x > 10:
        return "High Growth"

    elif x > 0:
        return "Growing"

    elif x < -10:
        return "Declining"

    elif x < 0:
        return "Slight Decline"

    else:
        return "Stable"

df["trend"] = df["yoy_growth_percent"].apply(trend_label)

# ----------------------------------------------------
# SAVE
# ----------------------------------------------------

output = "trend_engine/outputs/institution_yoy_growth.csv"

df.to_csv(
    output,
    index=False
)

print("\nSaved to:")
print(output)

print("\nPreview\n")

print(df.head(20))
