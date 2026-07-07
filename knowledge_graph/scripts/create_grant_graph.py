import pandas as pd
import os
import re

# =====================================================
# SMART Knowledge Graph
# Grant ETL
# =====================================================

INPUT_FILE = "GRANTS_MASTER.csv"

OUTPUT_FOLDER = "KG_GRANTS"

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
# STANDARDIZE COLUMN NAMES
# =====================================================

rename = {

    "PI_Name":"PI",

    "Project_Title":"Title",

    "Funding_Agency":"Funding_Agency",

    "Sanction_Year":"Year",

    "Amount_INR":"Amount"

}

df.rename(
    columns=rename,
    inplace=True
)


# =====================================================
# REQUIRED COLUMNS
# =====================================================

required = [

    "Title",

    "PI",

    "Institution",

    "Department",

    "Funding_Agency",

    "Amount",

    "Year",

    "Location",

    "Source_URL"

]

for col in required:

    if col not in df.columns:

        df[col] = ""


# =====================================================
# NORMALIZE INSTITUTIONS
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
        "International Institute of Information Technology Bangalore"

}

df["Institution"] = (

    df["Institution"]

    .replace(institution_map)

)


# =====================================================
# SPLIT MULTI-DEPARTMENT STRINGS
# =====================================================
# Some grants list multiple departments together, e.g. "ME, ECE",
# "ECE, ISE and ETE", "ECE,CSE". Instead of treating that combined
# string as one department, split it into the individual real
# departments so each grant can link to ALL departments involved.

def split_departments(text):

    if pd.isna(text) or text == "":
        return []

    text = str(text)

    # Normalize "and" / "&" into commas, then split on commas
    text = re.sub(r"\s+(and|&)\s+", ",", text, flags=re.IGNORECASE)

    parts = [
        p.strip()
        for p in text.split(",")
        if p.strip() != ""
    ]

    # de-duplicate while preserving order
    seen = set()
    result = []
    for p in parts:
        key = p.upper()
        if key not in seen:
            seen.add(key)
            result.append(p)

    return result


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
# CREATE GRANT NODE
# =====================================================

grant = df[

    [

        "Title",

        "Amount",

        "Year",

        "Source_URL"

    ]

].copy()

grant.insert(

    0,

    "Grant_ID",

    [

        f"GRANT_{i+1:05d}"

        for i in range(len(grant))

    ]

)

grant.drop_duplicates(
    inplace=True
)

