import pandas as pd

df = pd.read_csv("trend_master.csv")

df = df[df["year"] >= 2019]

matrix = pd.pivot_table(
    df,
    index="topic_id",
    columns="year",
    values="record_id",
    aggfunc="count",
    fill_value=0
)

matrix.to_csv("trend_outputs/topic_year_matrix.csv")

print(matrix.head())