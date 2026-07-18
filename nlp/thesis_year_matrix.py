import pandas as pd

df = pd.read_csv(
    "topics/thesis_topics.csv"
)

df = df[
    (df["year"] >= 2019) &
    (df["year"] <= 2026)
]

matrix = pd.pivot_table(
    df,
    index="topic_id",
    columns="year",
    aggfunc="size",
    fill_value=0
)

matrix.to_csv(
    "trend_outputs/thesis_year_matrix.csv"
)

print(matrix.head())