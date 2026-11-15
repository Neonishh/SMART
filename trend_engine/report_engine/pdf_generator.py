"""SMART automated research report PDF renderer.

Accepts the existing build_report() dictionary. Does not recompute or invent
analytics; explanations are conditional on available evidence.
"""
from __future__ import annotations

import math
import re
from html import escape
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def setup_smart_fonts():
    # Matplotlib ships DejaVu Sans, which contains Cyrillic glyphs. No font
    # files need to be copied into the SMART project or distributed to users.
    candidates = []
    try:
        import matplotlib
        candidates.append(Path(matplotlib.get_data_path()) / 'fonts' / 'ttf')
    except (ImportError, AttributeError):
        pass
    candidates.extend([
        Path.home() / 'Library' / 'Fonts',
        Path('/Library/Fonts'),
        Path('/System/Library/Fonts/Supplemental'),
        Path('/usr/share/fonts/truetype/dejavu'),
        Path('/usr/share/fonts/truetype/noto'),
    ])
    for directory in candidates:
        for regular, bold in [
            ('DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'),
            ('NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'),
            ('NotoSansCyrillic-Regular.ttf', 'NotoSansCyrillic-Bold.ttf'),
        ]:
            r, bd = directory / regular, directory / bold
            if not r.is_file() or not bd.is_file():
                continue
            try:
                pdfmetrics.registerFont(TTFont('SMARTUnicode', str(r)))
                pdfmetrics.registerFont(TTFont('SMARTUnicode-Bold', str(bd)))
                pdfmetrics.registerFontFamily('SMARTUnicode', normal='SMARTUnicode', bold='SMARTUnicode-Bold')
                print(f'SMART UNICODE FONT: {r}', flush=True)
                return 'SMARTUnicode', 'SMARTUnicode-Bold'
            except Exception as exc:
                print(f'Font candidate could not be registered ({r}): {exc}', flush=True)
    raise RuntimeError('No Unicode-capable DejaVu/Noto font found. Install matplotlib, which bundles DejaVu Sans: python -m pip install matplotlib')


SMART_FONT, SMART_BOLD = setup_smart_fonts()

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle, Image,
)

GRAPHITE = colors.HexColor('#481C32')  # Burgundy
CYAN = colors.HexColor('#C78D85')  # Rose gold
PALE = colors.HexColor('#F0DBD7')
PAPER = colors.HexColor('#FFF9F6')
INK = colors.HexColor('#402D37')
MUTED = colors.HexColor('#806B75')
LINE = colors.HexColor('#E8D4D7')
WHITE = colors.white
DESIGN_VERSION = 'SMART-DOMAIN-ONLY-2026-11-V4'

PAGE_W, PAGE_H = A4
MARGIN = 19 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

ST = {
    'eyebrow': ParagraphStyle('eyebrow', fontName=SMART_BOLD, fontSize=9, leading=13, textColor=PALE, spaceAfter=11),
    'cover': ParagraphStyle('cover', fontName=SMART_BOLD, fontSize=30, leading=39, textColor=WHITE, spaceAfter=16),
    'coverSub': ParagraphStyle('coverSub', fontName=SMART_FONT, fontSize=13, leading=20, textColor=PALE, spaceAfter=8),
    'heading': ParagraphStyle('heading', fontName=SMART_BOLD, fontSize=17, leading=22, textColor=GRAPHITE, spaceBefore=13, spaceAfter=10, keepWithNext=True),
    'sub': ParagraphStyle('sub', fontName=SMART_BOLD, fontSize=11, leading=15, textColor=GRAPHITE, spaceBefore=10, spaceAfter=6, keepWithNext=True),
    'body': ParagraphStyle('body', fontName=SMART_FONT, fontSize=9.5, leading=15, textColor=INK, spaceAfter=9),
    'small': ParagraphStyle('small', fontName=SMART_FONT, fontSize=8.2, leading=12, textColor=MUTED, spaceAfter=7),
    'formula': ParagraphStyle('formula', fontName=SMART_BOLD, fontSize=8.4, leading=13, textColor=GRAPHITE, spaceAfter=4),
    'metric': ParagraphStyle('metric', fontName=SMART_BOLD, fontSize=18, leading=23, textColor=GRAPHITE, alignment=TA_CENTER),
    'metricLabel': ParagraphStyle('metricLabel', fontName=SMART_BOLD, fontSize=7.5, leading=11, textColor=MUTED, alignment=TA_CENTER),
    'th': ParagraphStyle('th', fontName=SMART_BOLD, fontSize=8, leading=12, textColor=WHITE),
    'td': ParagraphStyle('td', fontName=SMART_FONT, fontSize=8, leading=12, textColor=INK),
}


