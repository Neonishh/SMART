import pandas as pd
import os
import re

# =====================================================
# SMART Knowledge Graph
# Patent ETL
# =====================================================

INPUT_FILE = "PATENTS_MASTER.csv"

OUTPUT_FOLDER = "KG_PATENTS"

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

    "Institution",

    "Location",

    "Application_Number",

    "Publication_Number",

    "Patent_Title",

    "Patent_Status",

    "Application_Filing_Date",

    "Year",

    "Publication_Date",

    "Applicant_Name",

    "Applicant_Address",

    "Inventor_Name",

    "IPC_Code",

    "Field_Of_Invention",

    "Abstract"

]

for col in required:

    if col not in df.columns:

        df[col] = ""


# =====================================================
# NORMALIZE INSTITUTIONS
# =====================================================
# Must match the shared Institution_ID/Institution values
# used across Grants, Theses, and Publications.

INSTITUTION_MAP = {

    # Canonical IISc name
    "Indian Institute of Science":
        "Indian Institute of Science Bangalore",

    # Ramaiah University recorded separately in some rows
    "M S Ramaiah University of Applied Sciences":
        "M S Ramaiah Institute of Technology",

    # BMS variant
    "B.M.S. College of Engineering":
        "B.M.S. College of Engineering",

}

df["Institution"] = df["Institution"].replace(INSTITUTION_MAP)

# Shared institution reference table
# (consistent with Institution.csv used by all other domains)
INSTITUTION_ID_MAP = {

    "B.M.S. College of Engineering":
        "BMS_COLLEGE_OF_ENGINEERING",

    "CMR Institute of Technology":
        "CMR_INSTITUTE_OF_TECHNOLOGY",

    "Dayananda Sagar College of Engineering":
        "DAYANANDA_SAGAR_COLLEGE_OF_ENGINEERING",

    "Indian Institute of Science Bangalore":
        "INDIAN_INSTITUTE_OF_SCIENCE_BANGALORE",

    "International Institute of Information Technology Bangalore":
        "INTERNATIONAL_INSTITUTE_OF_INFORMATION_TECHNOLOGY_BANGALORE",

    "M S Ramaiah Institute of Technology":
        "M_S_RAMAIAH_INSTITUTE_OF_TECHNOLOGY",

    "PES University":
        "PES_UNIVERSITY",

    "R V College of Engineering":
        "R_V_COLLEGE_OF_ENGINEERING",

}


# =====================================================
# STABLE ID FUNCTION
# =====================================================

def make_id(text):

    if pd.isna(text) or text == "":

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
# IPC CODE NORMALISER
# =====================================================
# Some IPC codes are in the long zero-padded format:
#   C08J0011240000 -> C08J11/24
# Others are already in standard format:
#   C08G59/18 -> C08G59/18 (unchanged)

def normalise_ipc(code: str) -> str:
    """
    Convert long zero-padded IPC codes to standard IPC format and
    strip any stray whitespace / carriage returns.
    e.g. C08J0011240000 -> C08J11/24
         A01B 790000    -> A01B79/00
         C08G59/18      -> C08G59/18 (no change needed)
    """

    # Strip whitespace and carriage returns
    code = re.sub(r"[\r\n\t]", "", code).strip()

    # Already in standard format (contains "/")
    if "/" in code:
        # Still strip any internal spaces: "A01B 79/00" -> "A01B79/00"
        return code.replace(" ", "")

    # Remove any internal spaces before matching
    code_nospace = code.replace(" ", "")

    # Long format variant 1: Letter(s) + 2 digits + 4 digits + 2 digits + 4 zeros
    # e.g. C08J0011240000 -> C08J11/24
    match = re.match(
        r"^([A-Z]\d{2}[A-Z])(\d{4})(\d{2})\d{4}$",
        code_nospace
    )

    if match:
        section = match.group(1)
        main    = int(match.group(2))
        sub     = int(match.group(3))
        return f"{section}{main}/{sub:02d}"

    # Long format variant 2: 8 digits, no leading section zeros
    # e.g. A01B 790000 -> A01B79/00
    match2 = re.match(
        r"^([A-Z]\d{2}[A-Z])(\d{2})(\d{2})\d{2}$",
        code_nospace
    )

    if match2:
        section = match2.group(1)
        main    = int(match2.group(2))
        sub     = int(match2.group(3))
        return f"{section}{main}/{sub:02d}"

    # Fallback: return cleaned code as-is
    return code_nospace


