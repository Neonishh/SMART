import pandas as pd
import os
import re

# =====================================================
# SMART Knowledge Graph
# Publication ETL
# =====================================================

INPUT_FILE = "PUBLICATIONS_MASTER.csv"

OUTPUT_FOLDER = "KG_PUBLICATIONS"

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)

print("Reading", INPUT_FILE)

df = pd.read_csv(
    INPUT_FILE,
    encoding="utf-8-sig",
    low_memory=False
)

print("Records:", len(df))


# =====================================================
# CLEAN
# =====================================================

def clean(x):

    if pd.isna(x):
        return ""

    x = str(x)

    x = re.sub(
        r"\s+",
        " ",
        x
    )

    return x.strip()


for c in df.columns:

    df[c] = df[c].apply(clean)


# =====================================================
# REQUIRED COLUMNS
# =====================================================

required = [

    "Institution",

    "Location",

    "Domain",

    "Subdomain",

    "Authors",

    "Title",

    "Venue",

    "Year",

    "DOI",

    "Source_URL",

    "Citations"

]

# Alias: some exports name the column "Author" (singular).
# Rename it here so the rest of the pipeline always uses "Authors".
if "Authors" not in df.columns and "Author" in df.columns:

    df.rename(
        columns={"Author": "Authors"},
        inplace=True
    )

for col in required:

    if col not in df.columns:

        raise ValueError(
            f"Required column '{col}' is missing from {INPUT_FILE}. "
            "Check the CSV header and update the script if the column "
            "was renamed."
        )


# =====================================================
# STABLE ID FUNCTION
# =====================================================

def make_id(text):

    if pd.isna(text):

        return ""

    text = str(text)

    text = text.upper()

    text = re.sub(
        r"[^\w\s]",
        "",
        text
    )

    text = re.sub(
        r"\s+",
        "_",
        text
    )

    return text.strip("_")


# =====================================================
# AUTHOR SPLITTING AND VALIDATION
# =====================================================
#
# Problem 1 — inconsistent separators:
#   The "Authors" column uses ";" as primary separator, but some rows
#   use "&" or " and " instead.  One canonical split pattern is used
#   everywhere so the Person table and AUTHORED relationships are
#   always built from identical tokens.
#
# Problem 2 — affiliation superscripts baked into names:
#   Publisher exports often attach affiliation numbers directly to
#   author names (superscripts ¹²³ converted to plain digits on
#   export), e.g. "Anita Patil5", "2 Ramanamma Parepalli",
#   "Archana H R#1".  These must be stripped before the name is
#   stored, otherwise the same person appears as many separate nodes.
#
# Problem 3 — unsplittable fused names:
#   When the separator between two names was missing, the affiliation
#   digit is the only boundary clue, e.g. "Sunil M A2 Amith Srivatsa1".
#   After stripping the trailing marker the embedded digit remains,
#   which signals the token is unsalvageable and should be discarded.
#
# Solution: normalize_author() strips markers; is_valid_author()
# rejects anything that still looks non-human after normalization.

AUTHOR_SPLIT_PATTERN = re.compile(
    r";\s*|\s+and\s+|\s*&\s*"
)

# Institutional / venue keywords that disqualify a token as a person name
_DISCARD_KEYWORDS = (
    "department",
    "university",
    "college",
    "institute",
    "laboratory",
    "centre",
    "center",
)


def normalize_author(name):
    """
    Strip affiliation markers from a raw author token and return the
    cleaned name string (may be empty if nothing is left).

    Handles:
      trailing number only       "Anita Patil5"        → "Anita Patil"
      trailing space + number    "Vijayalakshmi S 1"   → "Vijayalakshmi S"
      trailing #number           "Ajay Patel#1"        → "Ajay Patel"
      trailing *number           "Surendra H H*2"      → "Surendra H H"
      trailing number + letter   "Sarala D.V1a"        → "Sarala D.V"
      leading number             "2 Ramanamma P"       → "Ramanamma P"
    """

    name = clean(name)

    # Strip leading affiliation number: "2 Ramanamma Parepalli"
    name = re.sub(
        r"^\d+\s+",
        "",
        name
    ).strip()

    # Strip trailing affiliation marker in all its forms:
    # optional space + optional #/* + optional space + digits + optional letter
    name = re.sub(
        r"\s*[#*]?\s*\d+[a-z]?\s*$",
        "",
        name
    ).strip()

    return name