def p(text, style='body'):
    return Paragraph(escape(str(text)).replace('\n', '<br/>'), ST[style])


def val(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def num(value, percent=False):
    n = val(value)
    if n is None:
        return 'Not available'
    return (f'{n:,.2f}%' if percent else f'{int(n):,}' if n.is_integer() else f'{n:,.2f}')


def first(mapping, *keys):
    if not isinstance(mapping, dict):
        return None
    for key in keys:
        if mapping.get(key) is not None:
            return mapping[key]
    return None


def section(story, heading, intro=None):
    story.append(p(heading, 'heading'))
    if intro:
        story.append(p(intro))


def block(story, heading, body):
    story.append(KeepTogether([p(heading, 'sub'), p(body)]))


def metric_cell(label, value):
    t = Table([[p(value, 'metric')], [p(label, 'metricLabel')]], colWidths=[(CONTENT_W - 18) / 3])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PAPER),
        ('BOX', (0, 0), (-1, -1), .7, LINE),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
    ]))
    return t


def metric_row(story, items):
    for i in range(0, len(items), 3):
        part = items[i:i + 3]
        cells = [metric_cell(label, value) for label, value in part]
        cells += [''] * (3 - len(cells))
        t = Table([cells], colWidths=[(CONTENT_W - 18) / 3] * 3, hAlign='LEFT', spaceAfter=9)
        t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 9)]))
        story.append(t)


def data_table(story, headers, rows, fractions):
    if not rows:
        story.append(p('No verified records were supplied for this section.', 'small'))
        return
    widths = [CONTENT_W * f for f in fractions]
    matrix = [[p(h, 'th') for h in headers]]
    matrix.extend([[p(cell, 'td') for cell in row] for row in rows])
    table = Table(matrix, colWidths=widths, repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GRAPHITE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, PAPER]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), .4, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(table)