def split_ipc(raw: str):
    """Split a comma-separated IPC string into normalised atomic codes."""

    if not raw:
        return []

    # Remove HTML-encoded carriage returns (&#x0D; or &#13;) that
    # sometimes appear in scraped IPC data
    raw = re.sub(r"&#[xX]0[dD];|&#13;", "", raw)

    parts = [
        normalise_ipc(p.strip())
        for p in raw.split(",")
        if p.strip()
    ]

    # de-duplicate preserving order
    seen = set()
    result = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            result.append(p)

    return result


# =====================================================
# INVENTOR SPLITTING
# =====================================================
# Inventors are separated by "|"
# Some names are in "LAST, First" format — keep as-is
# (same Person node, just a display-name variant)

def split_inventors(raw: str):

    if not raw:
        return []

    names = []

    for part in raw.split("|"):

        name = clean(part)

        if not name:
            continue

        # Strip leading/trailing punctuation
        name = name.strip(".*-_")

        if not name:
            continue

        names.append(name)

    return names


# =====================================================
# APPLICANT SPLITTING
# =====================================================
# Applicants are also separated by "|"

def split_applicants(raw: str):

    if not raw:
        return []

    parts = []

    for part in raw.split("|"):

        name = clean(part)

        if not name:
            continue

        parts.append(name)

    return parts


# =====================================================
# CREATE PATENT NODE
# =====================================================

patent = df[

    [

        "Application_Number",

        "Publication_Number",

        "Patent_Title",

        "Patent_Status",

        "Application_Filing_Date",

        "Year",

        "Publication_Date",

        "Abstract"

    ]

].copy()

patent.insert(

    0,

    "Patent_ID",

    [

        f"PAT_{i+1:05d}"

        for i in range(len(patent))

    ]

)

df["Patent_ID"] = patent["Patent_ID"].values

print(
    "Patent Nodes:",
    len(patent)
)


# =====================================================
# CREATE INSTITUTION NODE
# (uses the shared standard ID map)
# =====================================================

institution_names = (

    df["Institution"]

    .dropna()

    .unique()

)

institution_rows = []

for name in institution_names:

    if not name:
        continue

    inst_id = INSTITUTION_ID_MAP.get(name)

    if inst_id is None:
        # Fall back to make_id for any unmapped institution
        inst_id = make_id(name)
        print(f"  WARNING: Institution '{name}' not in standard map "
              f"— assigned ID '{inst_id}'. "
              f"Add it to INSTITUTION_ID_MAP to keep IDs consistent.")

    institution_rows.append(
        {
            "Institution_ID": inst_id,
            "Institution": name
        }
    )

institution = pd.DataFrame(institution_rows)

print(
    "Institutions:",
    len(institution)
)


# =====================================================
# CREATE PERSON NODE (INVENTORS)
# =====================================================

inventors = {}

for raw in df["Inventor_Name"]:

    for name in split_inventors(raw):

        pid = make_id(name)

        if not pid:
            continue

        if pid not in inventors:

            inventors[pid] = {

                "Person_ID": pid,

                "Name": name

            }

person = pd.DataFrame(inventors.values())

print(
    "Persons:",
    len(person)
)


# =====================================================
# CREATE APPLICANT NODE
# =====================================================

applicant_map = {}    # name -> {id, name, addresses}
applicant_addr = {}   # name -> set of addresses

