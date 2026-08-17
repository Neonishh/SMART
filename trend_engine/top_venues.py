import pandas as pd

print("Loading publications...")

# =====================================================
# LOAD DATA
# =====================================================

pub = pd.read_csv(
    "Final csvs/publications_processed.csv"
)

pub.columns = pub.columns.str.strip()

print("\nColumns:")
print(pub.columns.tolist())

# =====================================================
# YEAR FILTER
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

print(f"\nPublications (2019-2025): {len(pub)}")

# =====================================================
# CLEAN VENUES
# =====================================================

pub["venue"] = (
    pub["venue"]
    .fillna("")
    .astype(str)
    .str.replace(r"\s+", " ", regex=True)
    .str.strip()
)

bad_venues = [

    "",

    "unknown",

    "nan",

    "none",

    "#name?",

    "published in",

    "published in:",

    "-",

    "--",

    "n/a"

]

pub = pub[
    ~pub["venue"]
    .str.lower()
    .isin(bad_venues)
].copy()

print(f"After removing invalid venues : {len(pub)}")

# =====================================================
# CLASSIFICATION
# =====================================================

journal_keywords = [

    "journal",

    "transactions",

    "transaction",

    "letters",

    "review",

    "reviews",

    "nature",

    "science",

    "cell",

    "lancet",

    "physical review",

    "journal of",

    "international journal"

]

conference_keywords = [

    "conference",

    "proceedings",

    "symposium",

    "workshop",

    "congress",

    "meeting",

    "aaai",

    "cvpr",

    "iccv",

    "eccv",

    "neurips",

    "icml",

    "ijcai",

    "acl",

    "emnlp",

    "icra",

    "iros",

    "kdd",

    "sigir"

]

def classify(venue):

    venue = venue.lower()

    if any(k in venue for k in journal_keywords):
        return "Journal"

    if any(k in venue for k in conference_keywords):
        return "Conference"

    return "Unknown"

pub["venue_type"] = pub["venue"].apply(classify)

# =====================================================
# SPLIT DATA
# =====================================================

classified = pub[
    pub["venue_type"] != "Unknown"
].copy()

unknown = pub[
    pub["venue_type"] == "Unknown"
].copy()

print("\nVenue Classification")

print(classified["venue_type"].value_counts())

print(f"\nUnknown venues : {len(unknown)}")

# =====================================================
# TOP JOURNALS
# =====================================================

top_journals = (

    classified[
        classified["venue_type"] == "Journal"
    ]

    .groupby("venue")

    .size()

    .reset_index(name="publications")

    .sort_values(
        "publications",
        ascending=False
    )

    .reset_index(drop=True)

)

top_journals.insert(
    0,
    "rank",
    range(1, len(top_journals)+1)
)

print("\n" + "="*60)
print("TOP 20 JOURNALS")
print("="*60)

print(top_journals.head(20).to_string(index=False))

# =====================================================
# TOP CONFERENCES
# =====================================================

top_conferences = (

    classified[
        classified["venue_type"] == "Conference"
    ]

    .groupby("venue")

    .size()

    .reset_index(name="publications")

    .sort_values(
        "publications",
        ascending=False
    )

    .reset_index(drop=True)

)

top_conferences.insert(
    0,
    "rank",
    range(1, len(top_conferences)+1)
)

print("\n" + "="*60)
print("TOP 20 CONFERENCES")
print("="*60)

print(top_conferences.head(20).to_string(index=False))

# =====================================================
# INSTITUTION-WISE TOP VENUES
# =====================================================

institution_top = (

    classified

    .groupby(
        [
            "institution",
            "venue_type",
            "venue"
        ]
    )

    .size()

    .reset_index(name="publications")

)

institution_top = (

    institution_top

    .sort_values(
        [
            "institution",
            "venue_type",
            "publications"
        ],
        ascending=[True, True, False]
    )

    .groupby(
        [
            "institution",
            "venue_type"
        ]
    )

    .head(5)

    .reset_index(drop=True)

)

print("\n" + "="*60)
print("TOP VENUES BY INSTITUTION")
print("="*60)

for inst in institution_top["institution"].unique()[:5]:

    print(f"\n{inst}")

    print("-"*60)

    print(

        institution_top[
            institution_top["institution"] == inst
        ][
            [
                "venue_type",
                "venue",
                "publications"
            ]
        ].to_string(index=False)

    )

