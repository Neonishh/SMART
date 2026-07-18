import pandas as pd
import numpy as np

matrix = pd.read_csv(
    "trend_outputs/thesis_year_matrix.csv",
    index_col=0
)

matrix = matrix[matrix.index != -1]

results = []

for topic in matrix.index:

    total_docs = matrix.loc[topic].sum()

    if total_docs < 20:
        continue

    growth = (
        (
            matrix.loc[topic, "2025"]
            -
            matrix.loc[topic, "2024"]
        )
        /
        (matrix.loc[topic, "2024"] + 1)
    ) * 100

    score = growth * np.log(total_docs)

    results.append([
        topic,
        total_docs,
        growth,
        score
    ])

trend_df = pd.DataFrame(
    results,
    columns=[
        "topic_id",
        "total_docs",
        "growth_percent",
        "trend_score"
    ]
)

trend_df = trend_df.sort_values(
    "trend_score",
    ascending=False
)

topic_info = pd.read_csv(
    "topics/thesis_topic_info.csv"
)

final = trend_df.merge(
    topic_info,
    left_on="topic_id",
    right_on="Topic",
    how="left"
)

final.to_csv(
    "trend_outputs/thesis_trends.csv",
    index=False
)

print(
    final[
        [
            "topic_id",
            "Name",
            "trend_score"
        ]
    ].head(20)
)