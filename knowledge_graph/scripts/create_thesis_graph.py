import pandas as pd
import os
import re

# =====================================================
# SMART Knowledge Graph
# Thesis ETL
# =====================================================

INPUT_FILE = "THESES_MASTER.csv"

OUTPUT_FOLDER = "KG_THESES"

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)

print("Reading", INPUT_FILE)

df = pd.read_csv(
    INPUT_FILE,
    encoding="utf-8-sig"
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

    "Thesis_ID",

    "Title",

    "Researcher",

    "Guide",

    "Institution",

    "Department",

    "Year",

    "Keywords",

    "Abstract",

    "Source_URL",

    "Source",

    "Location"

]

for col in required:

    if col not in df.columns:

        df[col] = ""


# =====================================================
# NORMALIZE INSTITUTIONS
# (kept consistent with create_grant_graph.py)
# =====================================================

institution_map = {

    "R.V. College of Engineering":
        "R V College of Engineering",

    "R V College Of Engineering":
        "R V College of Engineering",

    "M.S. Ramaiah Institute Of Technology":
        "M S Ramaiah Institute of Technology",

    "M.S. Ramaiah Institute of Technology":
        "M S Ramaiah Institute of Technology",

    "Indian Institute of Science":
        "Indian Institute of Science Bangalore",

    "International Institute of Information Technology":
        "International Institute of Information Technology Bangalore",

    "B M S College of Engineering":
        "B M S College of Engineering"

}

df["Institution"] = (

    df["Institution"]

    .replace(institution_map)

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
# KEYWORD SPLITTING
# =====================================================
# Keywords are now consistently separated by "," or ";"
# (e.g. "Engineering, Engineering and Technology, Engineering Civil").
# A simple split on either delimiter is sufficient — no DP
# segmentation needed.

KEYWORD_SPLIT_PATTERN = re.compile(r"[;,]")


def split_keywords(text):
    """Split a raw keyword string into a clean list of atomic keywords."""

    if pd.isna(text) or str(text).strip() == "":
        return []

    parts = KEYWORD_SPLIT_PATTERN.split(str(text))

    seen = set()
    result = []

    for part in parts:

        kw = part.strip()

        if not kw:
            continue

        key = kw.upper()

        if key not in seen:
            seen.add(key)
            result.append(kw)

    return result


# =====================================================
# CREATE THESIS NODE
# =====================================================

thesis = df[

    [

        "Thesis_ID",

        "Title",

        "Year",

        "Abstract",

        "Source",

        "Source_URL"

    ]

].copy()

thesis.drop_duplicates(
    subset=["Thesis_ID"],
    inplace=True
)

print(
    "Thesis Nodes:",
    len(thesis)
)


# =====================================================
# CREATE INSTITUTION NODE
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
# CREATE DEPARTMENT NODE
# =====================================================

department = (

    df[
        ["Department"]
    ]

    .drop_duplicates()

)

department = department[
    department["Department"] != ""
]

department["Department_ID"] = (

    department["Department"]

    .apply(make_id)

)

department = department[
    [

        "Department_ID",

        "Department"

    ]

]

print(
    "Departments:",
    len(department)
)


# =====================================================
# CREATE PERSON NODE (Researcher + Guide merged)
# =====================================================
# A person may appear as a Researcher in one thesis and a Guide
# in another. We keep ONE Person node per unique Name, and record
# every role they have held (comma-separated) in the Role column.

researchers = df[df["Researcher"] != ""][["Researcher"]].rename(
    columns={"Researcher": "Name"}
)
researchers["Role"] = "Researcher"

guides = df[df["Guide"] != ""][["Guide"]].rename(
    columns={"Guide": "Name"}
)
guides["Role"] = "Guide"

person_roles = pd.concat(
    [researchers, guides],
    ignore_index=True
)

person_roles = person_roles[person_roles["Name"] != ""]

# collapse multiple roles per person into one combined Role string
person = (

    person_roles

    .groupby("Name")["Role"]

    .apply(lambda roles: ", ".join(sorted(set(roles))))

    .reset_index()

)

person["Person_ID"] = (

    person["Name"]

    .apply(make_id)

)

person = person[
    [
        "Person_ID",
        "Name",
        "Role"
    ]
]

print(
    "Persons:",
    len(person)
)


# =====================================================
# CREATE KEYWORD NODE
# =====================================================

keyword_rows = []

for kw_string in df["Keywords"]:
    for atomic_kw in split_keywords(kw_string):
        keyword_rows.append(atomic_kw)

keyword = pd.DataFrame(
    {"Keyword": keyword_rows}
).drop_duplicates()

keyword["Keyword_ID"] = [
    f"KW{idx+1:05d}"
    for idx in range(len(keyword))
]

keyword = keyword[
    [
        "Keyword_ID",
        "Keyword"
    ]
]

print(
    "Keywords:",
    len(keyword)
)


# =====================================================
# CREATE LOCATION NODE
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

department_lookup = dict(

    zip(

        department["Department"],

        department["Department_ID"]

    )

)

person_lookup = dict(

    zip(

        person["Name"],

        person["Person_ID"]

    )

)

keyword_lookup = dict(

    zip(

        keyword["Keyword"],

        keyword["Keyword_ID"]

    )

)

location_lookup = dict(

    zip(

        location["Location"],

        location["Location_ID"]

    )

)


# =====================================================
# HAS_THESIS
# =====================================================

has_thesis = pd.DataFrame()

has_thesis["Institution_ID"] = (

    df["Institution"]

    .map(institution_lookup)

)

has_thesis["Thesis_ID"] = df["Thesis_ID"]

has_thesis.drop_duplicates(
    inplace=True
)

has_thesis.dropna(
    inplace=True
)

print(
    "HAS_THESIS:",
    len(has_thesis)
)


# =====================================================
# HAS_DEPARTMENT
# =====================================================

has_department = (

    df[
        [
            "Institution",
            "Department"
        ]
    ]

    .drop_duplicates()

)

has_department["Institution_ID"] = (

    has_department["Institution"]

    .map(institution_lookup)

)

has_department["Department_ID"] = (

    has_department["Department"]

    .map(department_lookup)

)

has_department = has_department[
    [
        "Institution_ID",
        "Department_ID"
    ]
]

has_department.drop_duplicates(
    inplace=True
)

has_department.dropna(
    inplace=True
)

print(
    "HAS_DEPARTMENT:",
    len(has_department)
)


# =====================================================
# HANDLES_THESIS  (Department -> Thesis)
# =====================================================

handles_thesis = pd.DataFrame()

handles_thesis["Department_ID"] = (

    df["Department"]

    .map(department_lookup)

)

handles_thesis["Thesis_ID"] = (

    df["Thesis_ID"]

)

handles_thesis.drop_duplicates(
    inplace=True
)

handles_thesis.dropna(
    inplace=True
)

print(
    "HANDLES_THESIS:",
    len(handles_thesis)
)


# =====================================================
# AUTHORED  (Researcher -> Thesis)
# =====================================================

authored = pd.DataFrame()

authored["Person_ID"] = (

    df["Researcher"]

    .map(person_lookup)

)

authored["Thesis_ID"] = (

    df["Thesis_ID"]

)

authored.drop_duplicates(
    inplace=True
)

authored.dropna(
    inplace=True
)

print(
    "AUTHORED:",
    len(authored)
)


# =====================================================
# SUPERVISED  (Guide -> Thesis)
# =====================================================

supervised = pd.DataFrame()

supervised["Person_ID"] = (

    df["Guide"]

    .map(person_lookup)

)

supervised["Thesis_ID"] = (

    df["Thesis_ID"]

)

supervised.drop_duplicates(
    inplace=True
)

supervised.dropna(
    inplace=True
)

print(
    "SUPERVISED:",
    len(supervised)
)


# =====================================================
# HAS_KEYWORD  (Thesis -> Keyword)
# =====================================================

keyword_edge_rows = []

for thesis_id, kw_string in zip(df["Thesis_ID"], df["Keywords"]):
    for atomic_kw in split_keywords(kw_string):
        kw_id = keyword_lookup.get(atomic_kw)
        if kw_id:
            keyword_edge_rows.append(
                {
                    "Thesis_ID": thesis_id,
                    "Keyword_ID": kw_id
                }
            )

has_keyword = pd.DataFrame(
    keyword_edge_rows,
    columns=["Thesis_ID", "Keyword_ID"]
)

has_keyword.drop_duplicates(
    inplace=True
)

print(
    "HAS_KEYWORD:",
    len(has_keyword)
)


# =====================================================
# LOCATED_IN  (Institution -> Location)
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

thesis.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Thesis.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

institution.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Institution.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

department.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Department.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

person.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Person.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

keyword.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Keyword.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

location.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Location.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)