print(
    "Grant Nodes:",
    len(grant)
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

# Build a long-form table: one row per (row_index, atomic_department)
dept_rows = []

for idx, dept_string in df["Department"].items():
    for atomic_dept in split_departments(dept_string):
        dept_rows.append(
            {
                "row_index": idx,
                "Department": atomic_dept
            }
        )

df_dept_long = pd.DataFrame(
    dept_rows,
    columns=["row_index", "Department"]
)

department = (

    df_dept_long[
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
# CREATE PERSON NODE (PI)
# =====================================================

person = (

    df[
        ["PI"]
    ]

    .drop_duplicates()

)

person = person[
    person["PI"] != ""
]

person.rename(
    columns={
        "PI": "Name"
    },
    inplace=True
)

person["Person_ID"] = (

    person["Name"]

    .apply(make_id)

)

person["Role"] = "Principal Investigator"

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
# CREATE FUNDING AGENCY NODE
# =====================================================

agency = (

    df[
        ["Funding_Agency"]
    ]

    .drop_duplicates()

)

agency = agency[
    agency["Funding_Agency"] != ""
]

agency["Agency_ID"] = (

    agency["Funding_Agency"]

    .apply(make_id)

)

agency = agency[
    [
        "Agency_ID",
        "Funding_Agency"
    ]
]

print(
    "Funding Agencies:",
    len(agency)
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

agency_lookup = dict(

    zip(

        agency["Funding_Agency"],

        agency["Agency_ID"]

    )

)

location_lookup = dict(

    zip(

        location["Location"],

        location["Location_ID"]

    )

)

grant_lookup = dict(

    zip(

        df.index,

        grant["Grant_ID"]

    )

)

df["Grant_ID"] = df.index.map(grant_lookup)


# =====================================================
# HAS_GRANT
# =====================================================

has_grant = pd.DataFrame()

has_grant["Institution_ID"] = (

    df["Institution"]

    .map(institution_lookup)

)

has_grant["Grant_ID"] = df["Grant_ID"]

has_grant.drop_duplicates(
    inplace=True
)

has_grant.dropna(
    inplace=True
)

print(
    "HAS_GRANT:",
    len(has_grant)
)


# =====================================================
# HAS_DEPARTMENT
# =====================================================

has_department = df_dept_long.merge(
    df[["Institution"]],
    left_on="row_index",
    right_index=True,
    how="left"
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
# HANDLES_GRANT
# =====================================================

handles = df_dept_long.merge(
    df[["Grant_ID"]],
    left_on="row_index",
    right_index=True,
    how="left"
)

handles["Department_ID"] = (

    handles["Department"]

    .map(department_lookup)

)

handles = handles[
    [
        "Department_ID",
        "Grant_ID"
    ]
]

handles.drop_duplicates(
    inplace=True
)

handles.dropna(
    inplace=True
)

print(
    "HANDLES_GRANT:",
    len(handles)
)


# =====================================================
# FUNDED_BY
# =====================================================

funded = pd.DataFrame()

funded["Agency_ID"] = (

    df["Funding_Agency"]

    .map(agency_lookup)

)

funded["Grant_ID"] = (

    df["Grant_ID"]

)

funded.drop_duplicates(
    inplace=True
)

funded.dropna(
    inplace=True
)

print(
    "FUNDED_BY:",
    len(funded)
)


# =====================================================
# PI_OF
# =====================================================

pi_of = pd.DataFrame()

pi_of["Person_ID"] = (

    df["PI"]

    .map(person_lookup)

)

pi_of["Grant_ID"] = (

    df["Grant_ID"]

)

pi_of.drop_duplicates(
    inplace=True
)

pi_of.dropna(
    inplace=True
)

print(
    "PI_OF:",
    len(pi_of)
)


# =====================================================
# LOCATED_IN
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

grant.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "Grant.csv"
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

agency.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "FundingAgency.csv"
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

has_grant.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HAS_GRANT.csv"
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

handles.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "HANDLES_GRANT.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

funded.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "FUNDED_BY.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)

pi_of.to_csv(
    os.path.join(
        OUTPUT_FOLDER,
        "PI_OF.csv"
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
print("SMART KNOWLEDGE GRAPH - GRANT ETL SUMMARY")
print("=" * 65)

print("\nNODES")
print("-----------------------------------------")

print(f"Grant              : {len(grant)}")
print(f"Institution        : {len(institution)}")
print(f"Department         : {len(department)}")
print(f"Person             : {len(person)}")
print(f"Funding Agency     : {len(agency)}")
print(f"Location           : {len(location)}")

print("\nRELATIONSHIPS")
print("-----------------------------------------")

print(f"HAS_GRANT          : {len(has_grant)}")
print(f"HAS_DEPARTMENT     : {len(has_department)}")
print(f"HANDLES_GRANT      : {len(handles)}")
print(f"FUNDED_BY          : {len(funded)}")
print(f"PI_OF              : {len(pi_of)}")
print(f"LOCATED_IN         : {len(located)}")

print("\nOutput Folder")
print("-----------------------------------------")
print(os.path.abspath(OUTPUT_FOLDER))

print("\nGenerated files:")
print("-----------------------------------------")

files = sorted(os.listdir(OUTPUT_FOLDER))

for f in files:
    print("•", f)

print("\nGrant graph generation completed successfully.")