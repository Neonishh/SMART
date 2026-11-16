from __future__ import annotations

import argparse
import json
import math
import re
import traceback
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / 'nlp' / 'trend_engine' / 'outputs'
SAVE_FOLDER = PROJECT_ROOT / 'trend_engine' / 'report_engine' / 'generated_reports'
DOMAIN_COLUMNS = ('domain_name', 'domain', 'subdomain', 'topic_label', 'topic')
DESIGN_VERSION = 'SMART-DOMAIN-ONLY-2026-11-V4'



def load_csv(filename: str, required: bool = True) -> pd.DataFrame:
    path = OUTPUT_PATH / filename
    if not path.is_file():
        if required:
            raise FileNotFoundError(f'Required SMART analytics file missing: {path}')
        print(f'Info: optional analytics file unavailable: {path}')
        return pd.DataFrame()
    df = pd.read_csv(path)
    df.columns = df.columns.astype(str).str.strip()
    return df


def domain_column(frame: pd.DataFrame) -> str | None:
    return next((c for c in DOMAIN_COLUMNS if c in frame.columns), None)


def filter_domain(frame: pd.DataFrame, technology: str) -> pd.DataFrame:
    col = domain_column(frame)
    if col is None:
        return frame.iloc[:0].copy()
    return frame.loc[frame[col].astype(str).str.strip().str.casefold() == technology.casefold()].copy()


def filter_year(frame: pd.DataFrame, year: int) -> pd.DataFrame:
    if 'year' not in frame.columns:
        return frame.iloc[:0].copy()
    return frame.loc[pd.to_numeric(frame['year'], errors='coerce') == year].copy()


def number(value, *, integer=False):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
        parsed = float(value)
        if not math.isfinite(parsed):
            return None
        return int(parsed) if integer else round(parsed, 2)
    except (ValueError, TypeError, OverflowError):
        return None


def safe_records(frame: pd.DataFrame, columns=None, limit=10) -> list[dict]:
    if frame.empty:
        return []
    if columns is not None:
        frame = frame[[c for c in columns if c in frame.columns]]
    return json.loads(frame.head(limit).to_json(orient='records', date_format='iso'))


def fmt(value, suffix='') -> str:
    return 'unavailable' if value is None else f'{value:,}{suffix}'


def ranked_records(frame, candidates, columns, limit=10):
    if frame.empty:
        return []
    for candidate in candidates:
        if candidate in frame.columns:
            frame = frame.assign(_rank=pd.to_numeric(frame[candidate], errors='coerce'))
            frame = frame.sort_values('_rank', ascending=False, na_position='last')
            break
    return safe_records(frame, columns=columns, limit=limit)


# Optional analytics: keep provenance and never relabel global series as domain-specific.
# Every CSV in the analytics output directory is inventoried, including newly
# introduced modules. Files lacking a domain column are contextual, not local.
PREFERRED_ANALYTICS = {
    'domain_yearly_counts.csv': 'Annual output',
    'domain_yoy_growth.csv': 'Domain YoY growth',
    'domain_cagr.csv': 'Domain CAGR',
    'emerging_domains.csv': 'Emerging domains',
    'institution_cagr.csv': 'Institution CAGR',
    'institution_yoy_growth.csv': 'Institution YoY',
    'institution_yearly_counts.csv': 'Institution annual counts',
    'domain_top_venues.csv': 'Top venues by domain',
    'journal_conference_by_domain.csv': 'Journal/conference by domain',
    'journal_conference_by_year.csv': 'Journal/conference by year',
    'venue_yearly_trend.csv': 'Venue annual trend',
    'top_journals.csv': 'Top journals',
    'top_conferences.csv': 'Top conferences',
    'grant_yearly_counts.csv': 'Grant annual counts',
    'grant_cagr.csv': 'Grant CAGR',
    'grant_impact_score.csv': 'Grant impact',
    'top_funding_agencies.csv': 'Funding agencies',
    'scheme_analysis.csv': 'Grant schemes',
    'top_principal_investigators.csv': 'Principal investigators',
    'domain_top_researchers.csv': 'Domain researcher rankings',
    'top_researchers.csv': 'Overall researcher rankings',
    'institution_top_researchers.csv': 'Institution researcher rankings',
    'top_thesis_researchers.csv': 'Thesis researchers',
    'institution_top_thesis_researchers.csv': 'Institution thesis researchers',
    'institution_top_venues.csv': 'Institution top venues',
    'institution_grant_funding.csv': 'Institution grant funding',
    'journal_conference_overall.csv': 'Overall journal/conference',
    'journal_conference_yearly.csv': 'Annual journal/conference',
    'unknown_publications.csv': 'Unclassified publications',
    'unknown_venues.csv': 'Unclassified venues',
}


