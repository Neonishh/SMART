"""SMART Overall PDF renderer (Burgundy / Rose Gold).

Independent of the domain-specific pdf_generator.py. Uses verified section data
from overall_report_builder.py; no arbitrary CSV graphs are created here.
"""
from __future__ import annotations

import math
import re
from html import escape
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, HRFlowable
)

BASE = Path(__file__).resolve().parent
PDF_DIR = BASE / 'generated_reports'
BUR = '#481C32'
ROSE = '#C78D85'
INK = '#392B36'
MUTED = '#806B76'
PAPER = '#FFF9F6'
LIGHT = '#F6ECEB'
GRID = '#E9D8D8'
WHITE = '#FFFFFF'
P_W, P_H = A4
M = 18 * mm
W = P_W - 2*M


def fonts():
    # matplotlib bundles/supports a Unicode TTF. Do not distribute the font.
    candidates = [
        ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
        ('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',None),
    ]
    try:
        regular = font_manager.findfont('DejaVu Sans', fallback_to_default=True)
        bold = font_manager.findfont(font_manager.FontProperties(family='DejaVu Sans',weight='bold'),fallback_to_default=True)
        candidates.append((regular,bold))
    except Exception:
        pass
    for reg,bold in candidates:
        try:
            if Path(reg).is_file():
                pdfmetrics.registerFont(TTFont('SmartOverall',reg))
                if bold and Path(bold).is_file():
                    pdfmetrics.registerFont(TTFont('SmartOverallBold',bold))
                else:
                    pdfmetrics.registerFont(TTFont('SmartOverallBold',reg))
                pdfmetrics.registerFontFamily('SmartOverall',normal='SmartOverall',bold='SmartOverallBold',italic='SmartOverall',boldItalic='SmartOverallBold')
                return 'SmartOverall','SmartOverallBold'
        except Exception:
            continue
    return 'Helvetica','Helvetica-Bold'

REG,BOLD=fonts()
S = {
    'eyebrow':ParagraphStyle('overall_eyebrow',fontName=BOLD,fontSize=9,leading=14,textColor=colors.HexColor(ROSE),spaceAfter=9),
    'cover':ParagraphStyle('overall_cover',fontName=BOLD,fontSize=26,leading=35,textColor=colors.white,spaceAfter=11),
    'cover_sub':ParagraphStyle('overall_coversub',fontName=REG,fontSize=12,leading=20,textColor=colors.HexColor('#F0DDDF'),spaceAfter=8),
    'h1':ParagraphStyle('overall_h1',fontName=BOLD,fontSize=15,leading=21,textColor=colors.HexColor(BUR),spaceBefore=15,spaceAfter=9,keepWithNext=True),
    'body':ParagraphStyle('overall_body',fontName=REG,fontSize=9,leading=14,textColor=colors.HexColor(INK),spaceAfter=7),
    'note':ParagraphStyle('overall_note',fontName=REG,fontSize=8,leading=12,textColor=colors.HexColor(MUTED),spaceAfter=6),
    'th':ParagraphStyle('overall_th',fontName=BOLD,fontSize=7.2,leading=10,textColor=colors.white),
    'td':ParagraphStyle('overall_td',fontName=REG,fontSize=7.3,leading=11,textColor=colors.HexColor(INK)),
    'smallbold':ParagraphStyle('overall_smallbold',fontName=BOLD,fontSize=8,leading=12,textColor=colors.HexColor(BUR),spaceAfter=5),
}


def para(text,kind='body'):
    return Paragraph(escape(str(text)),S[kind])


def nice(x):
    if x is None or (isinstance(x,float) and (math.isnan(x) or not math.isfinite(x))):
        return 'Not available'
    if isinstance(x,(float,int)) and not isinstance(x,bool):
        return f'{x:,.0f}' if float(x).is_integer() else f'{x:,.2f}'
    return str(x)


def table(story,columns,rows,max_rows=12):
    if not rows:
        return
    # Limit only the presented columns, not source data. Many researcher fields
    # otherwise create illegible A4 tables. Formula components remain in JSON.
    use=columns[:5]
    if len(columns)>5:
        preferred=['researcher','institution','research_score','ugc_based_score','h_index']
        if set(preferred).issubset(columns):
            use=preferred
        else:
            use=columns[:5]
    sizes=[len(c) for c in use]
    for r in rows[:max_rows]:
        for i,c in enumerate(use):
            sizes[i]=max(sizes[i],min(len(nice(r.get(c,''))),33))
    total=sum(max(5,n) for n in sizes)
    widths=[W*max(5,n)/total for n in sizes]
    content=[[para(c.replace('_',' ').title(),'th') for c in use]]
    for r in rows[:max_rows]:
        content.append([para(nice(r.get(c)),'td') for c in use])
    t=Table(content,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor(BUR)),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor(PAPER)]),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor(GRID)),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    story.append(t)


