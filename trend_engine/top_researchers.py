"""SMART UGC-inspired researcher rankings.

This is NOT an official UGC assessment. Scores use a documented subset of
UGC-style weights, plus an optional SMART-specific 2*h-index bonus.
Run from SMART project root: python top_researchers_ugc.py
"""
from pathlib import Path
import re
import pandas as pd

ROOT = Path(__file__).resolve().parent
# When installed elsewhere, use the current SMART project working directory.
if not (ROOT / 'Final csvs').exists():
    ROOT = Path.cwd()
DATA = ROOT / 'nlp' / 'Final csvs'
OUT = ROOT / 'trend_engine' / 'outputs'
OUT.mkdir(parents=True, exist_ok=True)
START_YEAR, END_YEAR = 2019, 2025
USE_H_INDEX_BONUS = True  # SMART adaptation; not part of official UGC Table 2


def read_csv(name, required=False):
    p = DATA / name
    if not p.exists():
        if required:
            raise FileNotFoundError(f'Missing required dataset: {p}')
        print(f'Optional dataset absent: {p}; no points awarded for that category')
        return pd.DataFrame()
    df = pd.read_csv(p)
    df.columns = df.columns.astype(str).str.strip().str.lower()
    if 'year' in df:
        y = pd.to_numeric(df['year'], errors='coerce')
        df = df[y.between(START_YEAR, END_YEAR)].copy()
    return df


def col(df, *names):
    return next((n for n in names if n in df.columns), None)


def norm_name(x):
    return re.sub(r'\s+', ' ', re.sub(r'[.,]', '', str(x))).strip()


def valid_names(df):
    return df[df['researcher'].str.casefold().isin({'', 'nan', 'none', 'unknown'}) == False].copy()


def expand_people(df, field):
    x = df.copy()
    x['researcher'] = x[field].fillna('').astype(str).str.split(';')
    x = x.explode('researcher')
    x['researcher'] = x['researcher'].map(norm_name)
    x['institution'] = x['institution'].fillna('Unknown').astype(str).str.strip()
    return valid_names(x)


def h_index(citations):
    vals = sorted((max(0, int(v)) for v in citations if pd.notna(v)), reverse=True)
    return sum(c >= i for i, c in enumerate(vals, 1))


def text_series(df, field):
    return df[field].fillna('').astype(str).str.strip().str.casefold()


pub = read_csv('publications_processed.csv', required=True)
if not {'title', 'institution', 'authors'}.issubset(pub.columns):
    raise ValueError('Publications CSV needs title, institution, authors columns')
# The input may contain repeated records. Prefer DOI if available; otherwise
# title+institution, matching the prior SMART pipeline.
dedup_cols = ['doi'] if 'doi' in pub and pub['doi'].notna().all() else ['title', 'institution']
pub = pub.drop_duplicates(subset=dedup_cols).copy()
pub['citations'] = pd.to_numeric(pub.get('citations', pd.Series(0, index=pub.index)), errors='coerce').fillna(0).clip(lower=0)
pub['paper_id'] = range(len(pub))
# =====================================================
# JOURNAL / CONFERENCE CLASSIFICATION
# =====================================================

JOURNAL_KEYWORDS = [
    "journal",
    "transactions",
    "letters",
    "review",
    "reviews",
    "magazine",
    "bulletin",
    "annals",
    "nature",
    "ieee access",
    "acm computing surveys",
    "expert systems",
]

CONFERENCE_KEYWORDS = [
    "conference",
    "proceedings",
    "symposium",
    "workshop",
    "congress",
    "icml",
    "neurips",
    "cvpr",
    "iccv",
    "eccv",
    "ijcai",
    "aaai",
    "acl",
    "emnlp",
    "icra",
    "iros",
    "sigcomm",
    "sigir",
    "kdd",
]


def classify_venue(venue):
    if pd.isna(venue):
        return "unclassified"

    venue = str(venue).lower().strip()

    if not venue:
        return "unclassified"

    for word in JOURNAL_KEYWORDS:
        if re.search(r"\b" + re.escape(word) + r"\b", venue):
            return "journal"

    for word in CONFERENCE_KEYWORDS:
        if re.search(r"\b" + re.escape(word) + r"\b", venue):
            return "conference"

    return "unclassified"


