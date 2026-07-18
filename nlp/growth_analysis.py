import pandas as pd
import numpy as np

# =========================
# Load Topic-Year Matrix
# =========================

matrix = pd.read_csv(
    "trend_outputs/topic_year_matrix.csv",
    index_col=0
)

# Remove BERTopic noise topic
matrix = matrix[matrix.index != -1]

results = []

# =========================
# Trend Analysis
# =========================

for topic in matrix.index:

    row = matrix.loc[topic]

    # Total papers in all years
    total_docs = row.sum()

    # Ignore tiny topics
    if total_docs < 50:
        continue

    # Recent activity
    recent_docs = (
        row["2024"] +
        row["2025"]
    )

    # Ignore inactive topics
    if recent_docs < 10:
        continue

    # Growth from 2024 → 2025
    growth = (
        (row["2025"] - row["2024"])
        /
        (row["2024"] + 1)
    ) * 100

    # Trend Score
    score = (
        growth *
        np.log1p(total_docs)
    )

    results.append([
        topic,
        total_docs,
        recent_docs,
        growth,
        score
    ])

# =========================
# Create Trend DataFrame
# =========================

trend_df = pd.DataFrame(
    results,
    columns=[
        "topic_id",
        "total_docs",
        "recent_docs",
        "growth_percent",
        "trend_score"
    ]
)

# Sort by trend score
trend_df = trend_df.sort_values(
    "trend_score",
    ascending=False
)

# =========================
# Load Topic Names
# =========================

topic_info = pd.read_csv(
    "topics/publication_topic_info.csv"
)

# Merge names
final = trend_df.merge(
    topic_info,
    left_on="topic_id",
    right_on="Topic",
    how="left"

)

def classify_trend(growth):

    if growth > 30:
        return "Emerging"

    elif growth >= 0:
        return "Stable"

    else:
        return "Declining"

final["trend_category"] = (
    final["growth_percent"]
    .apply(classify_trend)
)

# =========================
# Display Results
# =========================

print("\nTOP EMERGING TECHNOLOGIES\n")

print(
    final[
        [
            "topic_id",
            "Name",
            "total_docs",
            "trend_score",
            "trend_category"
        ]
    ].head(20)
)


# =========================
# Save Results
# =========================

final.to_csv(
    "trend_outputs/emerging_technologies.csv",
    index=False
)

print("\nSaved:")
print("trend_outputs/emerging_technologies.csv")