def chart_image(section,folder):
    cfg=section.get('chart')
    rows=section.get('rows') or []
    if not cfg or not rows:
        return None
    title=section['name']
    matplotlib.rcParams['font.family']='DejaVu Sans'
    fig,ax=plt.subplots(figsize=(9.7,4.7),dpi=160)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)
    try:
        if cfg['type']=='bar':
            x,y=cfg['x'],cfg['y']
            pairs=[]
            for r in rows:
                try:
                    v=float(r[y])
                    if math.isfinite(v): pairs.append((str(r[x]),v))
                except (ValueError,TypeError,KeyError):
                    continue
            if len(pairs)<2:
                return None
            pairs=pairs[:10]
            labels=[(t[:34]+'…' if len(t)>35 else t) for t,_ in pairs]
            values=[v for _,v in pairs]
            ys=list(range(len(pairs)))
            ax.barh(ys,values,color=ROSE,height=.65)
            ax.set_yticks(ys,labels)
            ax.invert_yaxis()
            ax.set_xlabel(y.replace('_',' ').title(),fontsize=9)
            ax.tick_params(axis='y',labelsize=8)
            ax.tick_params(axis='x',labelsize=8)
            ax.xaxis.grid(True,alpha=.15)
            ax.set_axisbelow(True)
            for side in ('top','right'):ax.spines[side].set_visible(False)
        elif cfg['type']=='line':
            x=cfg['x']
            series=cfg['series']
            palettes=[BUR,ROSE,'#7C748E','#B48963','#588B8B']
            plotted=0
            for idx,key in enumerate(series[:5]):
                pairs=[]
                for r in rows:
                    try:
                        xv=int(r[x]); yv=float(r[key])
                        if math.isfinite(yv):pairs.append((xv,yv))
                    except (ValueError,TypeError,KeyError):
                        continue
                if len(pairs)<2: continue
                pairs.sort()
                ax.plot([t[0] for t in pairs],[t[1] for t in pairs],marker='o',markersize=4,
                        linewidth=2,color=palettes[idx%len(palettes)],label=key)
                plotted+=1
            if not plotted:return None
            ax.set_xlabel('Year',fontsize=9)
            ax.tick_params(labelsize=8)
            ax.grid(True,alpha=.2)
            ax.set_axisbelow(True)
            if plotted>1:
                ax.legend(loc='best',fontsize=7,frameon=False)
            for side in ('top','right'):ax.spines[side].set_visible(False)
        else:
            return None
        ax.set_title(title,fontsize=11,fontweight='bold',pad=14,color=BUR)
        fig.tight_layout(pad=2.5)
        path=folder/(re.sub(r'[^a-z0-9]+','_',title.lower()).strip('_')+'.png')
        fig.savefig(path,dpi=160,facecolor=fig.get_facecolor(),bbox_inches='tight')
        return path
    finally:
        plt.close(fig)