def is_valid_author(name):
    """
    Return True if name looks like a real human name after normalization.

    Rejects:
      - Too short (< 3 chars)          catches "C", "NJ" after strip
      - Still contains a digit          catches fused names ("Sunil M A2
                                        Amith Srivatsa"), student IDs
                                        ("Niranjan Kumar (BM19LVS12)"),
                                        years / postcodes ("NJ 07733",
                                        "ICDCIT 2020 Bhubaneswar")
      - Contains an institutional word  catches "... Department of ..."
    """

    if len(name) < 3:
        return False

    if re.search(r"\d", name):
        return False

    lower = name.lower()

    for kw in _DISCARD_KEYWORDS:
        if kw in lower:
            return False

    return True


def split_authors(authors_field):
    """
    Split a raw Authors string into a list of clean, validated,
    normalised individual name strings.
    """

    if not authors_field:
        return []

    parts = AUTHOR_SPLIT_PATTERN.split(authors_field)

    names = []

    for part in parts:

        name = normalize_author(part)

        if name and is_valid_author(name):
            names.append(name)

    return names


# =====================================================
# MULTI-VALUE FIELD SPLITTING (DOMAIN / SUBDOMAIN)
# =====================================================
#
# A publication can belong to more than one Domain or Subdomain,
# e.g. "Engineering; Computer Science".  Using a single function
# ensures the node table and relationship table are always built from
# identical atomic values.

MULTI_VALUE_SPLIT_PATTERN = re.compile(r";")


def split_multi_value(field_value):
    """Split a ';'-separated field into a clean list of atomic values."""

    if not field_value:
        return []

    parts = MULTI_VALUE_SPLIT_PATTERN.split(field_value)

    values = []

    for part in parts:

        value = clean(part)

        if not value:
            continue

        values.append(value)

    return values


# =====================================================
# PUBLICATION NODE
# =====================================================

publication = df[

    [

        "Title",

        "Venue",

        "Year",

        "DOI",

        "Citations",

        "Source_URL"

    ]

].copy()

publication.insert(

    0,

    "Publication_ID",

    [

        f"PUB_{i+1:06d}"

        for i in range(len(publication))

    ]

)

publication.drop_duplicates(
    inplace=True
)

print(
    "Publication Nodes:",
    len(publication)
)


# =====================================================
# INSTITUTION NODE
# =====================================================

institution = (

    df[
        ["Institution"]
    ]

    .drop_duplicates()

)

institution = institution[
    institution["Institution"] != ""
]

institution["Institution_ID"] = (

    institution["Institution"]

    .apply(make_id)

)

institution = institution[
    [

        "Institution_ID",

        "Institution"

    ]

]

print(
    "Institutions:",
    len(institution)
)


# =====================================================
# DOMAIN NODE
# =====================================================
# Each raw Domain cell may contain multiple values separated by ";".
# We split them into atomic values and deduplicate, so "Engineering;
# Computer Science" contributes two separate Domain nodes instead of
# one composite node.

domain_seen = {}

for domain_field in df["Domain"]:

    for value in split_multi_value(domain_field):

        did = make_id(value)

        if did and did not in domain_seen:

            domain_seen[did] = {
                "Domain_ID": did,
                "Domain": value
            }

domain = pd.DataFrame(
    sorted(
        domain_seen.values(),
        key=lambda r: r["Domain"]
    )
)

print(
    "Domains:",
    len(domain)
)


# =====================================================
# SUBDOMAIN NODE
# =====================================================

subdomain_seen = {}

for subdomain_field in df["Subdomain"]:

    for value in split_multi_value(subdomain_field):

        sid = make_id(value)

        if sid and sid not in subdomain_seen:

            subdomain_seen[sid] = {
                "Subdomain_ID": sid,
                "Subdomain": value
            }

subdomain = pd.DataFrame(
    sorted(
        subdomain_seen.values(),
        key=lambda r: r["Subdomain"]
    )
)

print(
    "Subdomains:",
    len(subdomain)
)


# =====================================================
# PERSON NODE (AUTHORS)
# =====================================================
# Names are normalised (affiliation markers stripped) and validated
# before being stored.  Two raw tokens that normalise to the same
# string (e.g. "Archana H R1" and "Archana H R2") correctly produce
# ONE Person node.

people = {}          # Person_ID → dict
id_collisions = 0    # different cleaned names that share an ID
discarded_count = 0  # tokens rejected by is_valid_author()