# =====================================================
# YEAR-WISE VENUE TREND
# =====================================================

yearly_trend = (

    classified

    .groupby(
        [
            "year",
            "venue_type"
        ]
    )

    .size()

    .reset_index(name="publications")

)

yearly_trend = yearly_trend.pivot_table(

    index="year",

    columns="venue_type",

    values="publications",

    fill_value=0

).reset_index()

yearly_trend.columns.name = None

# Ensure columns exist

for col in ["Journal","Conference"]:

    if col not in yearly_trend.columns:

        yearly_trend[col] = 0

yearly_trend["Total"] = (

      yearly_trend["Journal"]

    + yearly_trend["Conference"]

)

yearly_trend["Journal %"] = (

    yearly_trend["Journal"]

    / yearly_trend["Total"]

    *100

).round(2)

yearly_trend["Conference %"] = (

    yearly_trend["Conference"]

    / yearly_trend["Total"]

    *100

).round(2)

print("\n" + "="*60)
print("YEAR-WISE VENUE TREND")
print("="*60)

print(yearly_trend.to_string(index=False))

# =====================================================
# DOMAIN-WISE TOP VENUES
# =====================================================

domain_col = None

for col in [
    "domain",
    "subdomain",
    "topic_label",
    "topic"
]:

    if col in classified.columns:
        domain_col = col
        break

if domain_col is not None:

    domain_top = (

        classified

        .groupby(
            [
                domain_col,
                "venue_type",
                "venue"
            ]
        )

        .size()

        .reset_index(name="publications")

    )

    domain_top = (

        domain_top

        .sort_values(
            [
                domain_col,
                "venue_type",
                "publications"
            ],
            ascending=[True, True, False]
        )

        .groupby(
            [
                domain_col,
                "venue_type"
            ]
        )

        .head(5)

        .reset_index(drop=True)

    )

    print("\n" + "="*60)
    print("TOP VENUES BY DOMAIN")
    print("="*60)

    for dom in domain_top[domain_col].unique()[:5]:

        print(f"\n{dom}")

        print("-"*60)

        print(

            domain_top[
                domain_top[domain_col] == dom
            ][
                [
                    "venue_type",
                    "venue",
                    "publications"
                ]
            ].to_string(index=False)

        )

else:

    domain_top = pd.DataFrame()

# =====================================================
# UNKNOWN VENUES
# =====================================================

unknown_venues = (

    unknown

    .groupby("venue")

    .size()

    .reset_index(name="publications")

    .sort_values(
        "publications",
        ascending=False
    )

)

print("\n" + "="*60)
print("TOP UNKNOWN VENUES")
print("="*60)

print(unknown_venues.head(20).to_string(index=False))

# =====================================================
# SAVE OUTPUTS
# =====================================================

out1 = "trend_engine/outputs/top_journals.csv"
out2 = "trend_engine/outputs/top_conferences.csv"
out3 = "trend_engine/outputs/institution_top_venues.csv"
out4 = "trend_engine/outputs/domain_top_venues.csv"
out5 = "trend_engine/outputs/venue_yearly_trend.csv"
out6 = "trend_engine/outputs/unknown_venues.csv"

top_journals.to_csv(
    out1,
    index=False
)

top_conferences.to_csv(
    out2,
    index=False
)

institution_top.to_csv(
    out3,
    index=False
)

yearly_trend.to_csv(
    out5,
    index=False
)

if not domain_top.empty:

    domain_top.to_csv(
        out4,
        index=False
    )

unknown_venues.to_csv(
    out6,
    index=False
)

# =====================================================
# SUMMARY
# =====================================================

print("\n" + "="*65)
print("TOP VENUES ANALYSIS COMPLETED")
print("="*65)

print(f"Journal Papers      : {(classified['venue_type']=='Journal').sum()}")
print(f"Conference Papers   : {(classified['venue_type']=='Conference').sum()}")
print(f"Unknown Publications: {len(unknown)}")

print("\nGenerated Files:")

print(f"1. {out1}")
print(f"2. {out2}")
print(f"3. {out3}")
print(f"4. {out5}")

if not domain_top.empty:
    print(f"5. {out4}")

print(f"6. {out6}")

print("\nDone!")