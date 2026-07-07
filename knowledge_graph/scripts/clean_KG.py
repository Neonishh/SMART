
"""
preprocess_csvs.py
==================
Production-quality preprocessing script for the National Science &
Technology Knowledge Graph (Neo4j 5.x Community Edition).

Reads every CSV from KG_MASTER/{Nodes,Relationships}/,
applies cleaning and normalisation, and writes results to
KG_MASTER_CLEAN/ preserving the original directory structure.

Usage
-----
    python preprocess_csvs.py

Author  : Knowledge Graph Pipeline
Requires: Python 3.11+, pandas
"""

from __future__ import annotations

import logging
import re
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

INPUT_ROOT  = Path("KG_MASTER")
OUTPUT_ROOT = Path("KG_MASTER_CLEAN")
REPORT_PATH = OUTPUT_ROOT / "preprocessing_report.txt"

SUB_DIRS = ["Nodes", "Relationships"]

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Values treated as missing / empty
EMPTY_VALUES: set[str] = {
    "", " ", "na", "n/a", "null", "-", "unknown", "none", "nan",
}

# Date format candidates (tried in order)
DATE_FORMATS: list[str] = [
    "%d/%m/%Y",   # 31/12/2023
    "%d-%m-%Y",   # 31-12-2023
    "%Y/%m/%d",   # 2023/12/31
    "%Y-%m-%d",   # 2023-12-31
    "%d/%m/%y",   # 31/12/23
    "%d-%m-%y",   # 31-12-23
    "%m/%d/%Y",   # 12/31/2023 (US)
]

# Column-name patterns that should NEVER be numerically cleaned
ID_SUFFIX_PATTERN = re.compile(r"_ID$", re.IGNORECASE)

# Columns whose values look like dates (heuristic name matching)
DATE_COLUMN_PATTERN = re.compile(
    r"(date|filing|published|publication)", re.IGNORECASE
)