kind_col = col(
    pub,
    "venue_type",
    "publication_type",
    "type",
    "document_type",
    "source_type",
)

pub["kind"] = "unclassified"

if kind_col:
    kind = text_series(pub, kind_col)

    pub.loc[kind == "journal", "kind"] = "journal"
    pub.loc[kind == "conference", "kind"] = "conference"

else:
    pub["kind"] = pub["venue"].apply(classify_venue)


print("\nPublication Classification:")
print(pub["kind"].value_counts())
# UGC journal eligibility cannot be inferred from a generic journal flag.
# These are UGC-inspired baseline weights pending peer-review/UGC verification.
pub['paper_points'] = 0.0
pub.loc[pub.kind == 'journal', 'paper_points'] = 8.0
# Conference points require known classification; do not guess unknown types.
conf_col = col(pub, 'conference_level', 'conference_type', 'conference_scope')
if conf_col:
    level = text_series(pub, conf_col)
    pub.loc[(pub.kind == 'conference') & level.str.contains('international.*abroad', regex=True), 'paper_points'] = 7
    pub.loc[(pub.kind == 'conference') & level.str.contains('international.*india', regex=True), 'paper_points'] = 5
    pub.loc[(pub.kind == 'conference') & level.str.contains('national', regex=False), 'paper_points'] = 3
    pub.loc[(pub.kind == 'conference') & level.str.contains('state|university', regex=True), 'paper_points'] = 2
# Citation counts are used only to compute the optional h-index bonus.
people = expand_people(pub, 'authors')

# Maintain one row per researcher+institution; no accidental double counting.
rows = {}
def getrow(name, inst):
    key = (name, inst)
    if key not in rows:
        rows[key] = dict(researcher=name, institution=inst, publications=0,
            journal_publications=0, conference_publications=0, unclassified_publications=0,
            citations=0, theses=0, patents=0, grants=0,
            journal_points=0.0, conference_points=0.0,
            patent_points=0.0, grant_points=0.0, guidance_points=0.0,
            citation_list=[])
    return rows[key]

for (name, inst), group in people.groupby(['researcher', 'institution'], dropna=False):
    r = getrow(name, inst)
    r['publications'] = len(group)
    r['journal_publications'] = int((group.kind == 'journal').sum())
    r['conference_publications'] = int((group.kind == 'conference').sum())
    r['unclassified_publications'] = int((group.kind == 'unclassified').sum())
    r['citations'] = int(group.citations.sum())
    r['journal_points'] = float(group.loc[group.kind == 'journal', 'paper_points'].sum())
    r['conference_points'] = float(group.loc[group.kind == 'conference', 'paper_points'].sum())
    r['citation_list'] = group.citations.tolist()

# Thesis authorship is NOT thesis supervision. Award guidance points only when
# explicit supervisor and degree/status data exist.
thesis = read_csv('theses_processed.csv')
if not thesis.empty:
    supervisor = col(thesis, 'supervisor', 'supervisors', 'guide', 'research_guide')
    degree = col(thesis, 'degree', 'degree_type', 'qualification')
    status = col(thesis, 'status', 'award_status', 'thesis_status')
    if supervisor and degree and status and 'institution' in thesis:
        thesis = expand_people(thesis, supervisor)
        degrees = text_series(thesis, degree)
        statuses = text_series(thesis, status)
        thesis['guidance_pts'] = 0.0
        phd = degrees.str.contains('phd|ph.d|doctor', regex=True)
        awarded = statuses.str.contains('awarded|completed', regex=True)
        submitted = statuses.str.contains('submitted', regex=False)
        pg = degrees.str.contains('mphil|m.phil|postgraduate|master', regex=True)
        thesis.loc[phd & awarded, 'guidance_pts'] = 10
        thesis.loc[phd & submitted, 'guidance_pts'] = 5
        thesis.loc[pg & awarded, 'guidance_pts'] = 2
        for (name, inst), group in thesis.groupby(['researcher', 'institution']):
            r = getrow(name, inst)
            r['theses'] = len(group)
            r['guidance_points'] += float(group.guidance_pts.sum())
    else:
        print('Thesis records lack explicit supervisor, degree or status: no guidance points assigned.')