for authors_field in df["Authors"]:

    raw_parts = AUTHOR_SPLIT_PATTERN.split(authors_field) if authors_field else []

    for part in raw_parts:

        raw_name = clean(part)

        if not raw_name:
            continue

        name = normalize_author(raw_name)

        if not name or not is_valid_author(name):
            discarded_count += 1
            continue

        pid = make_id(name)

        if not pid:
            continue

        if pid not in people:

            people[pid] = {
                "Person_ID": pid,
                "Name": name,
                "Role": "Author"
            }

        elif people[pid]["Name"] != name:

            id_collisions += 1

person = pd.DataFrame(
    people.values()
)

print(
    "Persons:",
    len(person)
)

if discarded_count:

    print(
        f"  Note: {discarded_count} raw author tokens discarded "
        "(affiliation markers, fused names, or non-name strings)."
    )

if id_collisions:

    print(
        f"  Note: {id_collisions} name spelling variants collapsed "
        "onto an existing Person_ID (kept first-seen spelling)."
    )


# =====================================================
# LOCATION NODE
# =====================================================

location = (

    df[
        ["Location"]
    ]

    .drop_duplicates()

)

location = location[
    location["Location"] != ""
]

location["Location_ID"] = (

    location["Location"]

    .apply(make_id)

)

location = location[
    [

        "Location_ID",

        "Location"

    ]

]

print(
    "Locations:",
    len(location)
)


# =====================================================
# LOOKUP TABLES
# =====================================================

institution_lookup = dict(

    zip(

        institution["Institution"],

        institution["Institution_ID"]

    )

)

domain_lookup = dict(

    zip(

        domain["Domain"],

        domain["Domain_ID"]

    )

)

subdomain_lookup = dict(

    zip(

        subdomain["Subdomain"],

        subdomain["Subdomain_ID"]

    )

)

location_lookup = dict(

    zip(

        location["Location"],

        location["Location_ID"]

    )

)

publication_lookup = dict(

    zip(

        df.index,

        publication["Publication_ID"]

    )

)

df["Publication_ID"] = df.index.map(
    publication_lookup
)


# =====================================================
# HAS_PUBLICATION  (Institution → Publication)
# =====================================================

has_publication = pd.DataFrame()

has_publication["Institution_ID"] = (

    df["Institution"]

    .map(institution_lookup)

)

has_publication["Publication_ID"] = (

    df["Publication_ID"]

)

has_publication.drop_duplicates(
    inplace=True
)

has_publication.dropna(
    inplace=True
)

print(
    "HAS_PUBLICATION:",
    len(has_publication)
)


# =====================================================
# AUTHORED  (Person → Publication)
# =====================================================

authored_rows = []

missing_person_count = 0

for row in df.itertuples():

    for name in split_authors(row.Authors):

        pid = make_id(name)

        if not pid:
            continue

        if pid not in people:

            # Guard: should not happen since split_authors() and the
            # Person-node loop use identical normalisation, but
            # silently skip rather than crash.
            missing_person_count += 1
            continue

        authored_rows.append(
            [pid, row.Publication_ID]
        )

authored = pd.DataFrame(

    authored_rows,

    columns=[
        "Person_ID",
        "Publication_ID"
    ]

)

authored.drop_duplicates(
    inplace=True
)

print(
    "AUTHORED:",
    len(authored)
)

if missing_person_count:

    print(
        f"  Warning: {missing_person_count} author mentions could not "
        "be resolved to a Person_ID and were skipped."
    )


# =====================================================
# HAS_DOMAIN  (Publication → Domain)
# =====================================================
# Each publication may link to multiple Domain nodes when its Domain
# cell contains semicolon-separated values.

has_domain_rows = []

for row in df.itertuples():

    for value in split_multi_value(row.Domain):

        did = domain_lookup.get(value)

        if did:

            has_domain_rows.append(
                [row.Publication_ID, did]
            )

has_domain = pd.DataFrame(

    has_domain_rows,

    columns=[
        "Publication_ID",
        "Domain_ID"
    ]

)

has_domain.drop_duplicates(
    inplace=True
)

print(
    "HAS_DOMAIN:",
    len(has_domain)
)


# =====================================================
# HAS_SUBDOMAIN  (Publication → Subdomain)
# =====================================================

has_subdomain_rows = []