# Editorial chart policy: only comparable, technology-matched metrics may be plotted.
# Financial schemes/discipline/agency CSVs have no verified selected-technology scope,
# so they belong in the coverage audit, NOT in the research-domain chart section.
CURATED_DOMAIN_PANELS = {
    'domain_yearly_counts.csv': 'Annual research output by technology',
    'domain_yoy_growth.csv': 'Technology year-over-year growth',
    'domain_top_researchers.csv': 'Top researchers in the selected technology',
    'domain_top_venues.csv': 'Publication venues in the selected technology',
}


def collect_analytics(technology: str, year: int) -> tuple[list[dict], list[dict]]:
    """Strict domain AND year filter. No global or date-unspecified result panels.

    A source must carry both technology and year labels. No guessed joins,
    no all-domain panels, no 2019-2025 rankings inside a 2023 report.
    """
    sections, inventory = [], []
    if not OUTPUT_PATH.exists():
        return sections, [{'file': '(outputs directory)', 'status': 'not found'}]

    # Only these have semantics suitable for a one-year technology report.
    approved = {
        'journal_conference_by_domain.csv': 'Journal and conference composition',
        'domain_top_venues.csv': 'Publication venues',
        'domain_top_researchers.csv': 'Researchers',
    }
    for path in sorted(OUTPUT_PATH.glob('*.csv')):
        if 'backup' in path.stem.lower():
            continue
        item = {'file': path.name, 'status': 'excluded: not a curated domain/year result'}
        if path.name not in approved:
            inventory.append(item)
            continue
        try:
            frame = load_csv(path.name)
            item['source_records'] = len(frame)
            if not domain_column(frame) or 'year' not in frame.columns:
                item['status'] = 'excluded: no verified domain AND year columns'
            else:
                frame = filter_year(filter_domain(frame, technology), year)
                item['matched_records'] = len(frame)
                if frame.empty:
                    item['status'] = 'excluded: no records for selected domain/year'
                elif path.name == 'domain_top_researchers.csv':
                    # The source may carry a year from a prior merger while its score
                    # calculation still spans many years. Require score-period proof.
                    if 'score_period' not in frame.columns or not frame['score_period'].astype(str).str.fullmatch(str(year)).all():
                        item['status'] = 'excluded: researcher score period differs from selected year'
                    else:
                        sections.append({'title': approved[path.name], 'file': path.name,
                            'scope': f'{technology}; {year}', 'rows': safe_records(frame, limit=10),
                            'columns': list(frame.columns), 'record_count': len(frame),
                            'source_record_count': item['source_records']})
                        item['status'] = 'included: verified domain and year'
                else:
                    sections.append({'title': approved[path.name], 'file': path.name,
                        'scope': f'{technology}; {year}', 'rows': safe_records(frame, limit=10),
                        'columns': list(frame.columns), 'record_count': len(frame),
                        'source_record_count': item['source_records']})
                    item['status'] = 'included: verified domain and year'
        except Exception as exc:
            item['status'] = f'excluded: read/validation error: {type(exc).__name__}: {str(exc)[:80]}'
        inventory.append(item)
    return sections, inventory


