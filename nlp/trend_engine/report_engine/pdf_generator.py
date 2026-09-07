from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
    KeepTogether
)

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import inch

from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import HorizontalBarChart
from reportlab.graphics.charts.textlabels import Label

import os
from pathlib import Path


# ============================================================
# SMART COLOURS
# ============================================================

NAVY = colors.HexColor("#24456F")
DARK_NAVY = colors.HexColor("#19385D")
ORANGE = colors.HexColor("#F15A29")

LIGHT_BLUE = colors.HexColor("#EEF3F8")
LIGHT_ORANGE = colors.HexColor("#FFF1EA")

LIGHT_GREY = colors.HexColor("#F4F6F8")
MID_GREY = colors.HexColor("#D5DCE3")

DARK_GREY = colors.HexColor("#4A4A4A")

WHITE = colors.white
BLACK = colors.black

# A4 page width is 8.27in. With 40pt margins on both sides,
# the usable frame is about 7.16in. Keep report tables at 7.0in
# or less so ReportLab never clips the left/right columns.
CONTENT_WIDTH = 7.0 * inch


# ============================================================
# GLOBAL STYLES
# ============================================================

_styles = getSampleStyleSheet()

styles = {

    "Title": ParagraphStyle(
        "SMARTTitle",
        parent=_styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=4
    ),

    "Subtitle": ParagraphStyle(
        "SMARTSubtitle",
        parent=_styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=DARK_GREY,
        spaceAfter=8
    ),

    "Section": ParagraphStyle(
        "SMARTSection",
        parent=_styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=NAVY,
        spaceBefore=5,
        spaceAfter=5
    ),

    "SubSection": ParagraphStyle(
        "SMARTSubSection",
        parent=_styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=3
    ),

    "Body": ParagraphStyle(
        "SMARTBody",
        parent=_styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=DARK_GREY,
        alignment=TA_LEFT,
        spaceAfter=4
    ),

    "BodySmall": ParagraphStyle(
        "SMARTBodySmall",
        parent=_styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=DARK_GREY,
        alignment=TA_LEFT,
        spaceAfter=3
    ),

    "Explanation": ParagraphStyle(
        "SMARTExplanation",
        parent=_styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_GREY,
        spaceAfter=3
    ),

    "MetricValue": ParagraphStyle(
        "SMARTMetricValue",
        parent=_styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=19,
        textColor=NAVY,
        alignment=TA_CENTER
    ),

    "MetricLabel": ParagraphStyle(
        "SMARTMetricLabel",
        parent=_styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=DARK_GREY,
        alignment=TA_CENTER
    ),

    "Recommendation": ParagraphStyle(
        "SMARTRecommendation",
        parent=_styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=DARK_GREY,
        leftIndent=7,
        firstLineIndent=-5,
        spaceAfter=2
    ),

    "CenterSmall": ParagraphStyle(
        "SMARTCenterSmall",
        parent=_styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=DARK_GREY,
        alignment=TA_CENTER
    )
}


# ============================================================
# SAFE VALUE HELPERS
# ============================================================

def safe_value(value, default=0):

    if value is None:
        return default

    if isinstance(value, str):

        if value.strip() == "":
            return default

        try:
            return float(value)
        except ValueError:
            return value

    return value


def format_number(value):

    value = safe_value(value, 0)

    try:

        value = float(value)

        if value.is_integer():
            return f"{int(value):,}"

        return f"{value:,.2f}"

    except:

        return str(value)


def format_percent(value):

    value = safe_value(value, 0)

    try:

        return f"{float(value):.2f}%"

    except:

        return str(value)


# ============================================================
# GET REPORT VALUE
# ============================================================

def get_report_value(report, *keys, default=0):

    for key in keys:

        if key in report:

            value = report[key]

            if value is not None:
                return value

    return default


# ============================================================
# FIND RESEARCH TREND CHART
# ============================================================

