////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 02_import_nodes.cypher
//
// PART 1
// Applicant
// Department
// Domain
// Field
//
// Neo4j 5.x / Desktop 2026
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// APPLICANT
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Applicant.csv' AS row

WITH row
WHERE row.Applicant_ID IS NOT NULL
  AND trim(row.Applicant_ID) <> ''

MERGE (a:Applicant {Applicant_ID: trim(row.Applicant_ID)})

SET
    a.Applicant_Name =
        CASE
            WHEN row.Applicant_Name IS NULL
              OR trim(row.Applicant_Name) = ''
            THEN NULL
            ELSE trim(row.Applicant_Name)
        END,

    a.Applicant_Address =
        CASE
            WHEN row.Applicant_Address IS NULL
              OR trim(row.Applicant_Address) = ''
            THEN NULL
            ELSE trim(row.Applicant_Address)
        END;

////////////////////////////////////////////////////////////////////////
// DEPARTMENT
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Department.csv' AS row

WITH row
WHERE row.Department_ID IS NOT NULL
  AND trim(row.Department_ID) <> ''

MERGE (d:Department {Department_ID: trim(row.Department_ID)})

SET
    d.Department =
        CASE
            WHEN row.Department IS NULL
              OR trim(row.Department) = ''
            THEN NULL
            ELSE trim(row.Department)
        END;

////////////////////////////////////////////////////////////////////////
// DOMAIN
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Domain.csv' AS row

WITH row
WHERE row.Domain_ID IS NOT NULL
  AND trim(row.Domain_ID) <> ''

MERGE (d:Domain {Domain_ID: trim(row.Domain_ID)})

SET
    d.Domain =
        CASE
            WHEN row.Domain IS NULL
              OR trim(row.Domain) = ''
            THEN NULL
            ELSE trim(row.Domain)
        END;

////////////////////////////////////////////////////////////////////////
// FIELD
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Field.csv' AS row

WITH row
WHERE row.Field_ID IS NOT NULL
  AND trim(row.Field_ID) <> ''

MERGE (f:Field {Field_ID: trim(row.Field_ID)})

SET
    f.Field =
        CASE
            WHEN row.Field IS NULL
              OR trim(row.Field) = ''
            THEN NULL
            ELSE trim(row.Field)
        END;

////////////////////////////////////////////////////////////////////////
// END OF PART 1
////////////////////////////////////////////////////////////////////////
// PART 2
// FundingAgency
// Grant
// Institution
// IPC
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// FUNDING AGENCY
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///FundingAgency.csv' AS row

WITH row
WHERE row.Agency_ID IS NOT NULL
  AND trim(row.Agency_ID) <> ''

MERGE (fa:FundingAgency {Agency_ID: trim(row.Agency_ID)})

SET
    fa.Funding_Agency =
        CASE
            WHEN row.Funding_Agency IS NULL
              OR trim(row.Funding_Agency) = ''
            THEN NULL
            ELSE trim(row.Funding_Agency)
        END;

////////////////////////////////////////////////////////////////////////
// GRANT
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Grant.csv' AS row

WITH row
WHERE row.Grant_ID IS NOT NULL
  AND trim(row.Grant_ID) <> ''

MERGE (g:Grant {Grant_ID: trim(row.Grant_ID)})

SET
    g.Title =
        CASE
            WHEN row.Title IS NULL
              OR trim(row.Title) = ''
            THEN NULL
            ELSE trim(row.Title)
        END,

    g.Amount =
        CASE
            WHEN row.Amount IS NULL
              OR trim(row.Amount) = ''
            THEN NULL
            ELSE toFloat(trim(row.Amount))
        END,

    g.Year =
        CASE
            WHEN row.Year IS NULL
              OR trim(row.Year) = ''
            THEN NULL
            ELSE toInteger(trim(row.Year))
        END,

    g.Source_URL =
        CASE
            WHEN row.Source_URL IS NULL
              OR trim(row.Source_URL) = ''
            THEN NULL
            ELSE trim(row.Source_URL)
        END;

////////////////////////////////////////////////////////////////////////
// INSTITUTION
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Institution.csv' AS row