for raw_name, raw_addr in zip(
    df["Applicant_Name"], df["Applicant_Address"]
):

    for name in split_applicants(raw_name):

        aid = make_id(name)

        if not aid:
            continue

        if name not in applicant_map:

            applicant_map[name] = {
                "Applicant_ID": aid,
                "Applicant_Name": name,
            }

            applicant_addr[name] = set()

        if raw_addr:

            applicant_addr[name].add(raw_addr)

# Use the first recorded address for each applicant
for name, info in applicant_map.items():

    addrs = applicant_addr.get(name, set())

    info["Applicant_Address"] = (
        next(iter(addrs)) if addrs else ""
    )

applicant = pd.DataFrame(applicant_map.values())

applicant = applicant[
    [
        "Applicant_ID",
        "Applicant_Name",
        "Applicant_Address"
    ]
]

print(
    "Applicants:",
    len(applicant)
)


# =====================================================
# CREATE IPC NODE
# =====================================================

ipc_codes = set()

for raw in df["IPC_Code"]:

    for code in split_ipc(raw):

        ipc_codes.add(code)

ipc = pd.DataFrame(
    {"IPC_Code": sorted(ipc_codes)}
)

ipc["IPC_ID"] = [
    f"IPC{i+1:05d}"
    for i in range(len(ipc))
]

ipc = ipc[
    [
        "IPC_ID",
        "IPC_Code"
    ]
]

print(
    "IPC Codes:",
    len(ipc)
)


# =====================================================
# CREATE FIELD NODE
# =====================================================

fields = (

    df["Field_Of_Invention"]

    .dropna()

    .unique()

)

field = pd.DataFrame(
    {
        "Field": [
            f for f in fields if f
        ]
    }
)

field["Field_ID"] = (

    field["Field"]

    .apply(make_id)

)

field = field[
    [
        "Field_ID",
        "Field"
    ]
]

print(
    "Fields:",
    len(field)
)


# =====================================================
# CREATE LOCATION NODE
# =====================================================

location_values = (

    df["Location"]

    .dropna()

    .unique()

)

location = pd.DataFrame(
    {
        "Location": [
            l for l in location_values if l
        ]
    }
)

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

person_lookup = dict(

    zip(

        person["Person_ID"],

        person["Person_ID"]

    )

)

applicant_name_lookup = {}

for _, row in applicant.iterrows():

    applicant_name_lookup[row["Applicant_Name"]] = row["Applicant_ID"]

ipc_lookup = dict(

    zip(

        ipc["IPC_Code"],

        ipc["IPC_ID"]

    )

)

field_lookup = dict(

    zip(

        field["Field"],

        field["Field_ID"]

    )

)

location_lookup = dict(

    zip(

        location["Location"],

        location["Location_ID"]

    )

)


# =====================================================
# HAS_PATENT  (Institution -> Patent)
# =====================================================

has_patent = pd.DataFrame()

has_patent["Institution_ID"] = (

    df["Institution"]

    .map(institution_lookup)

)

has_patent["Patent_ID"] = df["Patent_ID"]

has_patent.drop_duplicates(inplace=True)

has_patent.dropna(inplace=True)

print(
    "HAS_PATENT:",
    len(has_patent)
)


# =====================================================
# INVENTED  (Person -> Patent)
# =====================================================

invented_rows = []

for row in df.itertuples():

    for name in split_inventors(row.Inventor_Name):

        pid = make_id(name)

        if not pid:
            continue

        invented_rows.append(
            [pid, row.Patent_ID]
        )

invented = pd.DataFrame(
    invented_rows,
    columns=["Person_ID", "Patent_ID"]
)

invented.drop_duplicates(inplace=True)

print(
    "INVENTED:",
    len(invented)
)


# =====================================================
# APPLIED_FOR  (Applicant -> Patent)
# =====================================================

applied_rows = []

for row in df.itertuples():

    for name in split_applicants(row.Applicant_Name):

        aid = applicant_name_lookup.get(name)

        if not aid:
            continue

        applied_rows.append(
            [aid, row.Patent_ID]
        )

applied = pd.DataFrame(
    applied_rows,
    columns=["Applicant_ID", "Patent_ID"]
)

applied.drop_duplicates(inplace=True)

