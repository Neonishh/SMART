import pandas as pd

print("Loading domain yearly counts...")

# =====================================================
# LOAD DATA
# =====================================================

df = pd.read_csv(
    "trend_engine/outputs/domain_yearly_counts.csv"
)

# =====================================================
# SORT DATA
# =====================================================

df = df.sort_values(
    ["domain_name", "year"]
)

# =====================================================
# CALCULATE YoY
# =====================================================

for column in ["publications", "patents", "grants", "theses", "total"]:

    df[column + "_yoy"] = (
        df.groupby("domain_name")[column]
          .pct_change()
          .fillna(0)
          * 100
    ).round(2)

# =====================================================
# OVERALL YoY
# =====================================================

df["yoy_growth_percent"] = df["total_yoy"]

# =====================================================
# TREND LABELS
# =====================================================

def classify(value):

    if value == 0:
        return "Base Year"

    elif value >= 20:
        return "High Growth"

    elif value >= 5:
        return "Growing"

    elif value >= -5:
        return "Stable"

    elif value >= -20:
        return "Declining"

    else:
        return "Rapid Decline"

df["trend"] = df["yoy_growth_percent"].apply(classify)

# =====================================================
# SAVE
# =====================================================

output = "trend_engine/outputs/domain_yoy_growth.csv"

df.to_csv(
    output,
    index=False
)

# =====================================================
# DISPLAY
# =====================================================

print("\nPreview\n")

print(
    df[
        [
            "domain_name",
            "year",
            "total",
            "yoy_growth_percent",
            "trend",
        ]
    ].head(20)
)

print("\nSaved to:")
print(output)