WITH row
WHERE row.Institution_ID IS NOT NULL
  AND trim(row.Institution_ID) <> ''

MERGE (i:Institution {Institution_ID: trim(row.Institution_ID)})

SET
    i.Institution =
        CASE
            WHEN row.Institution IS NULL
              OR trim(row.Institution) = ''
            THEN NULL
            ELSE trim(row.Institution)
        END;

////////////////////////////////////////////////////////////////////////
// IPC
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///IPC.csv' AS row

WITH row
WHERE row.IPC_ID IS NOT NULL
  AND trim(row.IPC_ID) <> ''

MERGE (ipc:IPC {IPC_ID: trim(row.IPC_ID)})

SET
    ipc.IPC_Code =
        CASE
            WHEN row.IPC_Code IS NULL
              OR trim(row.IPC_Code) = ''
            THEN NULL
            ELSE trim(row.IPC_Code)
        END;

////////////////////////////////////////////////////////////////////////
// END OF PART 2
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 02_import_nodes.cypher
//
// PART 3
// Keyword
// Location
// Patent
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// KEYWORD
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Keyword.csv' AS row

WITH row
WHERE row.Keyword_ID IS NOT NULL
  AND trim(row.Keyword_ID) <> ''

MERGE (k:Keyword {Keyword_ID: trim(row.Keyword_ID)})

SET
    k.Keyword =
        CASE
            WHEN row.Keyword IS NULL
              OR trim(row.Keyword) = ''
            THEN NULL
            ELSE trim(row.Keyword)
        END;

////////////////////////////////////////////////////////////////////////
// LOCATION
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Location.csv' AS row

WITH row
WHERE row.Location_ID IS NOT NULL
  AND trim(row.Location_ID) <> ''

MERGE (l:Location {Location_ID: trim(row.Location_ID)})

SET
    l.Location =
        CASE
            WHEN row.Location IS NULL
              OR trim(row.Location) = ''
            THEN NULL
            ELSE trim(row.Location)
        END;

////////////////////////////////////////////////////////////////////////
// PATENT
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Patent.csv' AS row

WITH row
WHERE row.Patent_ID IS NOT NULL
  AND trim(row.Patent_ID) <> ''

MERGE (p:Patent {Patent_ID: trim(row.Patent_ID)})

SET
    ////////////////////////////////////////////////////////////////
    // Text Properties
    ////////////////////////////////////////////////////////////////

    p.Application_Number =
        CASE
            WHEN row.Application_Number IS NULL
              OR trim(row.Application_Number) = ''
            THEN NULL
            ELSE trim(row.Application_Number)
        END,

    p.Publication_Number =
        CASE
            WHEN row.Publication_Number IS NULL
              OR trim(row.Publication_Number) = ''
            THEN NULL
            ELSE trim(row.Publication_Number)
        END,

    p.Patent_Title =
        CASE
            WHEN row.Patent_Title IS NULL
              OR trim(row.Patent_Title) = ''
            THEN NULL
            ELSE trim(row.Patent_Title)
        END,

    p.Patent_Status =
        CASE
            WHEN row.Patent_Status IS NULL
              OR trim(row.Patent_Status) = ''
            THEN NULL
            ELSE trim(row.Patent_Status)
        END,

    p.Abstract =
        CASE
            WHEN row.Abstract IS NULL
              OR trim(row.Abstract) = ''
            THEN NULL
            ELSE trim(row.Abstract)
        END,

    ////////////////////////////////////////////////////////////////
    // Integer Property
    ////////////////////////////////////////////////////////////////

    p.Year =
        CASE
            WHEN row.Year IS NULL
              OR trim(row.Year) = ''
            THEN NULL
            ELSE toInteger(trim(row.Year))
        END,

    ////////////////////////////////////////////////////////////////
    // Date Properties (ISO format: YYYY-MM-DD)
    ////////////////////////////////////////////////////////////////

    p.Application_Filing_Date =
        CASE
            WHEN row.Application_Filing_Date IS NULL
              OR trim(row.Application_Filing_Date) = ''
            THEN NULL
            ELSE date(trim(row.Application_Filing_Date))
        END,

    p.Publication_Date =
        CASE
            WHEN row.Publication_Date IS NULL
              OR trim(row.Publication_Date) = ''
            THEN NULL
            ELSE date(trim(row.Publication_Date))
        END;

