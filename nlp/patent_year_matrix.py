import pandas as pd

df = pd.read_csv(
    "topics/patent_topics.csv"
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
    "trend_outputs/patent_year_matrix.csv"
)

print(matrix.head())