def find_chart(report, technology):

    """
    Searches for the generated research trend image.

    It checks:

    1. Path stored inside report
    2. charts_module/charts/images
    3. trend_engine/charts_module/charts/images
    4. generated chart folders recursively
    """

    # --------------------------------------------------------
    # 1. Check report for chart path
    # --------------------------------------------------------

    possible_report_keys = [
        "chart_path",
        "trend_chart",
        "research_trend_chart",
        "chart"
    ]

    for key in possible_report_keys:

        value = report.get(key)

        if value:

            path = Path(str(value))

            if path.exists():

                return str(path)

    # --------------------------------------------------------
    # 2. Determine project root
    # --------------------------------------------------------

    current_file = Path(__file__).resolve()

    report_engine_dir = current_file.parent

    trend_engine_dir = report_engine_dir.parent

    project_root = trend_engine_dir.parent

    # --------------------------------------------------------
    # 3. Possible chart directories
    # --------------------------------------------------------

    chart_directories = [

        trend_engine_dir
        / "charts_module"
        / "charts"
        / "images",

        trend_engine_dir
        / "charts_module"
        / "images",

        project_root
        / "trend_engine"
        / "charts_module"
        / "charts"
        / "images",

        project_root
        / "trend_engine"
        / "charts_module"
        / "images"
    ]

    # --------------------------------------------------------
    # Search expected filename
    # --------------------------------------------------------

    technology_filename = (
        technology.lower()
        .replace("&", "and")
        .replace(" ", "_")
        .replace("/", "_")
    )

    for directory in chart_directories:

        if not directory.exists():
            continue

        candidates = [

            directory
            / f"{technology_filename}.png",

            directory
            / f"{technology_filename}_trend.png",

            directory
            / "domain_trend.png"
        ]

        for candidate in candidates:

            if candidate.exists():

                return str(candidate)

    # --------------------------------------------------------
    # Recursive search
    # --------------------------------------------------------

    search_root = project_root

    if search_root.exists():

        for png in search_root.rglob("*.png"):

            filename = png.name.lower()

            if (
                technology_filename in filename
                or "domain_trend" in filename
                or "trend" in filename
            ):

                return str(png)

    return None


# ============================================================
# HEADER + FOOTER
# ============================================================

def add_header_footer(canvas, doc):

    canvas.saveState()

    width, height = A4

    # --------------------------------------------------------
    # TOP NAVY LINE
    # --------------------------------------------------------

    canvas.setFillColor(NAVY)

    canvas.rect(
        0,
        height - 28,
        width,
        28,
        stroke=0,
        fill=1
    )

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    canvas.setFillColor(WHITE)

    canvas.setFont(
        "Helvetica-Bold",
        8
    )

    canvas.drawString(
        40,
        height - 18,
        "SMART"
    )

    canvas.setFont(
        "Helvetica",
        7
    )

    canvas.drawString(
        78,
        height - 18,
        "Systematic Monitoring & Analysis for Research and Technology"
    )

    # --------------------------------------------------------
    # FOOTER LINE
    # --------------------------------------------------------

    canvas.setStrokeColor(
        MID_GREY
    )

    canvas.setLineWidth(
        0.5
    )

    canvas.line(
        40,
        30,
        width - 40,
        30
    )

    # --------------------------------------------------------
    # FOOTER TEXT
    # --------------------------------------------------------

    canvas.setFillColor(
        DARK_GREY
    )

    canvas.setFont(
        "Helvetica",
        7
    )

    canvas.drawString(
        40,
        18,
        "SMART | Research Intelligence Report"
    )

    canvas.drawRightString(
        width - 40,
        18,
        f"Page {doc.page}"
    )

    canvas.restoreState()


# ============================================================
# RESEARCHER BAR CHART
# ============================================================

