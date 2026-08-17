import pandas as pd

print("Loading institution-domain data...")

df = pd.read_csv(
    "trend_outputs/institution_domains.csv"
)

print("\nPreview")
print(df.head())

domain_summary = (
    df.groupby("domain_name")
      .agg(
          publications=("publications", "sum"),
          patents=("patents", "sum"),
          grants=("grants", "sum"),
          theses=("theses", "sum"),
          total=("total", "sum"),
          institutions=("institution", "nunique")
      )
      .reset_index()
)
domain_summary["research_score"] = (
      domain_summary["publications"] * 1
    + domain_summary["patents"] * 2
    + domain_summary["grants"] * 2
    + domain_summary["theses"] * 1
)
domain_summary = domain_summary.sort_values(
    "research_score",
    ascending=False
)
output = "trend_engine/outputs/emerging_domains.csv"

domain_summary.to_csv(
    output,
    index=False
)

print("\nEmerging Domains\n")

print(domain_summary.to_string(index=False))

print("\nSaved to:")
print(output)

