import pandas as pd

print("Loading grants dataset...")

# =====================================================
# LOAD DATA
# =====================================================

grant = pd.read_csv("Final csvs/grants_processed.csv")

grant.columns = grant.columns.str.strip()

print(f"Total Grants : {len(grant)}")

# =====================================================
# FILTER YEARS (2019–2025)
# =====================================================

START_YEAR = 2019
END_YEAR = 2025

grant["year"] = pd.to_numeric(
    grant["year"],
    errors="coerce"
)

grant = grant[
    (grant["year"] >= START_YEAR) &
    (grant["year"] <= END_YEAR)
].copy()

print(f"After Year Filter : {len(grant)}")

# =====================================================
# CLEAN TEXT COLUMNS
# =====================================================

text_columns = [

    "institution",
    "discipline",
    "funding_agency",
    "program_scheme",
    "department",
    "pi_name"

]

for col in text_columns:

    grant[col] = (

        grant[col]

        .fillna("Unknown")

        .astype(str)

        .str.strip()

    )

# =====================================================
# CLEAN FUNDING VALUES
# =====================================================

grant["amount_lakhs"] = pd.to_numeric(
    grant["amount_lakhs"],
    errors="coerce"
).fillna(0)

grant["amount_inr"] = pd.to_numeric(
    grant["amount_inr"],
    errors="coerce"
).fillna(0)

# =====================================================
# REMOVE INVALID RECORDS
# =====================================================

grant = grant.drop_duplicates()

grant = grant[
    grant["institution"] != ""
]

print()

print("Dataset Ready")

print("----------------------------")

print(f"Institutions      : {grant['institution'].nunique()}")

print(f"Disciplines       : {grant['discipline'].nunique()}")

print(f"Funding Agencies  : {grant['funding_agency'].nunique()}")

print(f"Program Schemes   : {grant['program_scheme'].nunique()}")

print(f"Principal Investigators : {grant['pi_name'].nunique()}")

print()

print("Sample Data")

print(grant.head())
# =====================================================
# YEARLY GRANT COUNTS
# =====================================================

grant_yearly = (

    grant

    .groupby(
        [
            "institution",
            "year"
        ]
    )

    .agg(

        total_grants=("id", "count"),

        total_amount_lakhs=("amount_lakhs", "sum")

    )

    .reset_index()

)

print()
print("=" * 60)
print("YEARLY GRANT COUNTS")
print("=" * 60)

print(grant_yearly.head(20))


# =====================================================
# YOY GROWTH
# =====================================================

grant_yearly = grant_yearly.sort_values(

    ["institution", "year"]

)

grant_yearly["grant_growth_pct"] = (

    grant_yearly

    .groupby("institution")["total_grants"]

    .pct_change()

    * 100

)

grant_yearly["funding_growth_pct"] = (

    grant_yearly

    .groupby("institution")["total_amount_lakhs"]

    .pct_change()

    * 100

)

grant_yearly["grant_growth_pct"] = (

    grant_yearly["grant_growth_pct"]

    .round(2)

)

grant_yearly["funding_growth_pct"] = (

    grant_yearly["funding_growth_pct"]

    .round(2)

)

print()

print("=" * 60)

print("YOY GROWTH")

print("=" * 60)

print(grant_yearly.head(20))


# =====================================================
# CAGR
# =====================================================

cagr_rows = []

for institution, group in grant_yearly.groupby("institution"):

    group = group.sort_values("year")

    start = group.iloc[0]["total_grants"]

    end = group.iloc[-1]["total_grants"]

    years = group.iloc[-1]["year"] - group.iloc[0]["year"]

    if years == 0 or start == 0:

        cagr = 0

    else:

        cagr = (

            ((end / start) ** (1 / years)) - 1

        ) * 100

    cagr_rows.append({

        "institution": institution,

        "grant_cagr": round(cagr, 2)

    })

grant_cagr = pd.DataFrame(cagr_rows)

grant_cagr = grant_cagr.sort_values(

    "grant_cagr",

    ascending=False

)

print()

print("=" * 60)

print("GRANT CAGR")

print("=" * 60)

print(grant_cagr)

# =====================================================
# INSTITUTION FUNDING SUMMARY
# =====================================================

institution_funding = (

    grant

    .groupby("institution", as_index=False)

    .agg(

        total_projects=("id", "count"),

        total_funding_lakhs=("amount_lakhs", "sum"),

        average_grant_lakhs=("amount_lakhs", "mean"),

        max_grant_lakhs=("amount_lakhs", "max"),

        min_grant_lakhs=("amount_lakhs", "min")

    )

)

institution_funding["average_grant_lakhs"] = (
    institution_funding["average_grant_lakhs"].round(2)
)

institution_funding = institution_funding.sort_values(
    "total_funding_lakhs",
    ascending=False
)

print()
print("="*60)
print("INSTITUTION GRANT FUNDING")
print("="*60)
print(institution_funding.head(20))


# =====================================================
# FUNDING AGENCY ANALYSIS
# =====================================================

funding_agencies = (

    grant

    .groupby("funding_agency", as_index=False)

    .agg(

        total_projects=("id","count"),

        total_funding_lakhs=("amount_lakhs","sum"),

        institutions_supported=("institution","nunique")

    )

)

funding_agencies = funding_agencies.sort_values(
    "total_funding_lakhs",
    ascending=False
)

print()
print("="*60)
print("TOP FUNDING AGENCIES")
print("="*60)
print(funding_agencies.head(20))

# =====================================================
# TOP PRINCIPAL INVESTIGATORS
# =====================================================

