import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

# =====================================================
# CHANGE THESE TWO LINES ONLY
# =====================================================

INPUT_FILE = "trend_outputs/thesis_year_matrix.csv"

OUTPUT_FILE = "trend_outputs/thesis_research_momentum.csv"

# =====================================================
# LOAD DATA
# =====================================================

df = pd.read_csv(INPUT_FILE)

# =====================================================
# REMOVE BERTopic OUTLIERS
# =====================================================

df = df[df["topic_id"] != -1]

# =====================================================
# YEARS USED FOR ANALYSIS
# =====================================================

years = [2019, 2020, 2021, 2022, 2023, 2024, 2025]

X = np.array(years).reshape(-1, 1)

results = []

# =====================================================
# CALCULATE MOMENTUM
# =====================================================

for _, row in df.iterrows():

    topic = int(row["topic_id"])

    counts = row[[str(y) for y in years]].astype(float).values

    # -----------------------------------
    # Basic Statistics
    # -----------------------------------

    total_publications = counts.sum()

    average_publications = counts.mean()

    maximum_publications = counts.max()

    minimum_publications = counts.min()

    publication_std = counts.std()

    # -----------------------------------
    # Linear Trend
    # -----------------------------------

    model = LinearRegression()

    model.fit(X, counts)

    slope = model.coef_[0]

    intercept = model.intercept_

    r2 = model.score(X, counts)

    # -----------------------------------
    # Growth
    # -----------------------------------

    first_year = counts[0]

    last_year = counts[-1]

    growth_percent = (
        ((last_year - first_year) /
        (first_year + 1)) * 100
    )

    # -----------------------------------
    # Momentum Label
    # -----------------------------------

    if slope >= 8:

        label = "Explosive Growth"

    elif slope >= 4:

        label = "High Growth"

    elif slope >= 1:

        label = "Growing"

    elif slope > -1:

        label = "Stable"

    else:

        label = "Declining"

    # -----------------------------------
    # Save Result
    # -----------------------------------

    results.append({

        "topic_id": topic,

        "total_publications": int(total_publications),

        "average_publications": round(
            average_publications, 2
        ),

        "maximum_publications": int(
            maximum_publications
        ),

        "minimum_publications": int(
            minimum_publications
        ),

        "publication_std": round(
            publication_std, 2
        ),

        "trend_slope": round(
            slope, 2
        ),

        "trend_intercept": round(
            intercept, 2
        ),

        "trend_consistency": round(
            r2, 3
        ),

        "overall_growth_percent": round(
            growth_percent, 2
        ),

        "momentum_label": label

    })

# =====================================================
# CREATE DATAFRAME
# =====================================================

momentum = pd.DataFrame(results)

# =====================================================
# SORT
# =====================================================

momentum = momentum.sort_values(

    by="trend_slope",

    ascending=False

)

# =====================================================
# SAVE
# =====================================================

momentum.to_csv(

    OUTPUT_FILE,

    index=False

)

# =====================================================
# DISPLAY
# =====================================================

print("\n====================================")
print("RESEARCH MOMENTUM ANALYSIS")
print("====================================\n")

print(momentum.head(20))

print("\nSaved to:")

print(OUTPUT_FILE)

print("\nTotal Topics:", len(momentum))