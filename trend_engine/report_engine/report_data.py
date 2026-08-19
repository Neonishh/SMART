import os
import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")


def load_csv(filename):
    """
    Load a Trend Engine output CSV.
    """
    path = os.path.join(OUTPUT_DIR, filename)

    if not os.path.exists(path):
        raise FileNotFoundError(f"Trend Engine output not found: {path}")

    return pd.read_csv(path)


def get_report_data(year, domain):
    """
    Collect all Trend Engine information required
    to generate a report for a selected year and domain.
    """

    year = int(year)
    domain = str(domain).strip()

    # ---------------------------------------------------------
    # LOAD TREND ENGINE OUTPUTS
    # ---------------------------------------------------------

    yearly_counts = load_csv("domain_yearly_counts.csv")
    cagr = load_csv("domain_cagr.csv")
    yoy = load_csv("domain_yoy_growth.csv")
    emerging = load_csv("emerging_domains.csv")

    # ---------------------------------------------------------
    # FILTER SELECTED DOMAIN
    # ---------------------------------------------------------

    yearly_domain = yearly_counts[
        yearly_counts["domain_name"].astype(str).str.strip().str.lower()
        == domain.lower()
    ].copy()

    if yearly_domain.empty:
        raise ValueError(
            f"No Trend Engine data found for domain: {domain}"
        )

    # ---------------------------------------------------------
    # FILTER SELECTED YEAR
    # ---------------------------------------------------------

    selected_year = yearly_domain[
        yearly_domain["year"] == year
    ].copy()

    if selected_year.empty:
        raise ValueError(
            f"No data found for {domain} in year {year}"
        )

    # ---------------------------------------------------------
    # CAGR INFORMATION
    # ---------------------------------------------------------

    domain_cagr = cagr[
        cagr["domain_name"].astype(str).str.strip().str.lower()
        == domain.lower()
    ].copy()

    # ---------------------------------------------------------
    # YOY INFORMATION
    # ---------------------------------------------------------

    domain_yoy = yoy[
        yoy["domain_name"].astype(str).str.strip().str.lower()
        == domain.lower()
    ].copy()

    selected_yoy = domain_yoy[
        domain_yoy["year"] == year
    ].copy()

    # ---------------------------------------------------------
    # EMERGING DOMAIN INFORMATION
    # ---------------------------------------------------------

    domain_emerging = emerging[
        emerging["domain_name"].astype(str).str.strip().str.lower()
        == domain.lower()
    ].copy()

    # ---------------------------------------------------------
    # YEARLY RECORD
    # ---------------------------------------------------------

    yearly_record = selected_year.iloc[0].to_dict()

    # ---------------------------------------------------------
    # YOY RECORD
    # ---------------------------------------------------------

    if not selected_yoy.empty:
        yoy_record = selected_yoy.iloc[0].to_dict()
    else:
        yoy_record = {}

    # ---------------------------------------------------------
    # CAGR RECORD
    # ---------------------------------------------------------

    if not domain_cagr.empty:
        cagr_record = domain_cagr.iloc[0].to_dict()
    else:
        cagr_record = {}

    # ---------------------------------------------------------
    # EMERGING DOMAIN RECORD
    # ---------------------------------------------------------

    if not domain_emerging.empty:
        emerging_record = domain_emerging.iloc[0].to_dict()
    else:
        emerging_record = {}

    # ---------------------------------------------------------
    # RETURN REPORT DATA
    # ---------------------------------------------------------

    return {
        "domain": domain,
        "year": year,

        "yearly_metrics": yearly_record,

        "yoy_growth": yoy_record,

        "cagr": cagr_record,

        "emerging_domain": emerging_record,

        "historical_data": yearly_domain.to_dict(
            orient="records"
        ),

        "available_years": sorted(
            yearly_domain["year"].dropna().unique().tolist()
        )
    }


if __name__ == "__main__":

    # Test example
    data = get_report_data(
        2023,
        "Cybersecurity and Blockchain"
    )

    print("\n====================================")
    print("SMART AUTOMATED REPORT DATA")
    print("====================================")

    print("Domain:", data["domain"])
    print("Year:", data["year"])

    print("\nYearly Metrics:")
    print(data["yearly_metrics"])

    print("\nYoY Growth:")
    print(data["yoy_growth"])

    print("\nCAGR:")
    print(data["cagr"])

    print("\nEmerging Domain:")
    print(data["emerging_domain"])

    print("\nHistorical Records:")
    print(len(data["historical_data"]))