import pandas as pd

print("Loading publication dataset...")

# =====================================================
# LOAD DATA
# =====================================================

pub = pd.read_csv(
    "Final csvs/publications_processed.csv"
)

pub.columns = pub.columns.str.strip()

print("\nColumns:")
print(pub.columns.tolist())

print(f"\nTotal Publications : {len(pub)}")

# =====================================================
# FILTER YEARS
# =====================================================

START_YEAR = 2019
END_YEAR = 2025

pub["year"] = pd.to_numeric(
    pub["year"],
    errors="coerce"
)

pub = pub[
    (pub["year"] >= START_YEAR) &
    (pub["year"] <= END_YEAR)
].copy()

print(f"After Year Filter : {len(pub)}")

# =====================================================
# VENUE CLASSIFICATION
# =====================================================

journal_keywords = [

    "journal",

    "transactions",

    "transaction",

    "letters",

    "review",

    "reviews",

    "magazine",

    "bulletin",

    "annals",

    "journal of",

    "international journal",

    "nature",

    "science",

    "cell",

    "lancet",

    "ieee access",

    "acm computing surveys",

    "expert systems"

]

conference_keywords = [

    "conference",

    "proceedings",

    "symposium",

    "workshop",

    "congress",

    "meeting",

    "icml",

    "neurips",

    "cvpr",

    "iccv",

    "eccv",

    "ijcai",

    "aaai",

    "acl",

    "emnlp",

    "icra",

    "iros",

    "sigcomm",

    "sigir",

    "kdd",

    "www"

]

def classify_venue(venue):

    if pd.isna(venue):
        return "Unknown"

    venue = str(venue).lower().strip()

    if venue == "":
        return "Unknown"

    # Journal first

    for word in journal_keywords:

        if word in venue:

            return "Journal"

    # Conference second

    for word in conference_keywords:

        if word in venue:

            return "Conference"

    return "Unknown"

# =====================================================
# CREATE VENUE TYPE
# =====================================================

if "venue_type" in pub.columns:

    pub["venue_type"] = (

        pub["venue_type"]

        .fillna("Unknown")

        .astype(str)

        .str.title()

    )

else:

    pub["venue_type"] = (

        pub["venue"]

        .apply(classify_venue)

    )

print("\nVenue Distribution")

print(pub["venue_type"].value_counts())

# =====================================================
# OVERALL JOURNAL vs CONFERENCE
# =====================================================

overall = (
    pub["venue_type"]
    .value_counts()
    .reset_index()
)

overall.columns = [
    "venue_type",
    "count"
]

overall["percentage"] = (
    overall["count"]
    / overall["count"].sum()
    * 100
).round(2)

print("\n" + "="*60)
print("OVERALL JOURNAL vs CONFERENCE")
print("="*60)

print(overall.to_string(index=False))

# =====================================================
# INSTITUTION-WISE ANALYSIS
# =====================================================

institution = (

    pub

    .groupby(
        [
            "institution",
            "venue_type"
        ]
    )

    .size()

    .reset_index(
        name="count"
    )

)

institution = institution.pivot_table(

    index="institution",

    columns="venue_type",

    values="count",

    fill_value=0

).reset_index()

institution.columns.name = None

# Ensure all columns exist

for col in [
    "Journal",
    "Conference",
    "Unknown"
]:

    if col not in institution.columns:

        institution[col] = 0

institution["Total"] = (

      institution["Journal"]

    + institution["Conference"]

    + institution["Unknown"]

)

institution["Journal %"] = (

    institution["Journal"]

    / institution["Total"]

    * 100

).round(2)

institution["Conference %"] = (

    institution["Conference"]

    / institution["Total"]

    * 100

).round(2)

institution = institution.sort_values(

    "Total",

    ascending=False

)

print("\n" + "="*60)
print("INSTITUTION ANALYSIS")
print("="*60)

print(institution.head(15).to_string(index=False))

# =====================================================
# YEAR-WISE ANALYSIS
# =====================================================

yearly = (

    pub

    .groupby(
        [
            "year",
            "venue_type"
        ]
    )

    .size()

    .reset_index(
        name="count"
    )

)

yearly = yearly.pivot_table(

    index="year",

    columns="venue_type",

    values="count",

    fill_value=0

).reset_index()

yearly.columns.name = None

for col in [
    "Journal",
    "Conference",
    "Unknown"
]:

    if col not in yearly.columns:

        yearly[col] = 0

yearly["Total"] = (

      yearly["Journal"]

    + yearly["Conference"]

    + yearly["Unknown"]

)

yearly["Journal %"] = (

    yearly["Journal"]

    / yearly["Total"]

    * 100

).round(2)

yearly["Conference %"] = (

    yearly["Conference"]

    / yearly["Total"]

    * 100

).round(2)

print("\n" + "="*60)
print("YEAR-WISE ANALYSIS")
print("="*60)

print(yearly.to_string(index=False))
# =====================================================
# DOMAIN-WISE ANALYSIS
# =====================================================

domain_col = None

for col in ["domain", "subdomain", "topic_label", "topic"]:

    if col in pub.columns:
        domain_col = col
        break

if domain_col is not None:

    domain = (

        pub

        .groupby(
            [
                domain_col,
                "venue_type"
            ]
        )

        .size()

        .reset_index(
            name="count"
        )

    )

    domain = domain.pivot_table(

        index=domain_col,

        columns="venue_type",

        values="count",

        fill_value=0

    ).reset_index()

    domain.columns.name = None

    for col in [
        "Journal",
        "Conference",
        "Unknown"
    ]:

        if col not in domain.columns:
            domain[col] = 0

    domain["Total"] = (

          domain["Journal"]

        + domain["Conference"]

        + domain["Unknown"]

    )

    domain["Journal %"] = (

        domain["Journal"]

        / domain["Total"]

        * 100

    ).round(2)

    domain["Conference %"] = (

        domain["Conference"]

        / domain["Total"]

        * 100

    ).round(2)

    domain = domain.sort_values(
        "Total",
        ascending=False
    )

    print("\n" + "=" * 60)
    print("DOMAIN ANALYSIS")
    print("=" * 60)

    print(domain.head(15).to_string(index=False))

else:

    print("\nNo domain column found.")

    domain = pd.DataFrame()

# =====================================================
# UNKNOWN PUBLICATIONS
# =====================================================

unknown = pub[
    pub["venue_type"] == "Unknown"
].copy()

print("\n" + "=" * 60)
print("UNKNOWN PUBLICATIONS")
print("=" * 60)

print(f"Unknown Publications : {len(unknown)}")

# =====================================================
# SAVE OUTPUTS
# =====================================================

output1 = "trend_engine/outputs/journal_conference_overall.csv"

output2 = "trend_engine/outputs/journal_conference_by_institution.csv"

output3 = "trend_engine/outputs/journal_conference_by_year.csv"

output4 = "trend_engine/outputs/journal_conference_by_domain.csv"

output5 = "trend_engine/outputs/unknown_publications.csv"

overall.to_csv(
    output1,
    index=False
)

institution.to_csv(
    output2,
    index=False
)

yearly.to_csv(
    output3,
    index=False
)

if not domain.empty:

    domain.to_csv(
        output4,
        index=False
    )

unknown.to_csv(
    output5,
    index=False
)

# =====================================================
# SUMMARY
# =====================================================

print("\n" + "=" * 60)
print("FILES GENERATED")
print("=" * 60)

print(f"1. {output1}")
print(f"2. {output2}")
print(f"3. {output3}")

if not domain.empty:
    print(f"4. {output4}")

print(f"5. {output5}")

print("\nCompleted Successfully.")