import pandas as pd

print("Loading processed patent dataset...")

df = pd.read_csv("Final csvs/patents_processed.csv")

# ----------------------------
# Create NLP text
# ----------------------------

df["nlp_text"] = (
    df["title"].fillna("") + " " +
    df["field_of_invention"].fillna("") + " " +
    df["abstract"].fillna("")
)

# ----------------------------
# Keep important metadata
# ----------------------------

df = df[
    [
        "id",
        "Institution",
        "Location",
        "year",
        "title",
        "field_of_invention",
        "abstract",
        "nlp_text",
        "clean_text",
        "detected_language"
    ]
]

# Rename id → record_id

df = df.rename(
    columns={
        "id": "record_id"
    }
)

df["source_table"] = "patents"

# Put source_table after record_id

df = df[
    [
        "record_id",
        "source_table",
        "Institution",
        "Location",
        "year",
        "title",
        "field_of_invention",
        "abstract",
        "nlp_text",
        "clean_text",
        "detected_language"
    ]
]

df.to_csv(
    "nlp_input/patents_nlp_input.csv",
    index=False
)

print(df.head())
print("\nSaved patents_nlp_input.csv")