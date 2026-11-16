"""SMART Overall Research Intelligence Report: data builder.

Separate from report_builder.py (domain/year report). Run from any directory:
python trend_engine/report_engine/overall_report_builder.py --start-year 2019 --end-year 2025

Aggregates are source-specific and are NEVER represented as unique research outputs
unless a source explicitly supports that interpretation. Missing fields are omitted.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'nlp' / 'trend_engine' / 'outputs'
ALT = ROOT / 'trend_engine' / 'outputs'
DEST = ROOT / 'trend_engine' / 'report_engine' / 'generated_reports'
VERSION = 'SMART-OVERALL-BURGUNDY-2026-11-v1'


def load(name, *, prefer_new=False):
    paths = ([ALT / name, DATA / name] if prefer_new else [DATA / name, ALT / name])
    for path in paths:
        if path.is_file():
            try:
                frame = pd.read_csv(path, low_memory=False)
                frame.columns = frame.columns.astype(str).str.strip()
                return frame, str(path.relative_to(ROOT))
            except (OSError, ValueError, pd.errors.ParserError) as exc:
                return pd.DataFrame(), f'{path.relative_to(ROOT)} [read error: {exc}]'
    return pd.DataFrame(), None


def first_col(df, names):
    lookup = {str(c).casefold(): c for c in df.columns}
    return next((lookup[n.casefold()] for n in names if n.casefold() in lookup), None)


def numeric(frame, col):
    return pd.to_numeric(frame[col], errors='coerce').replace([float('inf'), -float('inf')], float('nan'))


def period(frame, start, end):
    y = first_col(frame, ['year', 'publication_year', 'grant_year'])
    if y is None:
        return frame.copy(), 'source has no year column; not claimed to be period-specific'
    years = numeric(frame, y)
    return frame.loc[years.between(start, end)].copy(), f'{start}–{end}'


def clean_records(frame, cols, limit=12):
    if frame.empty:
        return []
    x = frame.loc[:, cols].head(limit).copy()
    x = x.replace([float('inf'), -float('inf')], float('nan'))
    return json.loads(x.to_json(orient='records', date_format='iso'))


def add_section(sections, *, name, source, scope, kind, columns, rows, insight, caution='', chart=None):
    if not rows:
        return
    sections.append(dict(name=name, source=source, scope=scope, kind=kind,
                         columns=columns, rows=rows, insight=insight,
                         caution=caution, chart=chart))


def collect(start, end):
    sections = []
    coverage = []
    used = set()

    def grab(name, prefer_new=False):
        frame, src = load(name, prefer_new=prefer_new)
        if src:
            used.add(name)
        coverage.append({'file': name, 'status': ('available' if not frame.empty else 'not available / empty'),
                         'rows': len(frame), 'source': src or ''})
        return frame, src

    # 1. Domain research composition: sums of domain-tagged observations are not
    # deduplicated globally, so label them carefully.
    df, src = grab('domain_yearly_counts.csv')
    if not df.empty:
        d = first_col(df, ['domain_name', 'domain'])
        y = first_col(df, ['year'])
        out = first_col(df, ['total_research', 'total_output'])
        if d and y and out:
            f, _ = period(df, start, end)
            f = f.loc[f[d].notna() & ~f[d].astype(str).str.strip().str.casefold().isin(['unknown', 'nan', ''])].copy()
            f['_value'] = numeric(f, out)
            grouped = f.groupby(d, as_index=False)['_value'].sum(min_count=1).dropna().sort_values('_value', ascending=False).head(12)
            rows = [{'Domain': str(r[d]), 'Recorded outputs': float(r['_value'])} for _, r in grouped.iterrows()]
            add_section(sections, name='Research activity by domain', source=src, scope=f'Domain-attributed records, {start}–{end}',
                        kind='domains', columns=['Domain', 'Recorded outputs'], rows=rows,
                        insight='Compares domain-attributed output volume across the reporting window.',
                        caution='Domain assignments may overlap; do not interpret the sum as a deduplicated total of unique research outputs.',
                        chart={'type': 'bar', 'x': 'Domain', 'y': 'Recorded outputs'})

            # Research activity annual series across domain tags.
            yy = f.groupby(y, as_index=False)['_value'].sum(min_count=1).dropna().sort_values(y)
            rows = [{'Year': int(r[y]), 'Domain-attributed outputs': float(r['_value'])} for _, r in yy.iterrows()]
            add_section(sections, name='Annual research activity across domains', source=src,
                        scope=f'{start}–{end}; sum across domain-labelled records', kind='yearly',
                        columns=['Year', 'Domain-attributed outputs'], rows=rows,
                        insight='Shows changes in summed domain-attributed activity across the reporting window.',
                        caution='A publication classified under multiple domains can appear more than once in the aggregate.',
                        chart={'type': 'line', 'x': 'Year', 'series': ['Domain-attributed outputs']} if len(rows)>1 else None)

    # 2. Domain growth metrics - CAGR applies to the source-defined interval, not
    # necessarily --start-year/--end-year; never relabel it.
    df, src = grab('domain_cagr.csv')
    if not df.empty:
        dom = first_col(df, ['domain_name', 'domain'])
        metric = first_col(df, ['cagr_percent', 'cagr', 'growth_rate'])
        if dom and metric:
            f = df.copy()
            f['_cagr'] = numeric(f, metric)
            f = f.dropna(subset=['_cagr'])
            f = f[~f[dom].astype(str).str.strip().str.casefold().isin(['unknown', 'nan', ''])]
            f = f.sort_values('_cagr', ascending=False).head(12)
            rows = [{'Domain': str(r[dom]), 'CAGR (%)': float(r['_cagr'])} for _, r in f.iterrows()]
            add_section(sections, name='Domain CAGR comparison', source=src,
                        scope='Source-defined multi-year CAGR interval (verify upstream calculation years)',
                        kind='growth', columns=['Domain', 'CAGR (%)'], rows=rows,
                        insight='Ranks reported compound annual growth rates, not absolute research volume.',
                        caution='The source may not specify endpoint years; do not assume the chosen report window is the CAGR calculation window.',
                        chart={'type': 'bar', 'x': 'Domain', 'y': 'CAGR (%)'})

    # 3. Institutions by year; per-year ranking is reliably an all-domain series.
    df, src = grab('institution_yearly_counts.csv')
    if not df.empty:
        inst = first_col(df, ['institution'])
        year = first_col(df, ['year'])
        tot = first_col(df, ['total_research', 'total_output'])
        if inst and year and tot:
            f, _ = period(df, start, end)
            f['_total'] = numeric(f, tot)
            f = f.dropna(subset=['_total'])
            f = f[~f[inst].astype(str).str.strip().str.casefold().isin(['unknown', 'nan', ''])]
            latest = f.loc[numeric(f, year) == numeric(f, year).max()].copy() if not f.empty else f
            if not latest.empty:
                rank = latest.groupby(inst, as_index=False)['_total'].sum().sort_values('_total', ascending=False).head(10)
                rows = [{'Institution': str(r[inst]), 'Research outputs': float(r['_total'])} for _,r in rank.iterrows()]
                shown_year = int(numeric(latest, year).max())
                add_section(sections, name=f'Institution output ranking — {shown_year}', source=src,
                            scope=f'All-domain institution-attributed records, {shown_year}', kind='institution',
                            columns=['Institution','Research outputs'], rows=rows,
                            insight='Ranks institutions by the recorded research-output metric in the latest available year in the requested window.',
                            caution='Institution-attributed outputs may overlap across collaborators; this does not measure research quality.',
                            chart={'type': 'bar','x':'Institution','y':'Research outputs'})
            # Year-by-year leading institutions rather than unstable overall sum.
            leading = f.groupby(inst)['_total'].sum().nlargest(5).index.tolist()
            if len(leading) > 0:
                g = f.loc[f[inst].isin(leading)].groupby([year,inst], as_index=False)['_total'].sum()
                wide = g.pivot(index=year, columns=inst, values='_total').sort_index()
                rows = []
                for yr, row in wide.iterrows():
                    rec = {'Year': int(yr)}
                    rec.update({str(k): (None if pd.isna(v) else float(v)) for k,v in row.items()})
                    rows.append(rec)
                cols = ['Year'] + [str(x) for x in wide.columns]
                add_section(sections, name='Leading institution output trends', source=src,
                            scope=f'All domains, {start}–{end}', kind='institution_trend', columns=cols,
                            rows=rows, insight='Shows year-to-year recorded output for the institutions with the highest summed values in the requested window.',
                            caution='Summing institution-attributed output is not equivalent to a unique publication count.',
                            chart={'type': 'line', 'x': 'Year', 'series': cols[1:]} if len(rows)>1 else None)

    # 4. Journals / conferences across years from explicit fields.
    df, src = grab('venue_yearly_trend.csv')
    if not df.empty:
        y = first_col(df, ['year'])
        j = first_col(df, ['Journal'])
        c = first_col(df, ['Conference'])
        if y and j and c:
            f, _ = period(df, start, end)
            f = f.copy()
            f['_j'] = numeric(f, j)
            f['_c'] = numeric(f, c)
            f = f.dropna(subset=['_j','_c'], how='all').sort_values(y)
            rows = [{'Year': int(r[y]), 'Journal': (None if pd.isna(r['_j']) else float(r['_j'])),
                     'Conference': (None if pd.isna(r['_c']) else float(r['_c']))} for _,r in f.iterrows()]
            add_section(sections, name='Journal and conference publication trends', source=src,
                        scope=f'All-domain venue-classified records, {start}–{end}', kind='venue_trend',
                        columns=['Year','Journal','Conference'], rows=rows,
                        insight='Tracks the recorded journal and conference classifications by year.',
                        caution='The venue-classification method is heuristic; unclassified venues are not included in these two series.',
                        chart={'type':'line','x':'Year','series':['Journal','Conference']} if len(rows)>1 else None)

    # 5. Top journals and conferences; only use a clear venue + measure schema.
    for name, heading in [('top_journals.csv','Leading journal venues'),
                          ('top_conferences.csv','Leading conference venues')]:
        df, src = grab(name)
        if df.empty:
            continue
        venue = first_col(df, ['venue','journal','conference','name'])
        value = first_col(df, ['publications','count','total_publications'])
        if venue and value:
            f, scope = period(df, start, end)
            f['_n'] = numeric(f, value)
            f = f.dropna(subset=['_n'])
            f = f[~f[venue].astype(str).str.strip().str.casefold().isin(['unknown','nan',''])]
            f = f.sort_values('_n',ascending=False).head(10)
            rows = [{'Venue': str(r[venue]),'Publication records':float(r['_n'])} for _,r in f.iterrows()]
            add_section(sections, name=heading,source=src,scope=f'All domains; {scope}',
                        kind='venues',columns=['Venue','Publication records'],rows=rows,
                        insight='Lists the most frequently recorded classified venues in this source.',
                        caution='Venue popularity is not a measure of prestige or paper quality.',
                        chart={'type':'bar','x':'Venue','y':'Publication records'} if len(rows)>1 else None)

    # 6. Grant yearly observations. Do not infer a domain or convert an amount
    # into a number of grants.
    df, src = grab('grant_yearly_counts.csv')
    if not df.empty:
        y = first_col(df, ['year'])
        total = first_col(df, ['grants','grant_count','total_grants','total_projects','count'])
        if y and total:
            f, _ = period(df,start,end)
            f['_value'] = numeric(f,total)
            f = f.dropna(subset=['_value'])
            g = f.groupby(y,as_index=False)['_value'].sum().sort_values(y)
            rows = [{'Year':int(r[y]), 'Reported grant records':float(r['_value'])} for _,r in g.iterrows()]
            add_section(sections,name='Grant activity by year',source=src,
                        scope=f'All-domain grant source, {start}–{end}',kind='grants',
                        columns=['Year','Reported grant records'],rows=rows,
                        insight='Shows the sum of reported grant-record counts in each year.',
                        caution='Counts may be grouped across institutions or schemes; check deduplication in the grant pipeline.',
                        chart={'type':'line','x':'Year','series':['Reported grant records']} if len(rows)>1 else None)

    # 7. Funding agencies: explicitly agency rather than discipline / scheme.
    df,src = grab('top_funding_agencies.csv')
    if not df.empty:
        agency = first_col(df,['funding_agency','agency','agency_name'])
        value = first_col(df,['total_funding_lakhs','total_funding','funding_lakhs','grant_count','grants','total_projects'])
        if agency and value:
            f,scope=period(df,start,end)
            f['_n']=numeric(f,value)
            bad={'unknown','nan','none','', 'n/a'}
            unknown=f[agency].astype(str).str.strip().str.casefold().isin(bad)
            unknown_records=int(unknown.sum())
            total_records=len(f)
            f=f.loc[~unknown].dropna(subset=['_n']).sort_values('_n',ascending=False).head(10)
            rows=[{'Funding agency':str(r[agency]),'Recorded measure':float(r['_n'])} for _,r in f.iterrows()]
            add_section(sections,name='Funding agencies',source=src,
                        scope=f'All domains; {scope}; measure: {value}',kind='agencies',
                        columns=['Funding agency','Recorded measure'],rows=rows,
                        insight='Compares funding agencies on the source measure, not funding disciplines.',
                        caution=f'{unknown_records} of {total_records} source agency rows are unclassified and excluded from ranking. Units/semantics follow column {value!r}.',
                        chart={'type':'bar','x':'Funding agency','y':'Recorded measure'} if len(rows)>1 else None)

    # 8. Researcher rankings. Prefer the new UGC-inspired data produced by
    # trend_engine/top_researchers.py over legacy NLP output.
    df, src = grab('top_researchers.csv', prefer_new=True)
    if not df.empty:
        who = first_col(df,['researcher','name'])
        score = first_col(df,['research_score','score'])
        if who and score:
            f, scope = period(df,start,end)
            period_col=first_col(f,['score_period'])
            # If a source already spans a fixed interval, never relabel it as
            # the requested window even if the CLI flags differ.
            if period_col and f[period_col].notna().any():
                stated=sorted(set(f[period_col].dropna().astype(str)))
                scope='source scoring window: '+', '.join(stated[:4])
            f=f.copy()
            f['_score']=numeric(f,score)
            f=f.dropna(subset=['_score']).sort_values('_score',ascending=False).head(12)
            cols=[c for c in ['researcher','institution','publications','journal_publications',
                              'conference_publications','h_index','ugc_based_score','h_index_bonus','research_score'] if c in f.columns]
            if len(cols)>=2:
                rows=clean_records(f,cols,limit=12)
                method_col=first_col(f,['score_method'])
                method=str(f.iloc[0][method_col]) if method_col and not f.empty else 'method not established'
                add_section(sections,name='Overall researcher rankings',source=src,scope=f'All domains; {scope}',
                            kind='researchers',columns=cols,rows=rows,
                            insight='Ranks researcher/institution records using the score stored in the source file.',
                            caution=f'Method: {method}. A SMART-adapted UGC-inspired score is not an official UGC assessment. Venue heuristics and unavailable grant/patent/guidance evidence limit comparability.',
                            chart={'type':'bar','x':who,'y':score} if len(rows)>1 else None)

    # 9. Overall institution-wise researcher list: not same as institution output.
    df, src = grab('institution_top_researchers.csv',prefer_new=True)
    if not df.empty:
        inst=first_col(df,['institution'])
        who=first_col(df,['researcher'])
        score=first_col(df,['research_score'])
        if inst and who and score:
            f,_=period(df,start,end)
            f=f.copy()
            f['_score']=numeric(f,score)
            f=f.dropna(subset=['_score']).sort_values('_score',ascending=False).head(10)
            cols=[c for c in ['institution','researcher','ugc_based_score','h_index','research_score'] if c in f.columns]
            add_section(sections,name='Leading researchers across institutions',source=src,
                        scope='All domains; source-defined researcher scoring window',kind='institution_researchers',
                        columns=cols, rows=clean_records(f,cols,10),
                        insight='Shows highly ranked researcher records and their institutions; this is not an institutional output ranking.',
                        caution='Researcher scores do not measure institutional quality; names and author attributions should be validated.',
                        chart=None)

    # Coverage audit (not a report chart), including data that is intentionally
    # omitted because taxonomy mixes schemes with disciplines or no meaningful axis.
    intentional = {
        'discipline_funding.csv':'Mixed discipline / program labels (SUPRA, PAIR); taxonomy validation required',
        'scheme_analysis.csv':'Scheme-level context; not a discipline ranking',
        'grant_impact_score.csv':'Impact formula not verified',
        'unknown_publications.csv':'Record-level data quality; no ranking',
        'unknown_venues.csv':'Unclassified venue audit',
        'domain_top_researchers.csv':'Multi-year domain-specific rankings belong to a different reporting pipeline',
    }
    if DATA.exists():
        for file in sorted(DATA.glob('*.csv')):
            if 'backup' in file.stem.lower() or file.name in used:
                continue
            coverage.append({'file':file.name,'status':'not charted: '+intentional.get(file.name,'not included in curated overall chart set'),
                             'rows':None, 'source':str(file.relative_to(ROOT))})
    return sections, coverage


def build_report(start_year=2019,end_year=2025):
    start_year=int(start_year)
    end_year=int(end_year)
    if start_year>end_year:
        raise ValueError('start-year must be <= end-year')
    sections,coverage=collect(start_year,end_year)
    if not sections:
        raise ValueError(f'No compatible overall analytics CSVs found under {DATA}. Run the Trend Engine first.')
    return {
        'report_type':'overall', 'title':'SMART Overall Research Intelligence Report',
        'start_year':start_year,'end_year':end_year,'version':VERSION,
        'generated_at_utc':datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
        'sections':sections,'source_audit':coverage,
        'methodology_notes':[
            'The overall report combines multiple all-domain analytics files; their underlying populations may differ.',
            'Period filtering is applied when a year column exists. Where the source has no year column, the original source scope is stated rather than inventing a date range.',
            'Domain and institution aggregates may contain overlapping attributions; they are not necessarily globally deduplicated.',
            'Only curated comparisons with interpretable data axes become charts. The report does not create arbitrary charts from every CSV.',
            'Official UGC Research Score criteria are not fully implemented by the SMART-adapted scoring files; h-index enhancement is project-defined.',
        ]
    }


def main():
    parser=argparse.ArgumentParser(description='SMART general, all-domain research report')
    parser.add_argument('--start-year',type=int,default=2019)
    parser.add_argument('--end-year',type=int,default=2025)
    parser.add_argument('--json-only',action='store_true')
    args=parser.parse_args()
    report=build_report(args.start_year,args.end_year)
    DEST.mkdir(parents=True,exist_ok=True)
    out=DEST/f'smart_overall_{args.start_year}_{args.end_year}.json'
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
    print('OVERALL REPORT BUILDER:',VERSION)
    print('JSON:',out)
    print('Curated sections:',len(report['sections']))
    if not args.json_only:
        from overall_pdf_generator import generate_overall_pdf
        pdf=generate_overall_pdf(report)
        print('PDF:',pdf)


if __name__=='__main__':
    main()