def cover(canvas,doc):
    canvas.saveState()
    if doc.page==1:
        canvas.setFillColor(colors.HexColor(BUR))
        canvas.rect(0,0,P_W,P_H,stroke=0,fill=1)
        canvas.setStrokeColor(colors.HexColor(ROSE))
        canvas.setLineWidth(1)
        for n in range(7):
            xpos=P_W-(35+n*7)*mm
            ypos=(85+n*6)*mm
            canvas.circle(xpos,ypos,(16+n*6)*mm,stroke=1,fill=0)
        canvas.setFillColor(colors.HexColor(ROSE))
        canvas.rect(M,P_H-77*mm,34*mm,2.6*mm,stroke=0,fill=1)
        logo=BASE/'smart_indicator_logo_transparent.png'
        if logo.is_file():
            from reportlab.lib.utils import ImageReader
            try:
                im=ImageReader(str(logo)); iw,ih=im.getSize()
                maxw=75*mm; maxh=30*mm
                ratio=min(maxw/iw,maxh/ih)
                canvas.drawImage(im,M,P_H-44*mm,iw*ratio,ih*ratio,mask='auto')
            except Exception:
                pass
        canvas.setFillColor(colors.white)
        canvas.setFont(BOLD,10)
        canvas.drawString(M,20*mm,'SMART  /  OVERALL RESEARCH INTELLIGENCE')
    else:
        canvas.setFillColor(colors.HexColor(BUR))
        canvas.rect(0,P_H-13*mm,P_W,13*mm,fill=1,stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont(BOLD,8)
        canvas.drawString(M,P_H-8*mm,'SMART  |  OVERALL RESEARCH INTELLIGENCE')
        canvas.setStrokeColor(colors.HexColor(GRID))
        canvas.line(M,15*mm,P_W-M,15*mm)
        canvas.setFillColor(colors.HexColor(MUTED))
        canvas.setFont(REG,7.5)
        canvas.drawString(M,10*mm,'All-domain analytics  •  Source-scoped indicators')
        canvas.drawRightString(P_W-M,10*mm,str(doc.page))
    canvas.restoreState()


def generate_overall_pdf(report):
    if report.get('report_type')!='overall':
        raise ValueError('Expected report_type=overall (do not pass a domain-only report).')
    PDF_DIR.mkdir(parents=True,exist_ok=True)
    start,end=report['start_year'],report['end_year']
    output=PDF_DIR/f'smart_overall_{start}_{end}.pdf'
    chart_dir=PDF_DIR/f'_overall_chart_assets_{start}_{end}'
    chart_dir.mkdir(exist_ok=True)
    doc=SimpleDocTemplate(str(output),pagesize=A4,leftMargin=M,rightMargin=M,
                          topMargin=23*mm,bottomMargin=20*mm,
                          title=f'SMART Overall Research Intelligence {start}–{end}',
                          author='SMART Research Intelligence')
    story=[]
    story += [Spacer(1,67*mm),para('CROSS-DOMAIN RESEARCH LANDSCAPE','eyebrow'),
              para('Overall Research Intelligence Report','cover'),
              para(f'Institutional, domain, venue, funding and researcher analytics  |  {start}–{end}','cover_sub'),
              Spacer(1,33*mm),para('SMART indicator  •  Burgundy & Rose Gold Edition','cover_sub'),
              PageBreak()]
    story.append(para('Executive overview','h1'))
    story.append(para(f'This overview presents a curated selection of SMART analytics spanning multiple domains for the requested window {start}–{end}. Source periods may differ where an input CSV lacks a year column.'))
    story.append(para(f"{len(report.get('sections',[]))} analytical sections were supported by the source files. Comparisons are descriptive and should be interpreted within the stated dataset coverage."))
    story.append(para('Reporting principles','h1'))
    for line in report.get('methodology_notes',[]):story.append(para('• '+line))
    story.append(PageBreak())
    for idx,item in enumerate(report['sections'],1):
        story.append(para(f'{idx:02d}  {item["name"]}','h1'))
        story.append(para('Data source: '+item['source'],'note'))
        story.append(para('Scope: '+item['scope'],'note'))
        story.append(para(item['insight']))
        table(story,item['columns'],item['rows'])
        if item.get('kind') == 'researchers' and item['rows']:
            first = item['rows'][0]
            base = first.get('ugc_based_score')
            bonus = first.get('h_index_bonus')
            result = first.get('research_score')
            if base is not None and bonus is not None and result is not None:
                story.append(Spacer(1,3*mm))
                story.append(para('Scoring calculation (top displayed record)','smallbold'))
                story.append(para(f'SMART-adapted score = UGC-inspired component subtotal + (2 × h-index). For {first.get("researcher", "this researcher")}: {nice(base)} + {nice(bonus)} = {nice(result)}. The h-index bonus is SMART-specific; it is not part of the official UGC rubric.','note'))
                if first.get('journal_publications') is not None:
                    story.append(para(f'Journal-labelled publications: {nice(first.get("journal_publications"))}. Eligibility and co-author contributions are not independently verified.','note'))
        chart=chart_image(item,chart_dir)
        if chart:
            story.append(Spacer(1,5*mm))
            from PIL import Image as PILImage
            with PILImage.open(chart) as im:
                w,h=im.size
            hh=min(W*h/w,94*mm)
            story.append(Image(str(chart),width=W,height=hh))
        if item.get('caution'):
            story.append(Spacer(1,4*mm))
            story.append(para('Interpretation / limitations: '+item['caution'],'note'))
        story.append(Spacer(1,8*mm))
    story.append(PageBreak())
    story.append(para('Data coverage and exclusions','h1'))
    story.append(para('The table lists discovered/expected analytics sources, including files deliberately excluded from automated charts. This audit is not an analytical ranking.'))
    audit=report.get('source_audit',[])
    for item in audit:
        story.append(KeepTogether([
            para(item['file'],'smallbold'),
            para((item.get('status') or 'Unknown')+'  '+(item.get('source') or ''),'note')
        ]))
    story.append(Spacer(1,7*mm))
    story.append(para('Methodological disclosure','h1'))
    story.append(para('This report is generated from available SMART CSV extracts. No raw records were fabricated. Where original source metadata does not identify its reporting period, no period-specific claim has been made. Scores, source counts, and overlapping classifications should be checked against upstream preprocessing before external publication.'))
    doc.build(story,onFirstPage=cover,onLaterPages=cover)
    print('OVERALL PDF RENDERER: SMART-OVERALL-BURGUNDY-2026-11-v1')
    return str(output)


if __name__=='__main__':
    print('Run overall_report_builder.py to render the full overall report.')