print(
    "APPLIED_FOR:",
    len(applied)
)


# =====================================================
# HAS_IPC  (Patent -> IPC)
# =====================================================

ipc_edge_rows = []

for row in df.itertuples():

    for code in split_ipc(row.IPC_Code):

        ipc_id = ipc_lookup.get(code)

        if not ipc_id:
            continue

        ipc_edge_rows.append(
            [row.Patent_ID, ipc_id]
        )

has_ipc = pd.DataFrame(
    ipc_edge_rows,
    columns=["Patent_ID", "IPC_ID"]
)

has_ipc.drop_duplicates(inplace=True)

print(
    "HAS_IPC:",
    len(has_ipc)
)


# =====================================================
# BELONGS_TO_FIELD  (Patent -> Field)
# =====================================================

belongs_field = pd.DataFrame()

belongs_field["Patent_ID"] = df["Patent_ID"]

belongs_field["Field_ID"] = (

    df["Field_Of_Invention"]

    .map(field_lookup)

)

belongs_field.drop_duplicates(inplace=True)

belongs_field.dropna(inplace=True)

print(
    "BELONGS_TO_FIELD:",
    len(belongs_field)
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

located.drop_duplicates(inplace=True)

located.dropna(inplace=True)

print(
    "LOCATED_IN:",
    len(located)
)

print("\nRelationship generation completed.")


# =====================================================
# SAVE NODE CSVs
# =====================================================

print("\nSaving node CSVs...")

patent.to_csv(
    os.path.join(OUTPUT_FOLDER, "Patent.csv"),
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

applicant.to_csv(
    os.path.join(OUTPUT_FOLDER, "Applicant.csv"),
    index=False,
    encoding="utf-8-sig"
)

ipc.to_csv(
    os.path.join(OUTPUT_FOLDER, "IPC.csv"),
    index=False,
    encoding="utf-8-sig"
)

field.to_csv(
    os.path.join(OUTPUT_FOLDER, "Field.csv"),
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

has_patent.to_csv(
    os.path.join(OUTPUT_FOLDER, "HAS_PATENT.csv"),
    index=False,
    encoding="utf-8-sig"
)

invented.to_csv(
    os.path.join(OUTPUT_FOLDER, "INVENTED.csv"),
    index=False,
    encoding="utf-8-sig"
)

applied.to_csv(
    os.path.join(OUTPUT_FOLDER, "APPLIED_FOR.csv"),
    index=False,
    encoding="utf-8-sig"
)

has_ipc.to_csv(
    os.path.join(OUTPUT_FOLDER, "HAS_IPC.csv"),
    index=False,
    encoding="utf-8-sig"
)

belongs_field.to_csv(
    os.path.join(OUTPUT_FOLDER, "BELONGS_TO_FIELD.csv"),
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
print("SMART KNOWLEDGE GRAPH - PATENT ETL SUMMARY")
print("=" * 65)

print("\nNODES")
print("-" * 40)
print(f"Patent             : {len(patent)}")
print(f"Institution        : {len(institution)}")
print(f"Person (Inventor)  : {len(person)}")
print(f"Applicant          : {len(applicant)}")
print(f"IPC                : {len(ipc)}")
print(f"Field              : {len(field)}")
print(f"Location           : {len(location)}")

print("\nRELATIONSHIPS")
print("-" * 40)
print(f"HAS_PATENT         : {len(has_patent)}")
print(f"INVENTED           : {len(invented)}")
print(f"APPLIED_FOR        : {len(applied)}")
print(f"HAS_IPC            : {len(has_ipc)}")
print(f"BELONGS_TO_FIELD   : {len(belongs_field)}")
print(f"LOCATED_IN         : {len(located)}")

print("\nOutput Folder")
print("-" * 40)
print(os.path.abspath(OUTPUT_FOLDER))

print("\nGenerated Files")
print("-" * 40)

for f in sorted(os.listdir(OUTPUT_FOLDER)):
    print("•", f)

print("\nPatent graph generation completed successfully.")