def build_report(technology: str, year: int) -> dict:
    technology = str(technology).strip()
    year = int(year)
    if not technology:
        raise ValueError('A technology domain is required')

    counts = load_csv('domain_yearly_counts.csv')
    selected = filter_year(filter_domain(counts, technology), year)
    if selected.empty:
        available = sorted(filter_domain(counts, technology)['year'].dropna().astype(str).unique().tolist()) if 'year' in counts.columns else []
        raise ValueError(f'No research counts for {technology!r} in {year}. Available years for this domain: {available or "none"}')
    if len(selected) != 1:
        raise ValueError(f'Expected one domain/year summary row; found {len(selected)} for {technology!r} ({year}).')
    row = selected.iloc[0]
    stats = {key: number(row.get(key), integer=True) for key in ('publications', 'patents', 'grants', 'theses')}
    total = number(row.get('total_research'), integer=True)
    if total is None and all(v is not None for v in stats.values()):
        total = sum(stats.values())
    stats['total_output'] = total

    growth_frame = filter_year(filter_domain(load_csv('domain_yoy_growth.csv', required=False), technology), year)
    yoy = number(growth_frame.iloc[0].get('yoy_growth_percent')) if len(growth_frame) == 1 else None
    # CAGR spans multiple years. A strict one-year report must not imply
    # it is a 2023-only metric; omit unless a separate requested period exists.
    cagr = None

    researchers = filter_domain(load_csv('domain_top_researchers.csv', required=False), technology)
    if 'year' in researchers.columns:
        researchers = filter_year(researchers, year)
    else:
        researchers = researchers.iloc[:0].copy()
    if not researchers.empty and ('score_period' not in researchers.columns or
         not researchers['score_period'].astype(str).str.fullmatch(str(year)).all()):
        researchers = researchers.iloc[:0].copy()
    score_fields = ['rank','researcher','institution','publications','citations',
                    'journal_publications','conference_publications','unclassified_publications',
                    'journal_points','conference_points','patent_points','grant_points',
                    'guidance_points','ugc_based_score','h_index','h_index_bonus',
                    'research_score','score_method','score_period']
    top_researchers = ranked_records(researchers, ['research_score','publications','citations'],score_fields)
    domain_score_verified = (not researchers.empty
       and {'ugc_based_score','h_index','h_index_bonus','research_score','journal_points',
            'conference_points','patent_points','grant_points','guidance_points','score_method'}.
            issubset(researchers.columns)
       and researchers['score_method'].astype(str).str.contains('UGC',case=False,na=False).all())


    venues = filter_domain(load_csv('domain_top_venues.csv', required=False), technology)
    venues = filter_year(venues, year)
    top_venues = ranked_records(venues, ['publications', 'count', 'total_publications'], list(venues.columns))

    # Global journal/conference files must not be presented as domain-specific.
    journals_df = load_csv('journal_conference_by_domain.csv', required=False)
    journals_df = filter_domain(journals_df, technology)
    journals_df = filter_year(journals_df, year)
    # Schema varies; do not infer whether a row is a journal or conference.
    top_journals = []
    top_conferences = []
    if not journals_df.empty:
        kind_col = next((c for c in ('type', 'venue_type', 'publication_type', 'category') if c in journals_df.columns), None)
        if kind_col:
            kinds = journals_df[kind_col].astype(str).str.casefold()
            top_journals = ranked_records(journals_df[kinds.str.contains('journal', na=False)], ['count', 'publications'], list(journals_df.columns))
            top_conferences = ranked_records(journals_df[kinds.str.contains('conference', na=False)], ['count', 'publications'], list(journals_df.columns))

    # The grant impact file is not assumed to have domain/year scope.
    grant_frame = load_csv('grant_impact_score.csv', required=False)
    grant_scope_ok = domain_column(grant_frame) is not None and 'year' in grant_frame.columns
    if grant_scope_ok:
        grant_frame = filter_year(filter_domain(grant_frame, technology), year)
    else:
        grant_frame = grant_frame.iloc[:0]
    impact = number(pd.to_numeric(grant_frame['impact_score'], errors='coerce').mean()) if not grant_frame.empty and 'impact_score' in grant_frame.columns else None

    institution_frame = load_csv('institution_yearly_counts.csv', required=False)
    top_institutions = []
    institution_scope = f'{technology}; {year} (no matching verifiable data)'
    if (not institution_frame.empty and 'institution' in institution_frame.columns
            and 'year' in institution_frame.columns and domain_column(institution_frame)):
        inst_selected = filter_year(filter_domain(institution_frame, technology), year)
        if not inst_selected.empty:
            institution_scope = f'{technology}; {year}'
            if 'total_research' in inst_selected.columns:
                inst_selected = inst_selected.assign(total_output=pd.to_numeric(
                    inst_selected['total_research'], errors='coerce'))
            top_institutions = ranked_records(inst_selected,
                ['total_output','total_research','publications'],
                ['institution','publications','patents','grants','theses',
                 'total_output','total_research'], limit=10)

    report = {
        'technology': technology,
        'design_version': DESIGN_VERSION,
        'year': year,
        'publication_statistics': stats,
        'growth_statistics': {'yoy_growth_percent': yoy, 'cagr_percent': cagr},
        'grant_statistics': {'average_impact_score': impact},
        'top_researchers': top_researchers,
        'top_institutions': top_institutions,
        'institution_scope': institution_scope,
        'top_journals': top_journals,
        'top_conferences': top_conferences,
        'top_venues': top_venues,
        'executive_summary': '',
        'recommendations': [],
        'data_notes': [],
        'analytics_sections': [],
        'analytics_inventory': [],
        'researcher_score_methodology': {
            'classification': 'SMART-adapted, UGC-inspired; NOT an official UGC assessment',
            'formula': 'SMART enhanced score = UGC-inspired base score + 2 x h-index (only if implemented upstream)',
            'purpose': 'Summarize documented scholarly activities using category weights and optional citation impact.',
            'inputs': 'Journal and conference records, patents, verified supervision, funded projects, and paper-level citations where available.',
            'reference': 'UGC 2018 Regulations, Appendix II, Table 2 (consult original rules for eligibility, sharing and caps).',
            'limitations': 'Category defaults, omitted author-share adjustments and the h-index bonus are SMART adaptations. Thesis authorship is not evidence of supervision. The PDF does not recalculate scores.',
        }
    }
    pieces = [f'This SMART Technology Intelligence Report examines recorded research activity in {technology} for {year}.']
    if total is not None:
        breakdown = ', '.join(f'{fmt(stats[k])} {k}' for k in ('publications', 'patents', 'grants', 'theses'))
        pieces.append(f'The dataset records {fmt(total)} total research outputs ({breakdown}).')
        if total > 0 and stats['publications'] is not None:
            pieces.append(f'Publications account for {stats["publications"] / total * 100:.1f}% of recorded outputs.')
    if yoy is not None:
        pieces.append(f'The recorded year-on-year change is {yoy:+.2f}% compared with the preceding year.')
    else:
        report['data_notes'].append('Year-on-year growth is unavailable for the selected domain/year.')
    # Multi-year CAGR excluded from a one-year report.
    if impact is None:
        report['data_notes'].append('Domain-and-year-specific grant impact could not be verified from the available grant analytics.')
    if not top_institutions:
        report['data_notes'].append('Institution rankings not available for this domain and year; all-domain statistics excluded.')
    if not top_journals and not top_conferences:
        report['data_notes'].append('Domain-and-year-specific journal/conference classifications could not be verified and are omitted.')
    report['executive_summary'] = ' '.join(pieces)

    recs = []
    if yoy is not None:
        if yoy > 0:
            recs.append(f'Research output increased by {yoy:.2f}% year over year; examine the annual counts to assess whether this growth is sustained.')
        elif yoy < 0:
            recs.append(f'Research output declined by {abs(yoy):.2f}% year over year; review changes by output category before attributing causes.')
        else:
            recs.append('Recorded output was unchanged year over year; compare category-level counts to identify shifts in research activity.')
    if top_researchers:
        recs.append('Review the selected-year, selected-domain researchers and their documented output; scores are provisional.')
    if stats['patents'] is not None and stats['publications'] is not None:
        recs.append('Compare publication and patent patterns to understand the balance of scholarly and recorded intellectual-property output.')
    if not recs:
        recs.append('Improve completeness of domain/year analytics before drawing strategic conclusions.')
    report['recommendations'] = recs
    # General-purpose outputs are reserved for a separate Overall Research Report.
    report['analytics_sections'] = []
    report['analytics_inventory'] = []
    # No all-domain researcher rankings in a domain/year-specific report.
    report['ugc_overall_researchers'] = []
    if domain_score_verified:
        lead = top_researchers[0] if top_researchers else {}
        example = None
        if lead and all(k in lead for k in ('journal_points','conference_points','patent_points',
                      'grant_points','guidance_points','ugc_based_score','h_index','h_index_bonus','research_score')):
            example = {
                'researcher': lead.get('researcher'),
                'steps': (f"Journal {lead['journal_points']} + Conference {lead['conference_points']} + "
                          f"Patent {lead['patent_points']} + Grant {lead['grant_points']} + "
                          f"Guidance {lead['guidance_points']} = {lead['ugc_based_score']}; "
                          f"2 x h-index ({lead['h_index']}) = {lead['h_index_bonus']}; "
                          f"total = {lead['ugc_based_score']} + {lead['h_index_bonus']}"),
                'result': lead['research_score'],
            }
        report['researcher_score_methodology'] = {
            'classification': 'SMART-adapted UGC-inspired research activity score (NOT official UGC)',
            'formula': 'UGC-inspired base = journal + conference + patent + grant + guidance points; SMART score = base + 2 x h-index',
            'purpose': 'Rank researchers by documented publication-related weighted activity and citation impact.',
            'inputs': 'Journal classification is heuristic. Conference eligibility, supervision, patents and grant points require explicit source evidence.',
            'normalization': 'No coauthor share, career-stage or field normalization is applied.',
            'reference': 'UGC Regulations 2018 Appendix II Table 2 (reference only; SMART adaptations are not official).',
            'interpretation': 'Domain researcher scores are calculated for 2019-2025, not the selected single year. Unverified component eligibility and 2 x h-index are SMART adaptations.',
            'worked_example': example,
        }
    else:
        report['researcher_score_methodology'] = {
            'classification': 'Domain score formula unverified from available CSV fields',
            'limitations': 'Re-run and verify domain_top_researchers.py to provide score components and the method label.'
        }
    report['researcher_scope'] = f'{technology}; {year}' if domain_score_verified else f'No validated {technology} researcher scores specific to {year}'
    return report