////////////////////////////////////////////////////////////////////////
// END OF PART 3
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 02_import_nodes.cypher
//
// PART 4
// Person
// Publication
// Subdomain
// Thesis
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// PERSON
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Person.csv' AS row

WITH row
WHERE row.Person_ID IS NOT NULL
  AND trim(row.Person_ID) <> ''

MERGE (p:Person {Person_ID: trim(row.Person_ID)})

SET
    p.Name =
        CASE
            WHEN row.Name IS NULL
              OR trim(row.Name) = ''
            THEN NULL
            ELSE trim(row.Name)
        END;

////////////////////////////////////////////////////////////////////////
// PUBLICATION
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Publication.csv' AS row

WITH row
WHERE row.Publication_ID IS NOT NULL
  AND trim(row.Publication_ID) <> ''

MERGE (pub:Publication {Publication_ID: trim(row.Publication_ID)})

SET
    pub.Title =
        CASE
            WHEN row.Title IS NULL
              OR trim(row.Title) = ''
            THEN NULL
            ELSE trim(row.Title)
        END,

    pub.Venue =
        CASE
            WHEN row.Venue IS NULL
              OR trim(row.Venue) = ''
            THEN NULL
            ELSE trim(row.Venue)
        END,

    pub.Year =
        CASE
            WHEN row.Year IS NULL
              OR trim(row.Year) = ''
            THEN NULL
            ELSE toInteger(trim(row.Year))
        END,

    pub.DOI =
        CASE
            WHEN row.DOI IS NULL
              OR trim(row.DOI) = ''
            THEN NULL
            ELSE trim(row.DOI)
        END,

    pub.Citations =
        CASE
            WHEN row.Citations IS NULL
              OR trim(row.Citations) = ''
            THEN NULL
            ELSE toInteger(trim(row.Citations))
        END,

    pub.Source_URL =
        CASE
            WHEN row.Source_URL IS NULL
              OR trim(row.Source_URL) = ''
            THEN NULL
            ELSE trim(row.Source_URL)
        END;

////////////////////////////////////////////////////////////////////////
// SUBDOMAIN
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Subdomain.csv' AS row

WITH row
WHERE row.Subdomain_ID IS NOT NULL
  AND trim(row.Subdomain_ID) <> ''

MERGE (s:Subdomain {Subdomain_ID: trim(row.Subdomain_ID)})

SET
    s.Subdomain =
        CASE
            WHEN row.Subdomain IS NULL
              OR trim(row.Subdomain) = ''
            THEN NULL
            ELSE trim(row.Subdomain)
        END;

////////////////////////////////////////////////////////////////////////
// THESIS
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///Thesis.csv' AS row

WITH row
WHERE row.Thesis_ID IS NOT NULL
  AND trim(row.Thesis_ID) <> ''

MERGE (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})

SET
    t.Title =
        CASE
            WHEN row.Title IS NULL
              OR trim(row.Title) = ''
            THEN NULL
            ELSE trim(row.Title)
        END,

    t.Year =
        CASE
            WHEN row.Year IS NULL
              OR trim(row.Year) = ''
            THEN NULL
            ELSE toInteger(trim(row.Year))
        END,

    t.Abstract =
        CASE
            WHEN row.Abstract IS NULL
              OR trim(row.Abstract) = ''
            THEN NULL
            ELSE trim(row.Abstract)
        END,

    t.Source =
        CASE
            WHEN row.Source IS NULL
              OR trim(row.Source) = ''
            THEN NULL
            ELSE trim(row.Source)
        END,

    t.Source_URL =
        CASE
            WHEN row.Source_URL IS NULL
              OR trim(row.Source_URL) = ''
            THEN NULL
            ELSE trim(row.Source_URL)
        END;

////////////////////////////////////////////////////////////////////////
// END OF PART 4
////////////////////////////////////////////////////////////////////////