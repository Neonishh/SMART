import pandas as pd

df = pd.read_csv(
    "trend_outputs/emerging_technologies.csv"
)

top_topics = df.head(10)

for _, row in top_topics.iterrows():

    print("\n" + "="*70)

    print("TECHNOLOGY:", row["Name"])

    print("CATEGORY:", row["trend_category"])

    print("GROWTH:", round(row["growth_percent"],2), "%")

    print("DOCUMENTS:", row["total_docs"])

    summary = f"""
Research activity in {row['Name']}
has increased significantly in recent years.

The topic currently contains
{row['total_docs']} research documents
and has demonstrated a growth rate of
{round(row['growth_percent'],2)}%.

This indicates increasing scientific
interest and may represent an emerging
technology area within India's
research ecosystem.
"""

    print(summary)