pi_summary = (

    grant

    .groupby(["pi_name","institution"],as_index=False)

    .agg(

        total_projects=("id","count"),

        total_funding_lakhs=("amount_lakhs","sum"),

        average_grant_lakhs=("amount_lakhs","mean")

    )

)

pi_summary["average_grant_lakhs"] = (
    pi_summary["average_grant_lakhs"].round(2)
)

pi_summary = pi_summary.sort_values(
    "total_funding_lakhs",
    ascending=False
)

print()
print("="*60)
print("TOP PRINCIPAL INVESTIGATORS")
print("="*60)
print(pi_summary.head(20))


# =====================================================
# DISCIPLINE FUNDING
# =====================================================

discipline_summary = (

    grant

    .groupby("discipline",as_index=False)

    .agg(

        total_projects=("id","count"),

        total_funding_lakhs=("amount_lakhs","sum"),

        average_grant_lakhs=("amount_lakhs","mean")

    )

)

discipline_summary["average_grant_lakhs"] = (
    discipline_summary["average_grant_lakhs"].round(2)
)

discipline_summary = discipline_summary.sort_values(
    "total_funding_lakhs",
    ascending=False
)

print()
print("="*60)
print("DISCIPLINE FUNDING")
print("="*60)
print(discipline_summary.head(20))

# =====================================================
# PROGRAM SCHEME ANALYSIS
# =====================================================

scheme_summary = (

    grant

    .groupby("program_scheme",as_index=False)

    .agg(

        total_projects=("id","count"),

        total_funding_lakhs=("amount_lakhs","sum"),

        average_grant_lakhs=("amount_lakhs","mean")

    )

)

scheme_summary["average_grant_lakhs"] = (
    scheme_summary["average_grant_lakhs"].round(2)
)

scheme_summary = scheme_summary.sort_values(
    "total_funding_lakhs",
    ascending=False
)

print()
print("="*60)
print("PROGRAM SCHEMES")
print("="*60)
print(scheme_summary.head(20))

# =====================================================
# GRANT IMPACT SCORE
# =====================================================

print()
print("=" * 60)
print("GRANT IMPACT SCORE")
print("=" * 60)

# -----------------------------------------------
# Merge Institution Funding + CAGR
# -----------------------------------------------

grant_impact = institution_funding.merge(

    grant_cagr,

    on="institution",

    how="left"

)

grant_impact["grant_cagr"] = (

    grant_impact["grant_cagr"]

    .fillna(0)

)

# -----------------------------------------------
# Normalize Metrics (0–100)
# -----------------------------------------------

def normalize(column):

    minimum = column.min()

    maximum = column.max()

    if maximum == minimum:

        return pd.Series([100] * len(column))

    return (

        (column - minimum)

        / (maximum - minimum)

    ) * 100

grant_impact["funding_score"] = normalize(

    grant_impact["total_funding_lakhs"]

)

grant_impact["project_score"] = normalize(

    grant_impact["total_projects"]

)

grant_impact["cagr_score"] = normalize(

    grant_impact["grant_cagr"]

)

# -----------------------------------------------
# Compute Final Impact Score
# -----------------------------------------------

grant_impact["impact_score"] = (

    0.50 * grant_impact["funding_score"]

    + 0.30 * grant_impact["project_score"]

    + 0.20 * grant_impact["cagr_score"]

).round(2)

# -----------------------------------------------
# Rank Institutions
# -----------------------------------------------

grant_impact = grant_impact.sort_values(

    "impact_score",

    ascending=False

).reset_index(drop=True)

grant_impact.insert(

    0,

    "rank",

    range(1, len(grant_impact) + 1)

)

# -----------------------------------------------
# Select Final Columns
# -----------------------------------------------

grant_impact = grant_impact[[

    "rank",

    "institution",

    "total_projects",

    "total_funding_lakhs",

    "average_grant_lakhs",

    "grant_cagr",

    "impact_score"

]]

# -----------------------------------------------
# Preview
# -----------------------------------------------

print()

print("=" * 60)

print("TOP INSTITUTIONS BY GRANT IMPACT")

print("=" * 60)

print(

    grant_impact

    .head(20)

    .to_string(index=False)

)

# -----------------------------------------------
# Save
# -----------------------------------------------

output = "trend_engine/outputs/grant_impact_score.csv"

grant_impact.to_csv(

    output,

    index=False

)

print()

print("Saved to:")

print(output)


# =====================================================
# SAVE ALL OUTPUTS
# =====================================================

grant_yearly.to_csv(
    "trend_engine/outputs/grant_yearly_counts.csv",
    index=False
)

grant_cagr.to_csv(
    "trend_engine/outputs/grant_cagr.csv",
    index=False
)

institution_funding.to_csv(
    "trend_engine/outputs/institution_grant_funding.csv",
    index=False
)

funding_agencies.to_csv(
    "trend_engine/outputs/top_funding_agencies.csv",
    index=False
)

pi_summary.to_csv(
    "trend_engine/outputs/top_principal_investigators.csv",
    index=False
)

discipline_summary.to_csv(
    "trend_engine/outputs/discipline_funding.csv",
    index=False
)

scheme_summary.to_csv(
    "trend_engine/outputs/scheme_analysis.csv",
    index=False
)

grant_impact.to_csv(
    "trend_engine/outputs/grant_impact_score.csv",
    index=False
)

print()
print("=" * 60)
print("ALL FILES GENERATED")
print("=" * 60)

print("1. grant_yearly_counts.csv")
print("2. grant_cagr.csv")
print("3. institution_grant_funding.csv")
print("4. top_funding_agencies.csv")
print("5. top_principal_investigators.csv")
print("6. discipline_funding.csv")
print("7. scheme_analysis.csv")
print("8. grant_impact_score.csv")