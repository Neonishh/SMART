"""
=========================================================
SMART Knowledge Graph
Final Validation Script
=========================================================

Checks:

1. Duplicate Node IDs
2. Referential Integrity
3. Missing files

Run before importing into Neo4j.

Author: SMART KG
"""

import os
import pandas as pd

# =========================================================
# Folder Structure
# =========================================================

NODES_FOLDER = "KG_MASTER/Nodes"
REL_FOLDER = "KG_MASTER/Relationships"

# =========================================================
# Node Configuration
# =========================================================

NODE_FILES = {

    "Applicant": ("Applicant.csv", "Applicant_ID"),

    "Department": ("Department.csv", "Department_ID"),

    "Domain": ("Domain.csv", "Domain_ID"),

    "Field": ("Field.csv", "Field_ID"),

    "FundingAgency": ("FundingAgency.csv", "Agency_ID"),

    "Grant": ("Grant.csv", "Grant_ID"),

    "Institution": ("Institution.csv", "Institution_ID"),

    "IPC": ("IPC.csv", "IPC_ID"),

    "Keyword": ("Keyword.csv", "Keyword_ID"),

    "Location": ("Location.csv", "Location_ID"),

    "Patent": ("Patent.csv", "Patent_ID"),

    "Person": ("Person.csv", "Person_ID"),

    "Publication": ("Publication.csv", "Publication_ID"),

    "Subdomain": ("Subdomain.csv", "Subdomain_ID"),

    "Thesis": ("Thesis.csv", "Thesis_ID")

}

# =========================================================
# Relationship Configuration
# =========================================================

RELATIONSHIPS = [

    ("APPLIED_FOR.csv",
     "Applicant", "Applicant_ID",
     "Patent", "Patent_ID"),

    ("AUTHORED_PUBLICATION.csv",
     "Person", "Person_ID",
     "Publication", "Publication_ID"),

    ("AUTHORED_THESIS.csv",
     "Person", "Person_ID",
     "Thesis", "Thesis_ID"),

    ("BELONGS_TO_FIELD.csv",
     "Patent", "Patent_ID",
     "Field", "Field_ID"),

    ("FUNDED_BY.csv",
     "Grant", "Grant_ID",
     "FundingAgency", "Agency_ID"),

    ("HANDLES_GRANT.csv",
     "Department", "Department_ID",
     "Grant", "Grant_ID"),

    ("HANDLES_THESIS.csv",
     "Department", "Department_ID",
     "Thesis", "Thesis_ID"),

    ("HAS_DEPARTMENT.csv",
     "Institution", "Institution_ID",
     "Department", "Department_ID"),

    ("HAS_DOMAIN.csv",
     "Publication", "Publication_ID",
     "Domain", "Domain_ID"),

    ("HAS_GRANT.csv",
     "Institution", "Institution_ID",
     "Grant", "Grant_ID"),

    ("HAS_IPC.csv",
     "Patent", "Patent_ID",
     "IPC", "IPC_ID"),

    ("HAS_KEYWORD.csv",
     "Thesis", "Thesis_ID",
     "Keyword", "Keyword_ID"),

    ("HAS_PATENT.csv",
     "Institution", "Institution_ID",
     "Patent", "Patent_ID"),

    ("HAS_PUBLICATION.csv",
     "Institution", "Institution_ID",
     "Publication", "Publication_ID"),

    ("HAS_SUBDOMAIN.csv",
     "Publication", "Publication_ID",
     "Subdomain", "Subdomain_ID"),

    ("HAS_THESIS.csv",
     "Institution", "Institution_ID",
     "Thesis", "Thesis_ID"),

    ("INVENTED.csv",
     "Person", "Person_ID",
     "Patent", "Patent_ID"),

    ("LOCATED_IN.csv",
     "Institution", "Institution_ID",
     "Location", "Location_ID"),

    ("PI_OF.csv",
     "Person", "Person_ID",
     "Grant", "Grant_ID"),

    ("SUPERVISED.csv",
     "Person", "Person_ID",
     "Thesis", "Thesis_ID")

]

# =========================================================

print("="*70)
print("SMART KNOWLEDGE GRAPH VALIDATION")
print("="*70)

# =========================================================
# Load node IDs
# =========================================================

node_ids = {}

print("\nLoading node files...\n")

for label, (file, id_col) in NODE_FILES.items():

    path = os.path.join(NODES_FOLDER, file)

    if not os.path.exists(path):

        print(f"Missing node file: {file}")
        continue

    df = pd.read_csv(
        path,
        encoding="utf-8-sig",
        low_memory=False
    )

    if id_col not in df.columns:

        print(f"{file}: Missing column {id_col}")
        continue

    duplicates = df[id_col].duplicated().sum()

    if duplicates:

        print(f"{file}: {duplicates} duplicate IDs")

    else:

        print(f"{file}: OK ({len(df)} nodes)")

    node_ids[label] = set(
        df[id_col]
        .dropna()
        .astype(str)
        .str.strip()
    )

# =========================================================
# Validate Relationships
# =========================================================

print("\n")
print("="*70)
print("VALIDATING RELATIONSHIPS")
print("="*70)

total_errors = 0

for rel_file, src_label, src_col, dst_label, dst_col in RELATIONSHIPS:

    path = os.path.join(
        REL_FOLDER,
        rel_file
    )

    if not os.path.exists(path):

        print(f"\nMissing relationship file: {rel_file}")
        continue

    df = pd.read_csv(
        path,
        encoding="utf-8-sig",
        low_memory=False
    )

    missing_source = set(
        df[src_col]
        .astype(str)
        .str.strip()
    ) - node_ids[src_label]

    missing_target = set(
        df[dst_col]
        .astype(str)
        .str.strip()
    ) - node_ids[dst_label]

    if len(missing_source)==0 and len(missing_target)==0:

        print(f"{rel_file:30} PASS")

    else:

        print(f"{rel_file:30} FAIL")

        if missing_source:

            print(f"   Missing {src_label}: {len(missing_source)}")

            for x in sorted(list(missing_source))[:10]:

                print("      ",x)

        if missing_target:

            print(f"   Missing {dst_label}: {len(missing_target)}")

            for x in sorted(list(missing_target))[:10]:

                print("      ",x)

        total_errors += len(missing_source)
        total_errors += len(missing_target)

# =========================================================
# Final Summary
# =========================================================

print("\n")
print("="*70)

if total_errors==0:

    print("VALIDATION PASSED")
    print("Knowledge Graph is ready for Neo4j import.")

else:

    print("VALIDATION FAILED")
    print(f"Total missing references: {total_errors}")

print("="*70)