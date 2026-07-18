import pandas as pd
import json
import os

# =====================================================
# SMART REPORT BUILDER
# =====================================================

OUTPUT_PATH = "trend_engine/outputs"

def build_report(technology, year):

    print("=" * 70)
    print("SMART TECHNOLOGY REPORT")
    print("=" * 70)
    print(f"Technology : {technology}")
    print(f"Year       : {year}")
    print()

    # =====================================================
    # LOAD ANALYTICS
    # =====================================================
    domain_counts  = pd.read_csv(f"{OUTPUT_PATH}/domain_yearly_counts.csv")
    domain_growth  = pd.read_csv(f"{OUTPUT_PATH}/domain_yoy_growth.csv")
    domain_cagr    = pd.read_csv(f"{OUTPUT_PATH}/domain_cagr.csv")
    researchers    = pd.read_csv(f"{OUTPUT_PATH}/domain_top_researchers.csv")
    grants         = pd.read_csv(f"{OUTPUT_PATH}/grant_impact_score.csv")
    journals       = pd.read_csv(f"{OUTPUT_PATH}/top_journals.csv")
    conferences    = pd.read_csv(f"{OUTPUT_PATH}/top_conferences.csv")

    # Strip whitespace from ALL column names
    for df in [domain_counts, domain_growth, domain_cagr,
               researchers, grants, journals, conferences]:
        df.columns = df.columns.str.strip()

    # Load venues only if file exists
    venues_path = f"{OUTPUT_PATH}/domain_top_venues.csv"
    if os.path.exists(venues_path):
        venues = pd.read_csv(venues_path)
        venues.columns = venues.columns.str.strip()
    else:
        venues = pd.DataFrame()

    # =====================================================
    # DEBUG — print columns to confirm
    # =====================================================
    print("domain_counts columns :", domain_counts.columns.tolist())
    print("domain_growth columns :", domain_growth.columns.tolist())
    print("domain_cagr columns   :", domain_cagr.columns.tolist())
    print("researchers columns   :", researchers.columns.tolist())
    print()

    # =====================================================
    # DETECT DOMAIN COLUMN NAME
    # =====================================================
    def get_domain_col(df, label="df"):
        possible_columns = [
            "domain_name",
            "domain",
            "subdomain",
            "topic_label",
            "topic"
        ]
        for col in possible_columns:
            if col in df.columns:
                return col
        print(
            f"Warning: No domain column found in {label}. "
            f"Columns: {df.columns.tolist()}"
        )
        return None

    counts_domain_col     = get_domain_col(domain_counts,  "domain_counts")
    growth_domain_col     = get_domain_col(domain_growth,  "domain_growth")
    cagr_domain_col       = get_domain_col(domain_cagr,    "domain_cagr")
    researcher_domain_col = get_domain_col(researchers,    "researchers")

    # =====================================================
    # REPORT OBJECT
    # =====================================================
    report = {
        "technology":             technology,
        "year":                   year,
        "publication_statistics": {},
        "growth_statistics":      {},
        "grant_statistics":       {},
        "top_researchers":        [],
        "top_institutions":       [],
        "top_journals":           [],
        "top_conferences":        [],
        "top_venues":             [],
        "executive_summary":      "",
        "recommendations":        []
    }

    # =====================================================
    # PUBLICATION STATISTICS
    # =====================================================
    if counts_domain_col:
        year_row = domain_counts[
            (domain_counts[counts_domain_col] == technology) &
            (domain_counts["year"] == year)
        ]
    else:
        year_row = pd.DataFrame()

    if year_row.empty:
        print(f"Warning: No data for domain='{technology}' year={year}")
        publications = patents = grants_count = theses = total_output = 0
    else:
        row          = year_row.iloc[0]
        publications = int(row.get("publications",    0))
        patents      = int(row.get("patents",         0))
        grants_count = int(row.get("grants",          0))
        theses       = int(row.get("theses",          0))
        total_output = int(row.get("total_research",
                           publications + patents + grants_count + theses))

    report["publication_statistics"] = {
        "publications": publications,
        "patents":      patents,
        "grants":       grants_count,
        "theses":       theses,
        "total_output": total_output
    }

    # =====================================================
    # GROWTH STATISTICS
    # =====================================================
    yoy_growth = 0.0
    if growth_domain_col:
        growth_row = domain_growth[
            (domain_growth[growth_domain_col] == technology) &
            (domain_growth["year"] == year)
        ]
        if not growth_row.empty:
            yoy_val    = growth_row.iloc[0].get("yoy_growth_percent", 0)
            yoy_growth = round(float(yoy_val) if pd.notna(yoy_val) else 0.0, 2)

    # =====================================================
    # CAGR
    # domain_cagr.csv columns:
    # domain_name, 2019, 2020 ... 2025, cagr_percent, trend
    # =====================================================
    cagr_val = 0.0
    if cagr_domain_col:
        cagr_row = domain_cagr[
            domain_cagr[cagr_domain_col] == technology
        ]
        if not cagr_row.empty:
            cagr_val = round(
                float(cagr_row.iloc[0].get("cagr_percent", 0)), 2
            )

    report["growth_statistics"] = {
        "yoy_growth_percent": yoy_growth,
        "cagr_percent":       cagr_val
    }

    # =====================================================
    # GRANT STATISTICS
    # =====================================================
    grant_domain_col = get_domain_col(grants, "grants")

    if grant_domain_col:
        domain_grants = grants[grants[grant_domain_col] == technology]
    else:
        domain_grants = grants

    avg_impact = 0.0
    if not domain_grants.empty and "impact_score" in domain_grants.columns:
        avg_impact = round(float(domain_grants["impact_score"].mean()), 2)

    report["grant_statistics"] = {
        "average_impact_score": avg_impact
    }

    # =====================================================
    # TOP RESEARCHERS
    # researcher file columns:
    # researcher, institution, domain, publications, citations, research_score
    # =====================================================
    if researcher_domain_col:
        top_res = researchers[
            researchers[researcher_domain_col] == technology
        ].sort_values("research_score", ascending=False).head(10)
    else:
        top_res = researchers.sort_values(
            "research_score", ascending=False
        ).head(10)

    cols_res = [c for c in
                ["researcher", "institution", "publications",
                 "citations", "research_score"]
                if c in top_res.columns]
    report["top_researchers"] = top_res[cols_res].to_dict("records")

    # =====================================================
    # TOP INSTITUTIONS
    # =====================================================
    top_inst = grants.sort_values("impact_score", ascending=False).head(10) \
        if "impact_score" in grants.columns else grants.head(10)

    cols_inst = [c for c in
                 ["institution", "impact_score",
                  "total_projects", "total_funding_lakhs"]
                 if c in top_inst.columns]
    report["top_institutions"] = top_inst[cols_inst].to_dict("records")

    # =====================================================
    # TOP JOURNALS + CONFERENCES
    # =====================================================
    report["top_journals"]    = journals.head(10).to_dict("records")
    report["top_conferences"] = conferences.head(10).to_dict("records")

    # =====================================================
    # TOP VENUES FOR THIS DOMAIN
    # =====================================================
    if not venues.empty:
        venue_domain_col = get_domain_col(venues, "venues")
        if venue_domain_col:
            report["top_venues"] = venues[
                venues[venue_domain_col] == technology
            ].head(10).to_dict("records")
        else:
            report["top_venues"] = venues.head(10).to_dict("records")

    # =====================================================
    # EXECUTIVE SUMMARY
    # =====================================================
    pub    = report["publication_statistics"]
    growth = report["growth_statistics"]
    grant  = report["grant_statistics"]

    report["executive_summary"] = (
        f"The {technology} domain produced {pub['total_output']} total research "
        f"outputs in {year}, including {pub['publications']} publications, "
        f"{pub['patents']} patents, {pub['grants']} grants and "
        f"{pub['theses']} theses. "
        f"The year-on-year growth was {growth['yoy_growth_percent']}%, "
        f"while the long-term CAGR stands at {growth['cagr_percent']}%. "
        f"Across all participating institutions, the average Grant Impact Score "
        f"was {grant['average_impact_score']}."
    )

    # =====================================================
    # RECOMMENDATIONS
    # =====================================================
    recs = []

    if growth["yoy_growth_percent"] > 20:
        recs.append(
            "Strong growth detected. Continued investment is recommended."
        )
    elif growth["yoy_growth_percent"] > 0:
        recs.append(
            "Steady growth observed. Monitor emerging research trends."
        )
    else:
        recs.append(
            "Research output has declined. "
            "Strategic funding and collaboration should be encouraged."
        )

    if growth["cagr_percent"] > 15:
        recs.append(
            "Long-term CAGR indicates this technology is emerging rapidly."
        )

    if pub["publications"] > 500:
        recs.append(
            "High publication volume supports international collaboration."
        )

    if grant["average_impact_score"] > 50:
        recs.append(
            "Grant funding performance is strong across institutions."
        )
    else:
        recs.append(
            "Grant funding should be strengthened to improve "
            "technology development."
        )

    report["recommendations"] = recs

    # =====================================================
    # PRINT REPORT
    # =====================================================
    print("=" * 70)
    print("REPORT GENERATED")
    print("=" * 70)
    print(f"\nTechnology : {report['technology']}")
    print(f"Year       : {report['year']}")
    print(f"\nPublication Statistics")
    print(report["publication_statistics"])
    print(f"\nGrowth Statistics")
    print(report["growth_statistics"])
    print(f"\nGrant Statistics")
    print(report["grant_statistics"])
    print(f"\nTop Researchers  : {len(report['top_researchers'])}")
    print(f"Top Institutions : {len(report['top_institutions'])}")
    print(f"Top Journals     : {len(report['top_journals'])}")
    print(f"Top Conferences  : {len(report['top_conferences'])}")
    print(f"\nExecutive Summary")
    print(report["executive_summary"])
    print("\nRecommendations")
    for r in report["recommendations"]:
        print("-", r)

    # =====================================================
    # SAVE REPORT AS JSON
    # =====================================================
    save_folder = "trend_engine/report_engine/generated_reports"
    os.makedirs(save_folder, exist_ok=True)

    file_name = (
        technology.lower().replace(" ", "_")
        + "_" + str(year) + ".json"
    )
    save_path = os.path.join(save_folder, file_name)

    with open(save_path, "w") as f:
        json.dump(report, f, indent=4)

    print()
    print("=" * 70)
    print("REPORT SAVED")
    print("=" * 70)
    print(save_path)

    return report


# =====================================================
# RUN
# =====================================================
if __name__ == "__main__":

    from pdf_generator import generate_pdf

    report = build_report(
        "Artificial Intelligence and Computer Vision",
        2023
    )

    pdf_path = generate_pdf(report)

    print(f"\nPDF saved to: {pdf_path}")