# Columns that are clearly numeric (non-ID)
NUMERIC_COLUMN_PATTERN = re.compile(
    r"^(amount|citations|year)$", re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Stats accumulator
# ---------------------------------------------------------------------------

@dataclass
class Stats:
    """Accumulates processing metrics across all files."""

    files_processed:    int = 0
    rows_processed:     int = 0
    duplicates_removed: int = 0
    dates_converted:    int = 0
    numerics_cleaned:   int = 0
    warnings:           int = 0
    log_lines:          list[str] = field(default_factory=list)

    def warn(self, msg: str) -> None:
        """Record a warning both in the log and the counter."""
        self.warnings += 1
        entry = f"  [WARNING] {msg}"
        self.log_lines.append(entry)
        logging.warning(msg)

    def info(self, msg: str) -> None:
        """Record an informational log line."""
        self.log_lines.append(f"  {msg}")
        logging.info(msg)


# ---------------------------------------------------------------------------
# Cell-level cleaners
# ---------------------------------------------------------------------------

def clean_text(value: object) -> str:
    """
    Trim whitespace from a string value and normalise empty/null
    sentinel strings to an empty string.

    Parameters
    ----------
    value : any
        Raw cell value from pandas (may be float NaN, None, or str).

    Returns
    -------
    str
        Cleaned string, or "" for missing/empty values.

    Examples
    --------
    >>> clean_text("  Indian Institute of Science  ")
    'Indian Institute of Science'
    >>> clean_text("NULL")
    ''
    >>> clean_text(float('nan'))
    ''
    """
    if pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() in EMPTY_VALUES:
        return ""
    return text


def clean_date(value: str, stats: Stats, context: str = "") -> str:
    """
    Attempt to parse *value* as a date and return it in ISO format
    (YYYY-MM-DD).  Returns the original string unchanged if parsing
    fails.

    Parameters
    ----------
    value   : str   – pre-cleaned cell value (whitespace already stripped)
    stats   : Stats – accumulator for conversion counts and warnings
    context : str   – file + column label used in warning messages

    Returns
    -------
    str
        ISO-formatted date string, or the original value on failure.
    """
    if not value:
        return value

    # Already ISO — nothing to do
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return value

    for fmt in DATE_FORMATS:
        try:
            parsed = datetime.strptime(value, fmt)
            stats.dates_converted += 1
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Could not parse — warn only if it looks like it might be a date
    if re.search(r"\d{1,4}[/\-]\d{1,2}[/\-]\d{1,4}", value):
        stats.warn(
            f"Could not parse date-like value {value!r} in {context}"
        )
    return value


def clean_number(value: str, stats: Stats, context: str = "") -> str:
    """
    Strip currency symbols, thousand-separators and extra whitespace
    from a numeric-looking string and return the plain number as a
    string.  Returns the original value if the result cannot be
    interpreted as a number.

    Parameters
    ----------
    value   : str   – pre-cleaned cell value
    stats   : Stats – accumulator
    context : str   – file + column label used in warning messages

    Returns
    -------
    str
        Clean numeric string (integer or float), or the original value.

    Examples
    --------
    >>> clean_number("₹ 10,50,000", ...)
    '1050000'
    >>> clean_number("1,234.56", ...)
    '1234.56'
    """
    if not value:
        return value

    original = value

    # Remove currency symbols and surrounding whitespace
    value = re.sub(r"[₹$€£¥\s]", "", value)

    # Remove thousand separators (commas)
    value = value.replace(",", "")

    # Validate: must be a plain integer or decimal now
    if re.fullmatch(r"-?\d+(\.\d+)?", value):
        if value != original.replace(" ", "").replace(",", ""):
            stats.numerics_cleaned += 1
        # Return as int string if no decimal part
        if "." not in value:
            return str(int(value))
        return value

    # Not a clean number — restore original and warn
    stats.warn(
        f"Could not clean numeric value {original!r} in {context}"
    )
    return original


# ---------------------------------------------------------------------------
# Column-type classifier
# ---------------------------------------------------------------------------

def classify_columns(df: pd.DataFrame) -> dict[str, str]:
    """
    Return a dict mapping each column name to one of:
        "id"      – _ID suffix → whitespace-trim only, no other changes
        "date"    – date-like name → attempt ISO conversion
        "numeric" – known numeric column → strip symbols / separators
        "text"    – everything else → whitespace-trim + empty-normalise

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict[str, str]
    """
    classification: dict[str, str] = {}

    for col in df.columns:
        if ID_SUFFIX_PATTERN.search(col):
            classification[col] = "id"
        elif DATE_COLUMN_PATTERN.search(col):
            classification[col] = "date"
        elif NUMERIC_COLUMN_PATTERN.match(col):
            classification[col] = "numeric"
        else:
            classification[col] = "text"

    return classification


# ---------------------------------------------------------------------------
# Per-file processor
# ---------------------------------------------------------------------------

def process_csv(
    input_path:  Path,
    output_path: Path,
    stats:       Stats,
) -> None:
    """
    Read one CSV, apply all cleaning transformations, remove duplicate
    rows, and write the result to *output_path*.

    Parameters
    ----------
    input_path  : Path  – source CSV (inside KG_MASTER/)
    output_path : Path  – destination CSV (inside KG_MASTER_CLEAN/)
    stats       : Stats – shared accumulator
    """
    rel_path = input_path.relative_to(INPUT_ROOT)
    stats.info(f"{'─'*60}")
    stats.info(f"File : {rel_path}")

    # ── Read ─────────────────────────────────────────────────────────
    try:
        df = pd.read_csv(
            input_path,
            encoding="utf-8-sig",
            dtype=str,          # keep everything as str; we clean manually
            keep_default_na=False,
        )
    except Exception as exc:
        stats.warn(f"Could not read {rel_path}: {exc}")
        return

    rows_in   = len(df)
    col_types = classify_columns(df)

    stats.info(f"Cols : {list(df.columns)}")
    stats.info(f"Rows in  : {rows_in}")

    # ── Cell-level cleaning ──────────────────────────────────────────
    for col in df.columns:
        kind    = col_types[col]
        context = f"{rel_path} / {col}"

        if kind == "id":
            # ID columns: trim only, never alter content
            df[col] = df[col].apply(
                lambda v: str(v).strip() if not pd.isna(v) else ""
            )

        elif kind == "date":
            def _clean_date_cell(v: object) -> str:
                cleaned = clean_text(v)
                return clean_date(cleaned, stats, context)
            df[col] = df[col].apply(_clean_date_cell)

        elif kind == "numeric":
            def _clean_num_cell(v: object) -> str:
                cleaned = clean_text(v)
                return clean_number(cleaned, stats, context)
            df[col] = df[col].apply(_clean_num_cell)

        else:
            # text
            df[col] = df[col].apply(clean_text)

    # ── Duplicate removal ────────────────────────────────────────────
    rows_before_dedup = len(df)
    df.drop_duplicates(inplace=True)
    dupes = rows_before_dedup - len(df)

    if dupes:
        stats.info(f"Duplicates removed : {dupes}")
    stats.duplicates_removed += dupes

    rows_out = len(df)

    # ── Write ────────────────────────────────────────────────────────
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    stats.rows_processed += rows_out
    stats.files_processed += 1
    stats.info(f"Rows out : {rows_out}")


# ---------------------------------------------------------------------------
# Report generator
# ---------------------------------------------------------------------------

def generate_report(stats: Stats, started_at: datetime) -> None:
    """
    Write preprocessing_report.txt to OUTPUT_ROOT and print a summary
    to stdout.

    Parameters
    ----------
    stats      : Stats    – final accumulated metrics
    started_at : datetime – wall-clock time when the run began
    """
    finished_at = datetime.now()
    elapsed     = finished_at - started_at

    header_lines = [
        "=" * 65,
        "NATIONAL SCIENCE & TECHNOLOGY KNOWLEDGE GRAPH",
        "CSV Preprocessing Report",
        "=" * 65,
        f"Started  : {started_at.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Finished : {finished_at.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Elapsed  : {elapsed}",
        "",
        "SUMMARY",
        "-" * 45,
        f"Files processed        : {stats.files_processed}",
        f"Rows processed         : {stats.rows_processed:,}",
        f"Duplicate rows removed : {stats.duplicates_removed:,}",
        f"Dates converted        : {stats.dates_converted:,}",
        f"Numeric values cleaned : {stats.numerics_cleaned:,}",
        f"Warnings               : {stats.warnings:,}",
        f"Output folder          : {OUTPUT_ROOT.resolve()}",
        "",
        "DETAIL LOG",
        "-" * 45,
    ]

    all_lines = header_lines + stats.log_lines

    REPORT_PATH.write_text(
        "\n".join(all_lines) + "\n",
        encoding="utf-8",
    )

    # Console summary
    print()
    print("=" * 65)
    print("PREPROCESSING COMPLETE")
    print("=" * 65)
    print(f"Files processed        : {stats.files_processed}")
    print(f"Rows processed         : {stats.rows_processed:,}")
    print(f"Duplicate rows removed : {stats.duplicates_removed:,}")
    print(f"Dates converted        : {stats.dates_converted:,}")
    print(f"Numeric values cleaned : {stats.numerics_cleaned:,}")
    print(f"Warnings               : {stats.warnings:,}")
    print(f"Output folder          : {OUTPUT_ROOT.resolve()}")
    print(f"Report                 : {REPORT_PATH.resolve()}")
    print("=" * 65)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """
    Orchestrate the full preprocessing run.

    1. Validate that KG_MASTER/ exists with the expected sub-directories.
    2. Iterate every CSV under Nodes/ and Relationships/.
    3. Apply cleaning and write to KG_MASTER_CLEAN/.
    4. Generate the preprocessing report.
    """
    # ── Logging setup ────────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s | %(message)s",
        stream=sys.stdout,
    )

    started_at = datetime.now()
    stats      = Stats()

    # ── Validate input ───────────────────────────────────────────────
    if not INPUT_ROOT.exists():
        logging.error(
            f"Input folder not found: {INPUT_ROOT.resolve()}\n"
            "Place this script alongside the KG_MASTER/ folder and retry."
        )
        sys.exit(1)

    # ── Recreate clean output folder ─────────────────────────────────
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True)

    logging.info(f"Input  : {INPUT_ROOT.resolve()}")
    logging.info(f"Output : {OUTPUT_ROOT.resolve()}")
    logging.info("")

    # ── Discover and process CSVs ────────────────────────────────────
    all_csv_paths: list[Path] = []

    for sub_dir in SUB_DIRS:
        sub_path = INPUT_ROOT / sub_dir
        if not sub_path.exists():
            stats.warn(f"Sub-directory not found, skipping: {sub_path}")
            continue
        all_csv_paths.extend(sorted(sub_path.glob("*.csv")))

    if not all_csv_paths:
        logging.error("No CSV files found under KG_MASTER/. Aborting.")
        sys.exit(1)

    logging.info(f"Found {len(all_csv_paths)} CSV files to process.\n")

    for csv_path in all_csv_paths:
        # Mirror the same relative path under the output root
        relative    = csv_path.relative_to(INPUT_ROOT)
        output_path = OUTPUT_ROOT / relative

        try:
            process_csv(csv_path, output_path, stats)
        except Exception as exc:
            stats.warn(
                f"Unhandled error processing {csv_path.name}: {exc}"
            )

    # ── Report ───────────────────────────────────────────────────────
    generate_report(stats, started_at)


if __name__ == "__main__":
    main()