for row in df.itertuples():

    for value in split_multi_value(row.Subdomain):

        sid = subdomain_lookup.get(value)

        if sid:

            has_subdomain_rows.append(
                [row.Publication_ID, sid]
            )

has_subdomain = pd.DataFrame(

    has_subdomain_rows,

    columns=[
        "Publication_ID",
        "Subdomain_ID"
    ]

)

has_subdomain.drop_duplicates(
    inplace=True
)

print(
    "HAS_SUBDOMAIN:",
    len(has_subdomain)
)


# =====================================================
# LOCATED_IN  (Institution → Location)
# =====================================================

located = (

    df[
        [
            "Institution",
            "Location"
        ]
    ]

    .drop_duplicates()

)

located["Institution_ID"] = (

    located["Institution"]

    .map(institution_lookup)

)

located["Location_ID"] = (

    located["Location"]

    .map(location_lookup)

)

located = located[
    [
        "Institution_ID",
        "Location_ID"
    ]
]

located.drop_duplicates(
    inplace=True
)

located.dropna(
    inplace=True
)

print(
    "LOCATED_IN:",
    len(located)
)

print("\nRelationship generation completed.")


# =====================================================
# SAVE NODE CSVs
# =====================================================

print("\nSaving node CSVs...")

publication.to_csv(
    os.path.join(OUTPUT_FOLDER, "Publication.csv"),
    index=False,
    encoding="utf-8-sig"
)

institution.to_csv(
    os.path.join(OUTPUT_FOLDER, "Institution.csv"),
    index=False,
    encoding="utf-8-sig"
)

person.to_csv(
    os.path.join(OUTPUT_FOLDER, "Person.csv"),
    index=False,
    encoding="utf-8-sig"
)

domain.to_csv(
    os.path.join(OUTPUT_FOLDER, "Domain.csv"),
    index=False,
    encoding="utf-8-sig"
)

subdomain.to_csv(
    os.path.join(OUTPUT_FOLDER, "Subdomain.csv"),
    index=False,
    encoding="utf-8-sig"
)

location.to_csv(
    os.path.join(OUTPUT_FOLDER, "Location.csv"),
    index=False,
    encoding="utf-8-sig"
)


# =====================================================
# SAVE RELATIONSHIP CSVs
# =====================================================

print("Saving relationship CSVs...")

has_publication.to_csv(
    os.path.join(OUTPUT_FOLDER, "HAS_PUBLICATION.csv"),
    index=False,
    encoding="utf-8-sig"
)

authored.to_csv(
    os.path.join(OUTPUT_FOLDER, "AUTHORED.csv"),
    index=False,
    encoding="utf-8-sig"
)

has_domain.to_csv(
    os.path.join(OUTPUT_FOLDER, "HAS_DOMAIN.csv"),
    index=False,
    encoding="utf-8-sig"
)

has_subdomain.to_csv(
    os.path.join(OUTPUT_FOLDER, "HAS_SUBDOMAIN.csv"),
    index=False,
    encoding="utf-8-sig"
)

located.to_csv(
    os.path.join(OUTPUT_FOLDER, "LOCATED_IN.csv"),
    index=False,
    encoding="utf-8-sig"
)


# =====================================================
# SUMMARY
# =====================================================

print("\n")
print("=" * 65)
print("SMART KNOWLEDGE GRAPH - PUBLICATION ETL SUMMARY")
print("=" * 65)

print("\nNODES")
print("-----------------------------------------")
print(f"Publication        : {len(publication)}")
print(f"Institution        : {len(institution)}")
print(f"Person             : {len(person)}")
print(f"Domain             : {len(domain)}")
print(f"Subdomain          : {len(subdomain)}")
print(f"Location           : {len(location)}")

print("\nRELATIONSHIPS")
print("-----------------------------------------")
print(f"HAS_PUBLICATION    : {len(has_publication)}")
print(f"AUTHORED           : {len(authored)}")
print(f"HAS_DOMAIN         : {len(has_domain)}")
print(f"HAS_SUBDOMAIN      : {len(has_subdomain)}")
print(f"LOCATED_IN         : {len(located)}")

print("\nOutput Folder")
print("-----------------------------------------")
print(os.path.abspath(OUTPUT_FOLDER))

print("\nGenerated Files")
print("-----------------------------------------")

for file in sorted(os.listdir(OUTPUT_FOLDER)):
    print("•", file)

print("\nPublication graph generation completed successfully.")