from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from xml.sax.saxutils import escape
import os


GENERATED_REPORTS_DIR = (
    "trend_engine/report_engine/generated_reports"
)


def safe_text(value):
    if value is None:
        return ""

    return escape(str(value))


def generate_pdf(report):

    if not isinstance(report, dict):
        raise ValueError(
            "Report must be a dictionary."
        )

    required_fields = [
        "technology",
        "year",
        "publication_statistics",
        "growth_statistics",
        "grant_statistics",
        "top_researchers",
        "top_institutions",
        "executive_summary",
        "recommendations",
    ]

    missing = [
        field
        for field in required_fields
        if field not in report
    ]

    if missing:
        raise ValueError(
            f"Report is missing required fields: {missing}"
        )

    os.makedirs(
        GENERATED_REPORTS_DIR,
        exist_ok=True
    )

    technology = str(report["technology"])
    year = report["year"]

    filename = (
        technology.lower()
        .strip()
        .replace(" ", "_")
        + f"_{year}.pdf"
    )

    filepath = os.path.abspath(
        os.path.join(
            GENERATED_REPORTS_DIR,
            filename
        )
    )

    doc = SimpleDocTemplate(
        filepath,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
        title=(
            f"SMART Technology Report - "
            f"{technology} - {year}"
        ),
        author="SMART Knowledge Graph",
    )

    styles = getSampleStyleSheet()

    story = []

    # =====================================================
    # TITLE
    # =====================================================

    story.append(
        Paragraph(
            "<b>SMART TECHNOLOGY REPORT</b>",
            styles["Title"]
        )
    )

    story.append(
        Spacer(1, 0.3 * inch)
    )

    story.append(
        Paragraph(
            f"<b>Technology:</b> "
            f"{safe_text(technology)}",
            styles["Heading2"]
        )
    )

    story.append(
        Paragraph(
            f"<b>Year:</b> {safe_text(year)}",
            styles["Heading2"]
        )
    )

    story.append(
        Spacer(1, 0.4 * inch)
    )

    # =====================================================
    # PUBLICATION STATISTICS
    # =====================================================

    story.append(
        Paragraph(
            "<b>1. Publication Statistics</b>",
            styles["Heading1"]
        )
    )

    pub = report[
        "publication_statistics"
    ]

    publication_table = Table([
        ["Metric", "Value"],
        ["Publications", pub.get("publications", 0)],
        ["Patents", pub.get("patents", 0)],
        ["Grants", pub.get("grants", 0)],
        ["Theses", pub.get("theses", 0)],
        ["Total Output", pub.get("total_output", 0)],
    ])

    publication_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkblue
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),
            (
                "BACKGROUND",
                (0, 1),
                (-1, -1),
                colors.beige
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
        ])
    )

    story.append(publication_table)

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # GROWTH
    # =====================================================

    story.append(
        Paragraph(
            "<b>2. Growth Statistics</b>",
            styles["Heading1"]
        )
    )

    growth = report[
        "growth_statistics"
    ]

    growth_table = Table([
        ["Metric", "Value"],
        [
            "YoY Growth (%)",
            growth.get(
                "yoy_growth_percent",
                0
            )
        ],
        [
            "CAGR (%)",
            growth.get(
                "cagr_percent",
                0
            )
        ],
    ])

    growth_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkgreen
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),
        ])
    )

    story.append(growth_table)

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # GRANTS
    # =====================================================

    story.append(
        Paragraph(
            "<b>3. Grant Statistics</b>",
            styles["Heading1"]
        )
    )

    grant = report[
        "grant_statistics"
    ]

    grant_table = Table([
        ["Metric", "Value"],
        [
            "Average Grant Impact Score",
            grant.get(
                "average_impact_score",
                0
            )
        ],
    ])

    grant_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkred
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),
        ])
    )

    story.append(grant_table)

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # RESEARCHERS
    # =====================================================

    story.append(
        Paragraph(
            "<b>4. Top Researchers</b>",
            styles["Heading1"]
        )
    )

    researcher_data = [
        [
            "Rank",
            "Researcher",
            "Institution",
            "Score",
        ]
    ]

    for rank, researcher in enumerate(
        report.get(
            "top_researchers",
            []
        ),
        start=1
    ):
        researcher_data.append([
            rank,
            safe_text(
                researcher.get(
                    "researcher",
                    ""
                )
            ),
            safe_text(
                researcher.get(
                    "institution",
                    ""
                )
            ),
            round(
                float(
                    researcher.get(
                        "research_score",
                        0
                    ) or 0
                ),
                2
            ),
        ])

    researcher_table = Table(
        researcher_data,
        repeatRows=1,
        colWidths=[
            0.5 * inch,
            2.0 * inch,
            2.5 * inch,
            1.0 * inch,
        ],
    )

    researcher_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkblue
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
        ])
    )

    story.append(
        researcher_table
    )

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # INSTITUTIONS
    # =====================================================

    story.append(
        Paragraph(
            "<b>5. Top Institutions</b>",
            styles["Heading1"]
        )
    )

    institution_data = [
        [
            "Rank",
            "Institution",
            "Impact Score",
            "Projects",
            "Funding (Lakhs)",
        ]
    ]

    for rank, institution in enumerate(
        report.get(
            "top_institutions",
            []
        ),
        start=1
    ):
        institution_data.append([
            rank,
            safe_text(
                institution.get(
                    "institution",
                    ""
                )
            ),
            round(
                float(
                    institution.get(
                        "impact_score",
                        0
                    ) or 0
                ),
                2
            ),
            institution.get(
                "total_projects",
                0
            ),
            institution.get(
                "total_funding_lakhs",
                0
            ),
        ])

    institution_table = Table(
        institution_data,
        repeatRows=1,
        colWidths=[
            0.5 * inch,
            2.2 * inch,
            1.1 * inch,
            1.0 * inch,
            1.2 * inch,
        ],
    )

    institution_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkgreen
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
        ])
    )

    story.append(
        institution_table
    )

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # EXECUTIVE SUMMARY
    # =====================================================

    story.append(
        Paragraph(
            "<b>6. Executive Summary</b>",
            styles["Heading1"]
        )
    )

    story.append(
        Paragraph(
            safe_text(
                report.get(
                    "executive_summary",
                    ""
                )
            ),
            styles["BodyText"]
        )
    )

    story.append(
        Spacer(1, 0.3 * inch)
    )

    # =====================================================
    # RECOMMENDATIONS
    # =====================================================

    story.append(
        Paragraph(
            "<b>7. Recommendations</b>",
            styles["Heading1"]
        )
    )

    for recommendation in report.get(
        "recommendations",
        []
    ):
        story.append(
            Paragraph(
                f"- {safe_text(recommendation)}",
                styles["BodyText"]
            )
        )

        story.append(
            Spacer(1, 0.08 * inch)
        )

    # =====================================================
    # BUILD
    # =====================================================

    doc.build(story)

    # =====================================================
    # VERIFY
    # =====================================================

    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"PDF was not created: {filepath}"
        )

    file_size = os.path.getsize(filepath)

    if file_size <= 0:
        raise ValueError(
            f"Generated PDF is empty: {filepath}"
        )

    with open(
        filepath,
        "rb"
    ) as pdf_file:
        header = pdf_file.read(5)

    if header != b"%PDF-":
        raise ValueError(
            f"Generated file is not a valid PDF. "
            f"Header: {header!r}"
        )

    print(
        f"PDF generated successfully: {filepath}"
    )

    print(
        f"PDF size: {file_size} bytes"
    )

    return filepath