def create_researcher_chart(researchers):

    if not researchers:

        return None

    top = researchers[:5]

    values = []
    labels = []

    for researcher in top:

        score = safe_value(
            researcher.get(
                "research_score",
                researcher.get(
                    "score",
                    0
                )
            ),
            0
        )

        try:

            score = float(score)

        except:

            score = 0

        values.append(score)

        name = researcher.get(
            "researcher",
            researcher.get(
                "name",
                "Unknown"
            )
        )

        labels.append(
            str(name)[:22]
        )

    if not values:

        return None

    drawing = Drawing(
        520,
        190
    )

    chart = HorizontalBarChart()

    chart.x = 135
    chart.y = 20

    chart.width = 350
    chart.height = 140

    chart.data = [
        values
    ]

    chart.categoryAxis.categoryNames = labels

    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7

    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7

    chart.valueAxis.valueMin = 0

    maximum = max(values)

    if maximum > 0:

        chart.valueAxis.valueMax = (
            maximum * 1.2
        )

        chart.valueAxis.valueStep = max(
            1,
            round(maximum / 5)
        )

    chart.bars[0].fillColor = NAVY
    chart.bars[0].strokeColor = NAVY

    chart.barSpacing = 5

    drawing.add(
        chart
    )

    title = Label()

    title.setOrigin(
        135,
        170
    )

    title.setText(
        "Top Researchers by Research Score"
    )

    title.fontName = "Helvetica-Bold"
    title.fontSize = 10
    title.fillColor = NAVY

    drawing.add(
        title
    )

    return drawing


# ============================================================
# INSTITUTION BAR CHART
# ============================================================

def create_institution_chart(institutions):

    if not institutions:

        return None

    top = institutions[:7]

    values = []
    labels = []

    for institution in top:

        output = institution.get(
            "total_output",
            institution.get(
                "research_output",
                institution.get(
                    "output",
                    0
                )
            )
        )

        output = safe_value(
            output,
            0
        )

        try:

            output = float(output)

        except:

            output = 0

        values.append(output)

        name = institution.get(
            "institution",
            "Unknown"
        )

        labels.append(
            str(name)[:28]
        )

    # --------------------------------------------------------
    # If all values are zero, no chart
    # --------------------------------------------------------

    if not values or max(values) == 0:

        return None

    drawing = Drawing(
        520,
        205
    )

    chart = HorizontalBarChart()

    chart.x = 170
    chart.y = 20

    chart.width = 315
    chart.height = 155

    chart.data = [
        values
    ]

    chart.categoryAxis.categoryNames = labels

    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 6.5

    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7

    chart.valueAxis.valueMin = 0

    maximum = max(values)

    chart.valueAxis.valueMax = (
        maximum * 1.2
    )

    chart.valueAxis.valueStep = max(
        1,
        round(maximum / 5)
    )

    chart.bars[0].fillColor = ORANGE
    chart.bars[0].strokeColor = ORANGE

    chart.barSpacing = 4

    drawing.add(
        chart
    )

    title = Label()

    title.setOrigin(
        170,
        190
    )

    title.setText(
        "Leading Institutions by Research Output"
    )

    title.fontName = "Helvetica-Bold"
    title.fontSize = 10
    title.fillColor = NAVY

    drawing.add(
        title
    )

    return drawing


# ============================================================
# METRIC CARD
# ============================================================

def create_metric_card(
    value,
    label
):

    return Table(

        [[
            Paragraph(
                str(value),
                styles["MetricValue"]
            )
        ],
        [
            Paragraph(
                label,
                styles["MetricLabel"]
            )
        ]],

        colWidths=[
            1.65 * inch
        ],

        rowHeights=[
            0.38 * inch,
            0.25 * inch
        ]
    )


# ============================================================
# GENERATE PDF
# ============================================================

