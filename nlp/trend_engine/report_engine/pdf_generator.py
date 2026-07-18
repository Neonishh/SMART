from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
import os


def generate_pdf(report):

    os.makedirs(
        "trend_engine/report_engine/generated_reports",
        exist_ok=True
    )

    technology = report["technology"]
    year = report["year"]

    filename = (
        technology.lower()
        .replace(" ", "_")
        + "_"
        + str(year)
        + ".pdf"
    )

    filepath = os.path.join(
        "trend_engine/report_engine/generated_reports",
        filename
    )

    doc = SimpleDocTemplate(
        filepath,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    story = []

    # -------------------------------------------------
    # TITLE
    # -------------------------------------------------

    story.append(
        Paragraph("<b>SMART TECHNOLOGY REPORT</b>", styles["Title"])
    )

    story.append(Spacer(1, 0.3 * inch))

    story.append(
        Paragraph(f"<b>Technology:</b> {technology}", styles["Heading2"])
    )

    story.append(
        Paragraph(f"<b>Year:</b> {year}", styles["Heading2"])
    )

    story.append(Spacer(1, 0.4 * inch))

    # -------------------------------------------------
    # SECTION 1: PUBLICATION STATISTICS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>1. Publication Statistics</b>", styles["Heading1"])
    )

    pub = report["publication_statistics"]

    table_data = [
        ["Metric", "Value"],
        ["Publications", pub["publications"]],
        ["Patents", pub["patents"]],
        ["Grants", pub["grants"]],
        ["Theses", pub["theses"]],
        ["Total Output", pub["total_output"]],
    ]

    table = Table(table_data)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
    ]))

    story.append(table)

    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 2: GROWTH STATISTICS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>2. Growth Statistics</b>", styles["Heading1"])
    )

    growth = report["growth_statistics"]

    growth_table = Table([
        ["Metric", "Value"],
        ["YoY Growth (%)", growth["yoy_growth_percent"]],
        ["CAGR (%)", growth["cagr_percent"]]
    ])

    growth_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkgreen),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
    ]))

    story.append(growth_table)

    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 3: GRANT STATISTICS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>3. Grant Statistics</b>", styles["Heading1"])
    )

    grant = report["grant_statistics"]

    grant_table = Table([
        ["Metric", "Value"],
        ["Average Grant Impact Score", grant["average_impact_score"]]
    ])

    grant_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkred),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))

    story.append(grant_table)
    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 4: TOP RESEARCHERS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>4. Top Researchers</b>", styles["Heading1"])
    )

    researchers = report["top_researchers"]

    data = [
        [
            "Rank",
            "Researcher",
            "Institution",
            "Score"
        ]
    ]

    for r in researchers:
        data.append([
            r["rank"],
            r["researcher"],
            r["institution"],
            round(r["research_score"], 2)
        ])

    researcher_table = Table(data)

    researcher_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
    ]))

    story.append(researcher_table)
    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 5: TOP INSTITUTIONS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>5. Top Institutions</b>", styles["Heading1"])
    )

    institutions = report["top_institutions"]

    data = [
        [
            "Rank",
            "Institution",
            "Output"
        ]
    ]

    for inst in institutions:
        data.append([
            inst["rank"],
            inst["institution"],
            inst["total_output"]
        ])

    institution_table = Table(data)

    institution_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.darkgreen),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))

    story.append(institution_table)
    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 6: EXECUTIVE SUMMARY
    # -------------------------------------------------

    story.append(
        Paragraph("<b>6. Executive Summary</b>", styles["Heading1"])
    )

    story.append(
        Paragraph(report["executive_summary"], styles["BodyText"])
    )

    story.append(Spacer(1, 0.3 * inch))

    # -------------------------------------------------
    # SECTION 7: RECOMMENDATIONS
    # -------------------------------------------------

    story.append(
        Paragraph("<b>7. Recommendations</b>", styles["Heading1"])
    )

    for rec in report["recommendations"]:
        story.append(
            Paragraph("• " + rec, styles["BodyText"])
        )

    # -------------------------------------------------
    # BUILD PDF
    # -------------------------------------------------

    doc.build(story)

    return filepath