def save_report(report: dict) -> Path:
    SAVE_FOLDER.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r'[^a-z0-9]+', '_', report['technology'].lower()).strip('_')
    destination = SAVE_FOLDER / f'{slug}_{report["year"]}.json'
    with destination.open('w', encoding='utf-8') as file:
        json.dump(report, file, indent=2, ensure_ascii=False, allow_nan=False)
    return destination


def main():
    parser = argparse.ArgumentParser(description='SMART automated technology report builder')
    parser.add_argument('--technology', default='Artificial Intelligence and Computer Vision')
    parser.add_argument('--year', type=int, default=2023)
    parser.add_argument('--json-only', action='store_true', help='Build JSON without invoking PDF generator')
    args = parser.parse_args()
    print(f'Generating SMART report: {args.technology} ({args.year})', flush=True)
    report = build_report(args.technology, args.year)
    print(f'DESIGN VERSION: {DESIGN_VERSION}', flush=True)
    print(f'ANALYTICS SOURCE: {OUTPUT_PATH.resolve()}', flush=True)
    json_path = save_report(report)
    print(f'JSON saved: {json_path}')
    if not args.json_only:
        from pdf_generator import generate_pdf
        pdf_path = generate_pdf(report)
        print(f'PDF generator returned: {pdf_path}')
    print('Report generation completed.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
