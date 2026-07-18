import pandas as pd

# Load trend files
pub = pd.read_csv(
    "trend_outputs/emerging_technologies.csv"
)
pat = pd.read_csv("trend_outputs/patent_trends.csv")
gra = pd.read_csv("trend_outputs/grant_trends.csv")
the = pd.read_csv("trend_outputs/thesis_trends.csv")


# Technology mapping function
def map_category(name):

    name = str(name).lower()

    if any(k in name for k in [
        "machine learning",
        "deep",
        "neural",
        "computer vision",
        "llm",
        "ai"
    ]):
        return "Artificial Intelligence"

    elif any(k in name for k in [
        "quantum",
        "qubit",
        "cryptography"
    ]):
        return "Quantum Technologies"

    elif any(k in name for k in [
        "intrusion",
        "cyber",
        "threat",
        "botnet",
        "malware"
    ]):
        return "Cybersecurity"

    elif any(k in name for k in [
        "iot",
        "sensor",
        "smart grid"
    ]):
        return "Internet of Things"

    elif any(k in name for k in [
        "battery",
        "supercapacitor",
        "hydrogen",
        "energy"
    ]):
        return "Energy Technologies"

    elif any(k in name for k in [
        "silicon",
        "chip",
        "transistor"
    ]):
        return "Semiconductors"

    else:
        return "Other"


# Add technology category to all datasets
for df in [pub, pat, gra, the]:
    df["technology"] = df["Name"].apply(map_category)


# Aggregate scores
pub_score = (
    pub.groupby("technology")["trend_score"]
    .mean()
    .reset_index()
)

pat_score = (
    pat.groupby("technology")["trend_score"]
    .mean()
    .reset_index()
)

gra_score = (
    gra.groupby("technology")["trend_score"]
    .mean()
    .reset_index()
)

the_score = (
    the.groupby("technology")["trend_score"]
    .mean()
    .reset_index()
)


# Merge all scores
final = pub_score.rename(
    columns={"trend_score": "publication_score"}
)

final = final.merge(
    pat_score.rename(
        columns={"trend_score": "patent_score"}
    ),
    on="technology",
    how="outer"
)

final = final.merge(
    gra_score.rename(
        columns={"trend_score": "grant_score"}
    ),
    on="technology",
    how="outer"
)

final = final.merge(
    the_score.rename(
        columns={"trend_score": "thesis_score"}
    ),
    on="technology",
    how="outer"
)

final = final.fillna(0)


# Overall SMART score
final["overall_score"] = (
      0.40 * final["publication_score"]
    + 0.30 * final["patent_score"]
    + 0.20 * final["grant_score"]
    + 0.10 * final["thesis_score"]
)

final = final.sort_values(
    "overall_score",
    ascending=False
)

print(final.head(20))

final.to_csv(
    "trend_outputs/technology_scores.csv",
    index=False
)

print("\nSaved: trend_outputs/technology_scores.csv")