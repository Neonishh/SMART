/*
=========================================================
MANUAL ENTRY SCHEMAS
=========================================================
Field lists mirror the *_MASTER.csv column headers exactly,
in the same order, so manually contributed data stays
uniform with scraped data and can be dropped into the same
pipeline later with no column remapping.

Source of truth:
  datasets/PUBLICATIONS_MASTER.csv
  datasets/PATENTS_MASTER.csv
  datasets/THESES_MASTER.csv
  datasets/GRANTS_MASTER.csv
=========================================================
*/

export const MANUAL_ENTRY_SCHEMAS = {

    Publication: [
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
    ],

    Patent: [
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
    ],

    Thesis: [
        "Thesis_ID",
        "Title",
        "Researcher",
        "Guide",
        "Institution",
        "Department",
        "Year",
        "Abstract",
        "Source_URL",
        "Source",
        "Location",
        "Keywords"
    ],

    Grant: [
        "Sanction_Year",
        "Institution",
        "Department",
        "PI_Name",
        "Project_Title",
        "Funding_Agency",
        "Amount_INR",
        "Amount_Lakhs",
        "Duration",
        "Program_Scheme",
        "Discipline",
        "File_Number",
        "Source",
        "Location",
        "Source_URL"
    ]

};

export const MANUAL_ENTRY_TYPES = Object.keys(MANUAL_ENTRY_SCHEMAS);
