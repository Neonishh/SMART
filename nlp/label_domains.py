import pandas as pd

df = pd.read_csv(
    "trend_outputs/topic_domains.csv"
)

for domain in sorted(df["domain_id"].unique()):

    print("\n")
    print("="*60)
    print("DOMAIN", domain)

    print(
        df[df["domain_id"] == domain]
        ["Name"]
        .head(20)
        .to_string(index=False)
    )