def _cover_art(canvas):
    """Editorial cover graphics, drawn in vector so printing stays crisp."""
    from reportlab.lib.utils import ImageReader
    from math import sin, cos, pi
    canvas.setFillColor(GRAPHITE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # Rose-gold side rail and understated section rules
    canvas.setFillColor(CYAN)
    canvas.rect(0, 0, 5 * mm, PAGE_H, stroke=0, fill=1)
    canvas.setStrokeColor(colors.HexColor('#8E5369'))
    canvas.setLineWidth(.55)
    canvas.line(MARGIN, 57 * mm, PAGE_W - MARGIN, 57 * mm)
    canvas.line(MARGIN, PAGE_H - 57 * mm, PAGE_W - MARGIN, PAGE_H - 57 * mm)
    # Delicate network / orbit drawing in upper right
    cx, cy = PAGE_W - 44 * mm, PAGE_H - 100 * mm
    for r in (25 * mm, 38 * mm, 52 * mm):
        canvas.setStrokeColor(colors.HexColor('#79465C'))
        canvas.circle(cx, cy, r, stroke=1, fill=0)
    nodes=[]
    for i in range(12):
        a=2*pi*i/12
        x=cx+38*mm*cos(a); y=cy+38*mm*sin(a)
        nodes.append((x,y))
    canvas.setStrokeColor(colors.HexColor('#9A6276'))
    for i,j in ((0,3),(1,5),(2,7),(4,8),(6,10),(9,11),(0,8),(3,10)):
        canvas.line(*nodes[i],*nodes[j])
    for x,y in nodes:
        canvas.setFillColor(CYAN)
        canvas.circle(x,y,1.5*mm,stroke=0,fill=1)
    # Authentic SMART logo with transparent background, matching burgundy cover.
    logo = Path(__file__).resolve().parent / 'smart_indicator_logo_transparent.png'
    if not logo.is_file():
        logo = Path(__file__).resolve().parent / 'smart_indicator_logo.png'
    if logo.is_file():
        img=ImageReader(str(logo))
        iw,ih=img.getSize()
        w=78*mm; h=w*ih/iw
        canvas.drawImage(img, MARGIN, PAGE_H-33*mm-h, width=w, height=h, mask='auto')
    else:
        canvas.setFont(SMART_BOLD,22)
        canvas.setFillColor(WHITE)
        canvas.drawString(MARGIN, PAGE_H-37*mm, 'SMART')
    canvas.setFillColor(PALE)
    canvas.setFont(SMART_BOLD,8)
    canvas.drawString(MARGIN, 42*mm, 'SMART  /  RESEARCH INTELLIGENCE')
    canvas.setFont(SMART_FONT,8)
    canvas.drawString(MARGIN, 35*mm, 'Evidence-led technology landscape analysis')
    canvas.setFont(SMART_FONT, 7)
    canvas.drawString(MARGIN, 27*mm, 'BURGUNDY & ROSE GOLD EDITION  |  2026')
    canvas.setStrokeColor(CYAN)
    canvas.setLineWidth(2.5)
    canvas.line(MARGIN, 49*mm, MARGIN+35*mm, 49*mm)


def decorate(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        _cover_art(canvas)
    else:
        canvas.setFillColor(GRAPHITE)
        canvas.rect(0, PAGE_H - 16 * mm, PAGE_W, 16 * mm, stroke=0, fill=1)
        canvas.setFillColor(CYAN)
        canvas.rect(0, PAGE_H - 16 * mm, 4 * mm, 16 * mm, stroke=0, fill=1)
        canvas.setFillColor(WHITE)
        canvas.setFont(SMART_BOLD, 8)
        canvas.drawString(MARGIN, PAGE_H - 10 * mm, 'SMART  /  RESEARCH INTELLIGENCE')
        canvas.setStrokeColor(LINE)
        canvas.line(MARGIN, 15 * mm, PAGE_W - MARGIN, 15 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont(SMART_FONT, 8)
        canvas.drawString(MARGIN, 10 * mm, 'SMART  |  Data-driven research intelligence')
        canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f'{doc.page:02d}')
    canvas.restoreState()


UNKNOWN_CATEGORY_LABELS = {'unknown', 'unclassified', 'not classified', 'not available', 'n/a', 'nan', 'none', 'null', ''}


def is_unknown_label(value):
    return value is None or str(value).strip().casefold() in UNKNOWN_CATEGORY_LABELS


def get_chart_axis(columns, numeric):
    return next((c for c in ('year', 'domain_name', 'domain', 'subdomain', 'institution',
        'researcher', 'venue', 'journal', 'conference', 'agency', 'funding_agency',
        'scheme', 'discipline', 'principal_investigator', 'name') if c in columns),
        next((c for c in columns if c not in numeric), None))


def preferred_numeric_columns(numeric):
    priority = ['total_projects', 'total_research', 'total_output', 'publications',
        'research_score', 'ugc_based_score', 'count', 'citations', 'Journal',
        'Conference', 'Total', 'yoy_growth_percent', 'cagr_percent',
        'funding_amount', 'impact_score', 'grants', 'patents', 'theses']
    return sorted(numeric, key=lambda c: priority.index(c) if c in priority else 100)

def chart_columns(rows, columns):
    """Choose numeric measures by observed data, not guessed column names."""
    ignored = {'rank', 'id', 'record_id', 'doi', 'year', 'start_year', 'end_year'}
    numeric = []
    for col in columns:
        if col.lower() in ignored or col.lower().endswith('_id'):
            continue
        values = [val(row.get(col)) for row in rows]
        if sum(v is not None for v in values) >= 2:
            numeric.append(col)
    return numeric


def describe_chart(rows, xcol, ycol, scope):
    points = [(str(r.get(xcol, '')), val(r.get(ycol))) for r in rows]
    points = [(label, value) for label, value in points if value is not None]
    if len(points) < 2:
        return 'Insufficient numeric observations for a comparative interpretation.'
    if xcol == 'year':
        points.sort(key=lambda item: val(item[0]) if val(item[0]) is not None else float('inf'))
        a, b = points[0], points[-1]
        direction = 'increased' if b[1] > a[1] else 'decreased' if b[1] < a[1] else 'remained unchanged'
        return (f'In this source, {ycol} {direction} from {num(a[1])} in {a[0]} '
                f'to {num(b[1])} in {b[0]}. This is a descriptive endpoint comparison, '
                'not a causal explanation or a verified growth-rate calculation.')
    best = max(points, key=lambda item: item[1])
    return (f'Among the classified records plotted, {best[0]} has the largest recorded {ycol} '
            f'({num(best[1])}). Unknown/unclassified entries are excluded from this '
            'ranking. The result is descriptive, source-limited, and does not imply '
            'higher research quality or external performance.')


def analytics_graph(story, item):
    """Draw only specifically approved charts with semantically valid axes.

    These charts describe a domain-wide historical series, not necessarily the
    selected single report year. Empty/ineligible sources are not plotted.
    """
    import io
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    filename = item.get('file')
    rows = item.get('rows') or []
    columns = item.get('columns') or []
    allowed = {
        'domain_yearly_counts.csv': ('year', 'publications', 'line'),
        'domain_yoy_growth.csv': ('year', 'yoy_growth_percent', 'line'),
        'domain_top_researchers.csv': ('researcher', 'research_score', 'bar'),
        'domain_top_venues.csv': ('venue', 'publications', 'bar'),
    }
    if filename not in allowed:
        return False, 'Not an approved technology-specific chart.'
    xcol, metric, kind = allowed[filename]
    if xcol not in columns or metric not in columns:
        return False, f'Required fields {xcol} and/or {metric} are unavailable; no graph drawn.'

    plotted = [r for r in rows if not is_unknown_label(r.get(xcol)) and val(r.get(metric)) is not None]
    if xcol == 'year':
        plotted.sort(key=lambda r: val(r.get('year')) if val(r.get('year')) is not None else float('inf'))
    else:
        plotted.sort(key=lambda r: val(r.get(metric)), reverse=True)
    plotted = plotted[:10]
    if len(plotted) < 2:
        return False, 'Insufficient comparable observations to justify a graph.'
    if kind == 'line' and len({str(r.get(xcol)) for r in plotted}) < 2:
        return False, 'Only one distinct year available.'

    labels = [str(r.get(xcol))[:30] for r in plotted]
    values = [val(r.get(metric)) for r in plotted]
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    fig.patch.set_facecolor('#FFF9F6')
    ax.set_facecolor('#FFF9F6')
    try:
        if kind == 'line':
            ax.plot(range(len(values)), values, marker='o', linewidth=2.3,
                    color='#9D536E', markersize=5)
            if filename == 'domain_yoy_growth.csv':
                ax.axhline(0, color='#6F394F', linewidth=.8, alpha=.65)
                ax.set_ylabel('Year-on-year change (%)')
            else:
                ax.set_ylabel('Recorded publications')
            ax.set_xticks(range(len(labels)), labels)
            ax.set_xlabel('Year')
            ax.grid(axis='y', alpha=.17)
        else:
            ax.barh(range(len(values)), values, color='#9D536E')
            ax.set_yticks(range(len(values)), labels, fontsize=7)
            ax.invert_yaxis()
            ax.set_xlabel('SMART-adapted score' if metric == 'research_score' else 'Recorded publications')
            ax.grid(axis='x', alpha=.17)
        ax.spines[['top', 'right']].set_visible(False)
        fig.tight_layout()
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=150, facecolor='#FFF9F6')
        buffer.seek(0)
        story.append(Image(buffer, width=CONTENT_W, height=CONTENT_W * 3.3 / 7.2))
        story.append(p(f'Chart: {metric} by {xcol}. Source: {filename}. Scope: {item.get("scope")}.', 'small'))
        interpretation = describe_chart(plotted, xcol, metric, item.get('scope'))
        story.append(p('Interpretation: ' + interpretation, 'small'))
        if filename == 'domain_top_researchers.csv':
            story.append(p('These are provisional SMART-adapted UGC-inspired scores. '
                           'Heuristic journal labels do not confirm UGC eligibility. '
                           'The researcher ranking covers 2019-2025 unless its source states otherwise.', 'small'))
        return True, None
    finally:
        plt.close(fig)


def output_composition_chart(story, report):
    """Single defensible chart from the selected technology/year summary row."""
    import io
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    stats = report.get('publication_statistics') or {}
    items = [(name, val(stats.get(name))) for name in
             ('publications', 'patents', 'grants', 'theses')]
    items = [(name, value) for name, value in items if value is not None]
    if not items:
        story.append(p('No verified research-output counts for the requested domain/year. No chart generated.', 'small'))
        return
    fig, ax = plt.subplots(figsize=(7.0, 2.55))
    fig.patch.set_facecolor('#FFF9F6')
    ax.set_facecolor('#FFF9F6')
    labels = [name.capitalize() for name, _ in items]
    values = [value for _, value in items]
    bars = ax.barh(labels, values, color='#A65376')
    ax.invert_yaxis()
    ax.set_xlabel('Recorded outputs')
    ax.grid(axis='x', alpha=.17)
    ax.set_axisbelow(True)
    ax.spines[['top', 'right']].set_visible(False)
    for bar, value in zip(bars, values):
        ax.text(value, bar.get_y() + bar.get_height()/2, f'  {int(value):,}',
                va='center', fontsize=9)
    right = max(values) if values else 0
    ax.set_xlim(0, max(1, right*1.16))
    fig.tight_layout()
    stream = io.BytesIO()
    try:
        fig.savefig(stream, format='png', dpi=160, facecolor='#FFF9F6')
        stream.seek(0)
        story.append(Image(stream, width=CONTENT_W, height=CONTENT_W * 2.55/7))
    finally:
        plt.close(fig)
    year = report.get('year')
    domain = report.get('technology')
    story.append(p(f'Source: domain_yearly_counts.csv. Domain: {domain}. Year: {year}.', 'small'))
    total = val(stats.get('total_output'))
    if total and total > 0:
        winner = max(items, key=lambda item: item[1])
        story.append(p(f'Interpretation: {winner[0].capitalize()} are the largest recorded output category '
                       f'({num(winner[1])} of {num(total)}; {100*winner[1]/total:.2f}%). '
                       'Counts describe dataset activity, not scientific quality.', 'small'))


def analytics_appendix(story, report):
    """Show only approved, verifiably domain-and-year-specific evidence."""
    section(story, '08  Selected technology and year: verified charts',
            'Only research results explicitly matched to both the selected technology '
            'and report year are included. General, unknown-year and all-domain '
            'funding schemes are excluded entirely.')
    output_composition_chart(story, report)
    for item in report.get('analytics_sections') or []:
        filename = item.get('file')
        # Avoid duplicate output tables and suppress unverified broad rankings.
        if filename in ('domain_top_researchers.csv',):
            continue
        rows = item.get('rows') or []
        cols = item.get('columns') or []
        if not rows:
            continue
        story.append(p(item.get('title', 'Verified metric'), 'sub'))
        story.append(p(f'Source: {filename}; Domain: {report.get("technology")}; '
                       f'Year: {report.get("year")}.', 'small'))
        # No graph unless there is an explicitly validated, meaningful series.
        numeric = chart_columns(rows, cols)
        shown = [c for c in cols if c in ('venue','venue_type','type','category',
                                          'publications','count','Journal','Conference')]
        if len(shown) >= 2:
            data_table(story, shown[:4],
                [[str(r.get(c, 'Not available'))[:55] for c in shown[:4]] for r in rows[:8]],
                [1/len(shown[:4])]*len(shown[:4]))
        else:
            story.append(p('The available source is specific to this domain and year '
                           'but lacks a sufficiently clear comparable measure for a chart.', 'small'))
    story.append(p('Excluded by design: discipline_funding.csv, schemes, agencies, '
                   'institution-wide rankings, date-unlabelled source summaries and '
                   '2019-2025 researcher scores. Their scope cannot be represented '
                   'as results for this exact domain and year.', 'small'))


def generate_pdf(report):
    print(f'PDF RENDERER: {DESIGN_VERSION} | {Path(__file__).resolve()}', flush=True)
    if not isinstance(report, dict):
        raise TypeError('generate_pdf requires a report dictionary')
    technology = str(report.get('technology') or '').strip()
    year = report.get('year')
    if not technology or year is None:
        raise ValueError('Report must include technology and year')

    folder = Path(__file__).resolve().parent / 'generated_reports'
    folder.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r'[^a-z0-9]+', '_', technology.lower()).strip('_')
    path = folder / f'{slug}_{year}.pdf'
    publication = report.get('publication_statistics') or {}
    growth = report.get('growth_statistics') or {}
    grants_data = report.get('grant_statistics') or {}
    researchers = report.get('top_researchers') or []
    institutions = report.get('top_institutions') or []
    recs = report.get('recommendations') or []

    counts = {k: first(publication, k) for k in ('publications', 'patents', 'grants', 'theses')}
    total = first(publication, 'total_output')
    yoy = first(growth, 'yoy_growth_percent')
    cagr = first(growth, 'cagr_percent')
    impact = first(grants_data, 'average_impact_score')

    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=23 * mm, bottomMargin=21 * mm,
                            title=f'SMART | {technology} | {year}', author='SMART Research Intelligence')
    story = []

    # COVER
    story += [Spacer(1, 112 * mm), p('ANNUAL TECHNOLOGY INTELLIGENCE  /  ' + str(year), 'eyebrow'),
              p('Research\nIntelligence\nReport', 'cover'),
              Spacer(1, 5 * mm), p(technology, 'coverSub'),
              Spacer(1, 9 * mm), p('Research trends  |  Scholarly output  |  Evidence & insights', 'coverSub'), PageBreak()]

    # EXECUTIVE SUMMARY
    section(story, '01  Executive summary')
    summary = report.get('executive_summary')
    story.append(p(summary if summary else 'No executive summary was supplied by the SMART report builder.'))
    metric_row(story, [('TOTAL OUTPUT', num(total)), ('PUBLICATIONS', num(counts['publications'])),
                       ('PATENTS', num(counts['patents'])), ('GRANTS', num(counts['grants'])),
                       ('THESES', num(counts['theses'])), ('YOY CHANGE', num(yoy, True))])
    section(story, '02  Research output composition')
    data_table(story, ['Output category', 'Recorded count', 'Share of total'], [
        (name.capitalize(), num(count),
         num(100 * val(count) / val(total), True) if val(count) is not None and val(total) not in (None, 0) else 'Not available')
        for name, count in counts.items()
    ], [.45, .25, .30])
    block(story, 'Method and rationale',
          'Category share (%) = (category count / total recorded output) x 100. This measures the distribution of recorded output types, not research quality, commercial value or impact. Shares are omitted when the denominator is unavailable or zero.')
    if val(total) is not None and val(total) > 0:
        known = [(name, val(v)) for name, v in counts.items() if val(v) is not None]
        if known:
            leader = max(known, key=lambda x: x[1])
            block(story, 'Result interpretation',
                  f'{leader[0].capitalize()} is the largest reported category ({num(leader[1])} records; {num(100 * leader[1] / val(total), True)} of total). The figures describe SMART dataset coverage and should not be interpreted as a measure of scientific influence.')
    output_composition_chart(story, report)
    story.append(PageBreak())

    # GROWTH
    section(story, '03  Year-on-year change', 'Change in the selected technology for the selected report year compared with the preceding year.')
    metric_row(story, [('YEAR-ON-YEAR', num(yoy, True))])
    block(story, 'Year-on-year (YoY): formula and purpose',
          'YoY (%) = ((N_current - N_previous) / N_previous) x 100. This measures change between consecutive years and is useful for identifying recent acceleration or decline. It is undefined when the previous count is zero or unavailable.')
    previous = first(growth, 'previous_year_output', 'previous_output', 'previous_count')
    current = first(growth, 'current_year_output', 'current_output', 'current_count')
    if val(current) is not None and val(previous) not in (None, 0):
        story.append(p(f'Illustrative substitution from supplied counts: (({num(current)} - {num(previous)}) / {num(previous)}) x 100 = {num((val(current) - val(previous)) / val(previous) * 100, True)}.', 'formula'))
        if val(yoy) is not None and abs((val(current) - val(previous)) / val(previous) * 100 - val(yoy)) > .15:
            story.append(p('Warning: the supplied YoY percentage does not match the counts shown above. Check metric definitions and source series.', 'small'))
    else:
        story.append(p('The source counts required to reproduce the YoY calculation were not supplied in this report. The displayed percentage has not been independently recalculated here.', 'small'))
    if val(yoy) is None:
        interpretation = 'YoY growth is unavailable, so no short-term direction can be established.'
    elif val(yoy) > 0:
        interpretation = f'The reported YoY change is positive ({num(yoy, True)}), indicating an increase in the measured series compared with the previous year.'
    elif val(yoy) < 0:
        interpretation = f'The reported YoY change is negative ({num(yoy, True)}), indicating a decrease in the measured series compared with the previous year.'
    else:
        interpretation = 'The reported YoY change is 0%, indicating no change in the measured series.'
    block(story, 'YoY interpretation', interpretation)

    story.append(PageBreak())

    # Only display research-ecosystem sections when BOTH the domain and year
    # have been verified in the upstream source. No placeholder tables.
    if researchers or institutions:
        section(story, '04  Research ecosystem',
                'These rankings are included only when their source verifies the selected domain and exact year.')
        if researchers:
            story.append(p('Leading researchers', 'sub'))
            researcher_rows = []
            for idx, r in enumerate(researchers[:10], 1):
                if isinstance(r, dict):
                    researcher_rows.append([
                        str(first(r, 'rank') or idx),
                        str(first(r, 'researcher', 'name') or 'Not available'),
                        str(first(r, 'institution') or 'Not available'),
                        num(first(r, 'research_score', 'score')),
                    ])
            data_table(story, ['Rank', 'Researcher', 'Institution', 'Score'],
                       researcher_rows, [.09, .34, .39, .18])
            methodology = report.get('researcher_score_methodology') or {}
            if isinstance(methodology, dict):
                if methodology.get('classification'):
                    story.append(p('Scoring classification: ' + str(methodology['classification']), 'small'))
                if methodology.get('formula'):
                    story.append(p('Calculation: ' + str(methodology['formula']), 'formula'))
                example = methodology.get('worked_example')
                if isinstance(example, dict) and example.get('steps'):
                    story.append(p(str(example.get('researcher') or 'Researcher') + ': ' +
                                   str(example['steps']) + ' = ' + num(example.get('result')), 'small'))
                story.append(p('A SMART-adapted score is not an official UGC assessment. '
                               'Eligibility and the h-index bonus are distinct from the UGC rubric.', 'small'))
        if institutions:
            story.append(p('Leading institutions by recorded output', 'sub'))
            institution_rows = []
            for idx, r in enumerate(institutions[:10], 1):
                if isinstance(r, dict):
                    institution_rows.append([
                        str(first(r, 'rank') or idx),
                        str(first(r, 'institution') or 'Not available'),
                        num(first(r, 'total_output', 'total_research', 'research_output', 'output')),
                    ])
            data_table(story, ['Rank', 'Institution', 'Output'], institution_rows,
                       [.12, .65, .23])

    section(story, '06  Recommendations')
    if recs:
        for i, recommendation in enumerate(recs, 1):
            if isinstance(recommendation, dict):
                recommendation = first(recommendation, 'recommendation', 'text', 'description') or str(recommendation)
            story.append(p(f'{i}. {recommendation}'))
    else:
        story.append(p('No evidence-based recommendations were supplied by the report builder.'))

    section(story, '07  Methodology and limitations')
    for paragraph in [
        'Data origin: this document renders the structured report supplied by the SMART report builder. The PDF generator does not query the underlying research database or independently validate the CSV sources.',
        'Scope: only sources containing both the selected domain and exact report year are included. Missing/unknown-year data is not substituted or displayed as a result.',
        'Metric definitions: YoY compares adjacent annual observations; CAGR summarizes endpoint growth over a defined interval. Percentages must use the same unit and source series across periods.',
        'Caution: publication volume, patent counts, grants, ranking scores and funding impact are distinct measures. They should not be treated as interchangeable indicators of research quality or societal impact.',
        'Verification: confirm domain/year filters, deduplication, source completeness, growth calculation periods, ranking scores and grant-impact formulas in SMART analytics before publishing conclusions.',
    ]:
        story.append(p(paragraph))

    # The all-domain analytics appendix belongs in a different Overall Report.

    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    print(f'NEW BURGUNDY PDF CREATED: {path.resolve()}', flush=True)
    return str(path)


if __name__ == '__main__':
    print('Import generate_pdf(report) or run report_builder.py to generate a SMART PDF.')