def generate_pdf(report):

    # ========================================================
    # OUTPUT DIRECTORY
    # ========================================================

    output_directory = (
        Path(__file__).resolve().parent
        / "generated_reports"
    )

    output_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    # ========================================================
    # BASIC REPORT INFORMATION
    # ========================================================

    technology = report.get(
        "technology",
        "Unknown Technology"
    )

    year = report.get(
        "year",
        "Unknown Year"
    )

    # ========================================================
    # FILE NAME
    # ========================================================

    filename = (

        technology
        .lower()
        .replace("&", "and")
        .replace(" ", "_")
        .replace("/", "_")

        + "_"

        + str(year)

        + ".pdf"
    )

    filepath = (
        output_directory
        / filename
    )

    # ========================================================
    # REPORT DATA
    # ========================================================

    publication_statistics = report.get(
        "publication_statistics",
        {}
    )

    growth_statistics = report.get(
        "growth_statistics",
        {}
    )

    grant_statistics = report.get(
        "grant_statistics",
        {}
    )

    researchers = report.get(
        "top_researchers",
        []
    )

    institutions = report.get(
        "top_institutions",
        []
    )

    recommendations = report.get(
        "recommendations",
        []
    )

    executive_summary = report.get(
        "executive_summary",
        ""
    )

    # ========================================================
    # METRICS
    # ========================================================

    publications = safe_value(
        publication_statistics.get(
            "publications",
            0
        ),
        0
    )

    patents = safe_value(
        publication_statistics.get(
            "patents",
            0
        ),
        0
    )

    grants = safe_value(
        publication_statistics.get(
            "grants",
            0
        ),
        0
    )

    theses = safe_value(
        publication_statistics.get(
            "theses",
            0
        ),
        0
    )

    total_output = safe_value(
        publication_statistics.get(
            "total_output",
            publications
            + patents
            + grants
            + theses
        ),
        0
    )

    yoy = safe_value(
        growth_statistics.get(
            "yoy_growth_percent",
            0
        ),
        0
    )

    cagr = safe_value(
        growth_statistics.get(
            "cagr_percent",
            0
        ),
        0
    )

    avg_impact = safe_value(
        grant_statistics.get(
            "average_impact_score",
            0
        ),
        0
    )

    # ========================================================
    # PAGE SETTINGS
    # ========================================================

    doc = SimpleDocTemplate(

        str(filepath),

        pagesize=A4,

        rightMargin=40,
        leftMargin=40,

        topMargin=42,
        bottomMargin=42,

        title=(
            f"SMART Technology Report - "
            f"{technology} - {year}"
        ),

        author="SMART Research Intelligence"
    )

    story = []

    # ========================================================
    # PAGE 1
    # EXECUTIVE SUMMARY
    # ========================================================

    story.append(
        Paragraph(
            "SMART TECHNOLOGY REPORT",
            styles["Title"]
        )
    )

    story.append(
        Paragraph(
            f"<b>{technology}</b> | "
            f"Research Intelligence Overview | "
            f"<b>{year}</b>",
            styles["Subtitle"]
        )
    )

    # --------------------------------------------------------
    # Executive Summary + Year Snapshot
    # --------------------------------------------------------

    executive = Paragraph(
        executive_summary,
        styles["Body"]
    )

    year_snapshot = Paragraph(

        f"<b>{year} Snapshot</b><br/><br/>"
        f"The selected technology recorded "
        f"<b>{format_number(total_output)}</b> total "
        f"research outputs during the selected year. "
        f"Publications contributed "
        f"<b>{format_number(publications)}</b> outputs, "
        f"while patents contributed "
        f"<b>{format_number(patents)}</b>.<br/><br/>"
        f"Grant and thesis activity recorded "
        f"<b>{format_number(grants)}</b> and "
        f"<b>{format_number(theses)}</b> outputs respectively.",

        styles["BodySmall"]
    )

    # IMPORTANT: keep this table <= 7.0in. The previous 3.65 +
    # 3.65in layout exceeded the usable A4 frame and caused the
    # Executive Summary column to be clipped in the PDF viewer.
    summary_table = Table(

        [[
            [
                Paragraph(
                    "Executive Summary",
                    styles["SubSection"]
                ),

                executive
            ],

            [
                Paragraph(
                    "Year Overview",
                    styles["SubSection"]
                ),

                year_snapshot
            ]
        ]],

        colWidths=[
            3.50 * inch,
            3.50 * inch
        ]
    )

    summary_table.setStyle(

        TableStyle([

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                5
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                5
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                0
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                0
            )
        ])
    )

    story.append(
        summary_table
    )

    story.append(
        Spacer(1, 8)
    )

    # --------------------------------------------------------
    # KPI CARDS
    # --------------------------------------------------------

    metric_cards = Table(

        [[

            create_metric_card(
                format_number(publications),
                "PUBLICATIONS"
            ),

            create_metric_card(
                format_number(patents),
                "PATENTS"
            ),

            create_metric_card(
                format_number(grants),
                "GRANTS"
            ),

            create_metric_card(
                format_number(theses),
                "THESES"
            )

        ]],

        colWidths=[
            1.72 * inch,
            1.72 * inch,
            1.72 * inch,
            1.72 * inch
        ]
    )

    metric_cards.setStyle(

        TableStyle([

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                MID_GREY
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            )
        ])
    )

    story.append(
        metric_cards
    )

    story.append(
        Spacer(1, 8)
    )

    # --------------------------------------------------------
    # TOTAL OUTPUT
    # --------------------------------------------------------

    total_table = Table(

        [[
            Paragraph(
                "TOTAL RESEARCH OUTPUT",
                styles["MetricLabel"]
            ),

            Paragraph(
                format_number(total_output),
                styles["MetricValue"]
            )
        ]],

        colWidths=[
            4.90 * inch,
            2.10 * inch
        ],

        rowHeights=[
            0.42 * inch
        ]
    )

    total_table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (0, 0),
                NAVY
            ),

            (
                "BACKGROUND",
                (1, 0),
                (1, 0),
                ORANGE
            ),

            (
                "TEXTCOLOR",
                (0, 0),
                (-1, -1),
                WHITE
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "ALIGN",
                (0, 0),
                (-1, -1),
                "CENTER"
            )
        ])
    )

    story.append(
        total_table
    )

    story.append(
        Spacer(1, 8)
    )

    # --------------------------------------------------------
    # GROWTH METRICS
    # --------------------------------------------------------

    growth_table = Table(

        [[
            Paragraph(
                "YEAR-ON-YEAR GROWTH",
                styles["MetricLabel"]
            ),

            Paragraph(
                "COMPOUND ANNUAL GROWTH RATE",
                styles["MetricLabel"]
            )
        ],
        [
            Paragraph(
                format_percent(yoy),
                styles["MetricValue"]
            ),

            Paragraph(
                format_percent(cagr),
                styles["MetricValue"]
            )
        ]],

        colWidths=[
            3.50 * inch,
            3.50 * inch
        ],

        rowHeights=[
            0.30 * inch,
            0.42 * inch
        ]
    )

    growth_table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                LIGHT_ORANGE
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.6,
                colors.HexColor("#E6B8A5")
            ),

            (
                "INNERGRID",
                (0, 0),
                (-1, -1),
                0.4,
                colors.HexColor("#E6B8A5")
            ),

            (
                "ALIGN",
                (0, 0),
                (-1, -1),
                "CENTER"
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            )
        ])
    )

    story.append(
        growth_table
    )

    story.append(
        Spacer(1, 7)
    )

    # --------------------------------------------------------
    # UNDERSTANDING GROWTH
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Understanding the Growth Metrics",
            styles["SubSection"]
        )
    )

    story.append(

        Paragraph(

            "<b>YoY Growth:</b> Measures how much research "
            "output changed compared with the previous year. "
            "A positive value means output increased, while "
            "a negative value means output declined.<br/><br/>"

            "<b>CAGR:</b> Measures the average annual growth "
            "rate over the entire analysed period. Unlike YoY, "
            "which focuses on one year-to-year change, CAGR "
            "provides a longer-term view of the research trend.",

            styles["BodySmall"]
        )
    )

    # --------------------------------------------------------
    # GRANT IMPACT
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Grant Impact",
            styles["SubSection"]
        )
    )

    story.append(

        Paragraph(

            f"The average Grant Impact Score for the selected "
            f"technology was <b>{format_number(avg_impact)}</b>. "
            f"This provides an additional indicator for "
            f"understanding the impact associated with "
            f"grant-supported research activity.",

            styles["BodySmall"]
        )
    )

    # ========================================================
    # PAGE 2
    # RESEARCH TREND
    # ========================================================

    story.append(
        PageBreak()
    )

    story.append(
        Paragraph(
            "5. Research Trend & Year Analysis",
            styles["Section"]
        )
    )

    story.append(

        Paragraph(

            f"Research activity for "
            f"<b>{technology}</b> across the analysed "
            f"period, with emphasis on the selected year "
            f"<b>{year}</b>.",

            styles["BodySmall"]
        )
    )

    # --------------------------------------------------------
    # TREND GRAPH
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Research Output Trend",
            styles["SubSection"]
        )
    )

    chart_path = find_chart(
        report,
        technology
    )

    if chart_path:

        chart_image = Image(

            chart_path,

            width=7.0 * inch,

            height=3.33 * inch
        )

        chart_image.hAlign = "CENTER"

        story.append(
            chart_image
        )

        story.append(

            Paragraph(

                f"Figure 1. Year-wise research output trend "
                f"for {technology}. The graph compares "
                f"publications, patents, grants and theses.",

                styles["Explanation"]
            )
        )

    else:

        story.append(

            Paragraph(

                "The research trend chart is currently "
                "unavailable for this report.",

                styles["BodySmall"]
            )
        )

    story.append(
        Spacer(1, 5)
    )

    # --------------------------------------------------------
    # TREND INTERPRETATION
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Trend Interpretation",
            styles["SubSection"]
        )
    )

    try:
        yoy_number = float(yoy)
    except:
        yoy_number = 0

    try:
        cagr_number = float(cagr)
    except:
        cagr_number = 0

    if yoy_number > 0:

        yoy_text = (

            f"Research output increased by "
            f"<b>{format_percent(yoy_number)}</b> "
            f"compared with the previous year. "
            f"This indicates positive short-term momentum."
        )

    elif yoy_number < 0:

        yoy_text = (

            f"Research output decreased by "
            f"<b>{format_percent(abs(yoy_number))}</b> "
            f"compared with the previous year. "
            f"This indicates a short-term decline in output."
        )

    else:

        yoy_text = (

            "Research output remained approximately stable "
            "compared with the previous year."
        )

    if cagr_number > 0:

        cagr_text = (

            f"Over the longer period, the domain recorded "
            f"a positive CAGR of <b>{format_percent(cagr_number)}</b>. "
            f"This indicates that despite year-to-year "
            f"fluctuations, research activity has grown "
            f"overall."
        )

    elif cagr_number < 0:

        cagr_text = (

            f"The domain recorded a CAGR of "
            f"<b>{format_percent(cagr_number)}</b>, indicating "
            f"an overall long-term decline."
        )

    else:

        cagr_text = (

            "The long-term CAGR is approximately zero, "
            "indicating limited overall growth across "
            "the analysed period."
        )

    interpretation_table = Table(

        [[
            Paragraph(
                "<b>Short-Term View</b><br/>"
                + yoy_text,
                styles["BodySmall"]
            ),

            Paragraph(
                "<b>Long-Term View</b><br/>"
                + cagr_text,
                styles["BodySmall"]
            )
        ]],

        colWidths=[
            3.5 * inch,
            3.5 * inch
        ]
    )

    interpretation_table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (0, 0),
                LIGHT_BLUE
            ),

            (
                "BACKGROUND",
                (1, 0),
                (1, 0),
                LIGHT_ORANGE
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.5,
                MID_GREY
            ),

            (
                "INNERGRID",
                (0, 0),
                (-1, -1),
                0.5,
                MID_GREY
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        interpretation_table
    )

    story.append(
        Spacer(1, 7)
    )

    # --------------------------------------------------------
    # YEAR OVERVIEW
    # --------------------------------------------------------

    story.append(
        Paragraph(
            f"{year} Research Overview",
            styles["SubSection"]
        )
    )

    story.append(

        Paragraph(

            f"In <b>{year}</b>, the "
            f"<b>{technology}</b> domain recorded "
            f"<b>{format_number(total_output)}</b> total "
            f"research outputs. This included "
            f"<b>{format_number(publications)}</b> publications, "
            f"<b>{format_number(patents)}</b> patents, "
            f"<b>{format_number(grants)}</b> grants and "
            f"<b>{format_number(theses)}</b> theses.",

            styles["BodySmall"]
        )
    )

    # --------------------------------------------------------
    # FUNDING OBSERVATION
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Funding Observation",
            styles["SubSection"]
        )
    )

    if float(grants) == 0:

        funding_text = (

            f"The selected year contains no grant-related "
            f"outputs in the current dataset. Therefore, "
            f"grant activity does not contribute to the "
            f"research-output total for {year}. The Grant "
            f"Impact Score is retained as a supplementary "
            f"funding-related indicator."
        )

    else:

        funding_text = (

            f"The selected year contains "
            f"<b>{format_number(grants)}</b> grant-related "
            f"outputs with an average Grant Impact Score "
            f"of <b>{format_number(avg_impact)}</b>."
        )

    story.append(
        Paragraph(
            funding_text,
            styles["BodySmall"]
        )
    )

    # ========================================================
    # PAGE 3
    # RESEARCH LANDSCAPE
    # ========================================================

    story.append(
        PageBreak()
    )

    story.append(
        Paragraph(
            "6. Research Landscape",
            styles["Section"]
        )
    )

    story.append(

        Paragraph(

            f"This section identifies the leading researchers "
            f"and institutions associated with "
            f"<b>{technology}</b>.",

            styles["BodySmall"]
        )
    )

    # --------------------------------------------------------
    # TOP RESEARCHERS
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "Top Researchers",
            styles["SubSection"]
        )
    )

    researcher_chart = create_researcher_chart(
        researchers
    )

    if researcher_chart:

        story.append(
            researcher_chart
        )

    # --------------------------------------------------------
    # RESEARCHER TABLE
    # --------------------------------------------------------

    researcher_data = [

        [
            "Rank",
            "Researcher",
            "Institution",
            "Score"
        ]

    ]

    for researcher in researchers[:5]:

        rank = researcher.get(
            "rank",
            ""
        )

        name = researcher.get(
            "researcher",
            researcher.get(
                "name",
                ""
            )
        )

        institution = researcher.get(
            "institution",
            ""
        )

        score = safe_value(
            researcher.get(
                "research_score",
                researcher.get(
                    "score",
                    0
                )
            ),
            0
        )

        try:
            score_text = f"{float(score):.2f}"
        except:
            score_text = str(score)

        researcher_data.append(

            [
                rank,
                str(name),
                str(institution),
                score_text
            ]
        )

    if len(researcher_data) > 1:

        researcher_table = Table(

            researcher_data,

            colWidths=[
                0.50 * inch,
                1.85 * inch,
                3.70 * inch,
                0.95 * inch
            ],

            repeatRows=1
        )

        researcher_table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    NAVY
                ),

                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    WHITE
                ),

                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold"
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    7.5
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    MID_GREY
                ),

                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [WHITE, LIGHT_GREY]
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE"
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    4
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    4
                )
            ])
        )

        story.append(
            researcher_table
        )

    # --------------------------------------------------------
    # LEADING INSTITUTIONS
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "7. Leading Institutions",
            styles["SubSection"]
        )
    )

    story.append(

        Paragraph(

            "Institutions are ranked according to their "
            "research output within the selected technology.",

            styles["BodySmall"]
        )
    )

    institution_chart = create_institution_chart(
        institutions
    )

    if institution_chart:

        story.append(
            institution_chart
        )

    else:

        story.append(

            Paragraph(

                "Institution research-output values are not "
                "available in the report data for the selected "
                "technology/year, so a meaningful institution "
                "comparison chart cannot be displayed.",

                styles["Explanation"]
            )
        )

    # --------------------------------------------------------
    # INSTITUTION TABLE
    # --------------------------------------------------------

    institution_data = [

        [
            "Rank",
            "Institution",
            "Research Output"
        ]

    ]

    for institution in institutions[:7]:

        rank = institution.get(
            "rank",
            ""
        )

        name = institution.get(
            "institution",
            ""
        )

        # Prefer an actual research-output field. If the report
        # contains component counts, calculate the total. Do not
        # silently turn missing institution output into a false 0.
        output_keys = [
            "total_output",
            "total_research",
            "research_output",
            "output"
        ]

        output = None
        for key in output_keys:
            if institution.get(key) is not None:
                output = institution.get(key)
                break

        if output is None:
            components = [
                institution.get("publications"),
                institution.get("patents"),
                institution.get("grants"),
                institution.get("theses")
            ]
            numeric_components = []
            for value in components:
                try:
                    numeric_components.append(float(value))
                except (TypeError, ValueError):
                    pass

            if numeric_components:
                output = sum(numeric_components)

        if output is None:
            output_text = "N/A"
        else:
            output_text = format_number(output)

        institution_data.append(

            [
                rank,
                str(name),
                output_text
            ]
        )

    if len(institution_data) > 1:

        institution_table = Table(

            institution_data,

            colWidths=[
                0.50 * inch,
                5.40 * inch,
                1.10 * inch
            ],

            repeatRows=1
        )

        institution_table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    ORANGE
                ),

                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    WHITE
                ),

                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold"
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    7.5
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    MID_GREY
                ),

                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [WHITE, LIGHT_GREY]
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE"
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    4
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    4
                )
            ])
        )

        story.append(
            institution_table
        )

    # --------------------------------------------------------
    # KEY INSIGHTS
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "8. Key Insights",
            styles["SubSection"]
        )
    )

    insights = []

    if yoy_number > 0:

        insights.append(

            f"Research output increased by "
            f"{format_percent(yoy_number)} compared "
            f"with the previous year."
        )

    elif yoy_number < 0:

        insights.append(

            f"Research output decreased by "
            f"{format_percent(abs(yoy_number))} compared "
            f"with the previous year."
        )

    else:

        insights.append(
            "Research output remained stable compared "
            "with the previous year."
        )

    if cagr_number > 0:

        insights.append(

            f"The positive CAGR of "
            f"{format_percent(cagr_number)} indicates "
            f"long-term growth across the analysed period."
        )

    elif cagr_number < 0:

        insights.append(

            f"The negative CAGR of "
            f"{format_percent(abs(cagr_number))} indicates "
            f"long-term decline."
        )

    if researchers:

        top_researcher = researchers[0]

        researcher_name = top_researcher.get(
            "researcher",
            "N/A"
        )

        researcher_score = safe_value(
            top_researcher.get(
                "research_score",
                top_researcher.get(
                    "score",
                    0
                )
            ),
            0
        )

        try:
            researcher_score = float(
                researcher_score
            )
        except:
            researcher_score = 0

        insights.append(

            f"<b>{researcher_name}</b> ranked first "
            f"with a research score of "
            f"<b>{researcher_score:.2f}</b>."
        )

    insights.append(

        f"The selected year recorded "
        f"<b>{format_number(total_output)}</b> total "
        f"research outputs."
    )

    for insight in insights:

        story.append(

            Paragraph(
                "• " + insight,
                styles["Recommendation"]
            )
        )

    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    story.append(
        Paragraph(
            "9. Recommendations",
            styles["SubSection"]
        )
    )

    if recommendations:

        for recommendation in recommendations:

            story.append(

                Paragraph(
                    "• " + str(recommendation),
                    styles["Recommendation"]
                )
            )

    else:

        default_recommendations = [

            "Continue monitoring year-wise research output "
            "to identify emerging and declining trends.",

            "Encourage collaboration between high-performing "
            "researchers and institutions.",

            "Prioritise research support in areas showing "
            "sustained long-term growth.",

            "Use research output, researcher activity and "
            "funding indicators together for evidence-based "
            "decision making."
        ]

        for recommendation in default_recommendations:

            story.append(

                Paragraph(
                    "• " + recommendation,
                    styles["Recommendation"]
                )
            )

    # --------------------------------------------------------
    # REPORT NOTE
    # --------------------------------------------------------

    story.append(
        Spacer(1, 6)
    )

    note_table = Table(

        [[
            Paragraph(

                "<b>SMART Report Note:</b> "
                "This report is automatically generated "
                "from the research datasets and analytical "
                "outputs processed by the SMART trend engine.",

                styles["Explanation"]
            )
        ]],

        colWidths=[
            7.0 * inch
        ]
    )

    note_table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                LIGHT_GREY
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.5,
                MID_GREY
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                5
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                5
            )
        ])
    )

    story.append(
        note_table
    )

    # ========================================================
    # BUILD
    # ========================================================

    doc.build(

        story,

        onFirstPage=add_header_footer,

        onLaterPages=add_header_footer
    )

    print(
        f"\nPDF generated successfully:"
        f"\n{filepath}\n"
    )

    return str(filepath)


# ============================================================
# OPTIONAL DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print(
        "pdf_generator.py contains the generate_pdf() "
        "function."
    )

    print(
        "Run report_builder.py to generate a complete "
        "SMART report."
    )