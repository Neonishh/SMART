// ==========================================================
// SMART Knowledge Graph Constants
// ==========================================================

// ----------------------------------------------------------
// Property used as display name for each node label
// ----------------------------------------------------------

export const LABEL_PROPERTIES = {

    Institution: "Institution",

    Publication: "Title",

    Patent: "Patent_Title",

    Grant: "Title",

    Thesis: "Title",

    Person: "Name",

    Applicant: "Applicant_Name",

    FundingAgency: "Funding_Agency",

    Department: "Department",

    Domain: "Domain",

    Subdomain: "Subdomain",

    Field: "Field",

    Keyword: "Keyword",

    IPC: "IPC_Code",

    Location: "Location"

};


// ----------------------------------------------------------
// Default node sizes
// (Later these can scale with graph degree)
// ----------------------------------------------------------

export const NODE_SIZES = {

    Institution: 22,

    Publication: 16,

    Patent: 18,

    Grant: 18,

    Thesis: 16,

    Person: 16,

    Applicant: 14,

    FundingAgency: 16,

    Department: 14,

    Domain: 13,

    Subdomain: 12,

    Field: 13,

    Keyword: 11,

    IPC: 11,

    Location: 12

};


// ----------------------------------------------------------
// Fallback values
// ----------------------------------------------------------

export const DEFAULT_NODE_SIZE = 12;

export const DEFAULT_NODE_LABEL = "Unknown";