# Optional patent and grant datasets. These require researcher attribution and
# relevant classification; missing jurisdiction/amount does NOT earn default points.
pat = read_csv('patents_processed.csv')
if not pat.empty:
    who = col(pat, 'inventors', 'inventor', 'researcher', 'authors')
    jur = col(pat, 'jurisdiction', 'patent_scope', 'patent_type')
    if who and jur and 'institution' in pat:
        pat = expand_people(pat, who)
        j = text_series(pat, jur)
        pat['pts'] = 0.0
        pat.loc[j.str.contains('international', regex=False), 'pts'] = 10
        pat.loc[j.str.contains('national', regex=False), 'pts'] = 7
        for (name, inst), g in pat.groupby(['researcher', 'institution']):
            r = getrow(name, inst)
            r['patents'] = len(g)
            r['patent_points'] += float(g.pts.sum())
    else:
        print('Patent attribution/jurisdiction unavailable: no patent points assigned.')

grant = read_csv('grants_processed.csv')
if not grant.empty:
    who = col(grant, 'principal_investigator', 'researcher', 'investigator')
    amount = col(grant, 'amount_inr', 'funding_amount_inr', 'grant_amount_inr')
    status = col(grant, 'status', 'project_status')
    if who and amount and status and 'institution' in grant:
        grant = expand_people(grant, who)
        amt = pd.to_numeric(grant[amount], errors='coerce')
        done = text_series(grant, status).str.contains('completed', regex=False)
        grant['pts'] = 0.0
        grant.loc[done & (amt > 1_000_000), 'pts'] = 10
        grant.loc[done & (amt < 1_000_000), 'pts'] = 5
        # Exactly 10 lakh requires explicit rule review; leave unscored.
        for (name, inst), g in grant.groupby(['researcher', 'institution']):
            r = getrow(name, inst)
            r['grants'] = len(g)
            r['grant_points'] += float(g.pts.sum())
    else:
        print('Grant attribution/amount/status unavailable: no grant points assigned.')

if not rows:
    raise ValueError('No researcher records after filtering.')

for r in rows.values():
    r['h_index'] = h_index(r.pop('citation_list'))
    r['ugc_based_score'] = round(sum(r[k] for k in (
        'journal_points','conference_points','patent_points','grant_points','guidance_points')), 2)
    r['h_index_bonus'] = 2 * r['h_index'] if USE_H_INDEX_BONUS else 0
    r['research_score'] = round(r['ugc_based_score'] + r['h_index_bonus'], 2)
    r['score_method'] = 'SMART-adapted UGC-inspired rubric' + (' + 2*h-index' if USE_H_INDEX_BONUS else '')
    r['score_period'] = f'{START_YEAR}-{END_YEAR}'

combined = pd.DataFrame(rows.values()).sort_values(
    ['research_score','researcher','institution'], ascending=[False,True,True]
).reset_index(drop=True)
combined.insert(0, 'rank', range(1, len(combined)+1))
combined.to_csv(OUT / 'top_researchers.csv', index=False)

institution_top = combined.sort_values(['institution','research_score'], ascending=[True,False]).groupby('institution').head(10).copy()
institution_top['rank'] = institution_top.groupby('institution').cumcount()+1
institution_top.to_csv(OUT / 'institution_top_researchers.csv', index=False)

thesis_only = combined[combined['theses'] > 0].copy().sort_values('guidance_points', ascending=False).reset_index(drop=True)
thesis_only['research_score'] = thesis_only['guidance_points']
thesis_only['rank'] = range(1, len(thesis_only)+1)
thesis_only.to_csv(OUT / 'top_thesis_researchers.csv', index=False)
inst_thesis = thesis_only.sort_values(['institution','research_score'], ascending=[True,False]).groupby('institution').head(5).copy()
inst_thesis['rank'] = inst_thesis.groupby('institution').cumcount()+1
inst_thesis.to_csv(OUT / 'institution_top_thesis_researchers.csv', index=False)
print('Generated 4 CSVs in', OUT)
print(combined[['rank','researcher','institution','ugc_based_score','h_index','research_score']].head(10).to_string(index=False))
print('WARNING: These are SMART-adapted UGC-inspired scores, not official UGC assessments.')