# =====================================================
# SAVE RELATIONSHIP CSVs
# =====================================================

print("Saving relationship CSVs...")

has_thesis.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HAS_THESIS.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

has_department.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HAS_DEPARTMENT.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

handles_thesis.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HANDLES_THESIS.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

authored.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "AUTHORED.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

supervised.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "SUPERVISED.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

has_keyword.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HAS_KEYWORD.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

located.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "LOCATED_IN.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)


# =====================================================
# VERIFY OUTPUT
# =====================================================

print("\n")
print("=" * 65)
print("SMART KNOWLEDGE GRAPH - THESIS ETL SUMMARY")
print("=" * 65)

print("\nNODES")
print("-----------------------------------------")

print(f"Thesis              : {len(thesis)}")
print(f"Institution         : {len(institution)}")
print(f"Department          : {len(department)}")
print(f"Person              : {len(person)}")
print(f"Keyword             : {len(keyword)}")
print(f"Location            : {len(location)}")

print("\nRELATIONSHIPS")
print("-----------------------------------------")

print(f"HAS_THESIS          : {len(has_thesis)}")
print(f"HAS_DEPARTMENT      : {len(has_department)}")
print(f"HANDLES_THESIS      : {len(handles_thesis)}")
print(f"AUTHORED            : {len(authored)}")
print(f"SUPERVISED          : {len(supervised)}")
print(f"HAS_KEYWORD         : {len(has_keyword)}")
print(f"LOCATED_IN          : {len(located)}")

print("\nOutput Folder")
print("-----------------------------------------")
print(os.path.abspath(OUTPUT_FOLDER))

print("\nGenerated files:")
print("-----------------------------------------")

files = sorted(os.listdir(OUTPUT_FOLDER))

for f in files:
    print("•", f)

print("\nThesis graph generation completed successfully.")