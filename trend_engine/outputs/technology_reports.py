import os
from datetime import datetime
import pandas as pd

print("Generating SMART Technology Reports...")

# =====================================================
# CREATE REPORT FOLDER
# =====================================================

REPORT_DIR = "trend_engine/reports"

os.makedirs(REPORT_DIR, exist_ok=True)

# =====================================================
# LOAD ANALYTICS FILES
# =====================================================

emerging = pd.read_csv(
    "trend_engine/outputs/emerging_domains.csv"
)

top_researchers = pd.read_csv(
    "trend_engine/outputs/domain_top_researchers.csv"
)

top_venues = pd.read_csv(
    "trend_engine/outputs/domain_top_venues.csv"
)

journal_split = pd.read_csv(
    "trend_engine/outputs/journal_conference_by_domain.csv"
)

domain_cagr = pd.read_csv(
    "trend_engine/outputs/domain_cagr.csv"
)

# Optional
grant_impact = None

try:
    grant_impact = pd.read_csv(
        "trend_engine/outputs/grant_impact_score.csv"
    )
except:
    pass

print("Analytics Loaded.")

# =====================================================
# FIND TECHNOLOGIES
# =====================================================

technology_list = sorted(
    emerging["domain"].dropna().unique().tolist()
)

print(f"{len(technology_list)} Technologies Found")

# =====================================================
# GENERATE REPORTS
# =====================================================

today = datetime.now().strftime("%d %B %Y")

for tech in technology_list:

    print(f"Generating report for: {tech}")

    safe_name = (
        tech.replace("/", "_")
            .replace("\\", "_")
            .replace(" ", "_")
    )

    report_file = os.path.join(
        REPORT_DIR,
        f"{safe_name}_Report.md"
    )

    with open(report_file, "w", encoding="utf-8") as f:

        # =====================================================
        # TITLE
        # =====================================================

        f.write("# SMART\n")
        f.write("## Systematic Monitoring & Analysis for Research and Technology\n\n")

        f.write(f"# Technology Trend Report\n\n")

        f.write(f"**Technology:** {tech}\n\n")

        f.write(f"**Generated On:** {today}\n\n")

        f.write("---\n\n")

        # =====================================================
        # DATA FOR THIS TECHNOLOGY
        # =====================================================

        emerging_row = emerging[
            emerging["domain"] == tech
        ]

        cagr_row = domain_cagr[
            domain_cagr["domain"] == tech
        ]

        researcher_rows = top_researchers[
            top_researchers["domain"] == tech
        ]

        venue_rows = top_venues[
            top_venues["domain"] == tech
        ]

        journal_rows = journal_split[
            journal_split["domain"] == tech
        ]

        # =====================================================
        # EXECUTIVE SUMMARY
        # =====================================================

        f.write("## Executive Summary\n\n")

        if len(cagr_row):

            cagr = float(cagr_row.iloc[0]["cagr"])

        else:

            cagr = 0

        if cagr > 20:

            status = "🚀 Emerging Technology"

        elif cagr > 5:

            status = "📈 Growing Technology"

        elif cagr >= -5:

            status = "➖ Stable Technology"

        else:

            status = "📉 Declining Technology"

        f.write(f"- Technology Status: **{status}**\n")

        f.write(f"- CAGR: **{cagr:.2f}%**\n")

        f.write(f"- Top Researchers Identified: **{len(researcher_rows)}**\n")

        f.write(f"- Top Venues Identified: **{len(venue_rows)}**\n")

        f.write("\n---\n\n")

        