////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 03_import_relationships.cypher
//
// PART 1
//
// APPLIED_FOR
// AUTHORED_PUBLICATION
// AUTHORED_THESIS
// BELONGS_TO_FIELD
// FUNDED_BY
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// APPLIED_FOR
// (Applicant)-[:APPLIED_FOR]->(Patent)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///APPLIED_FOR.csv' AS row

WITH row
WHERE trim(row.Applicant_ID) <> ''
  AND trim(row.Patent_ID) <> ''

MATCH (a:Applicant {Applicant_ID: trim(row.Applicant_ID)})
MATCH (p:Patent {Patent_ID: trim(row.Patent_ID)})

MERGE (a)-[:APPLIED_FOR]->(p);



////////////////////////////////////////////////////////////////////////
// AUTHORED_PUBLICATION
// (Person)-[:AUTHORED_PUBLICATION]->(Publication)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///AUTHORED_PUBLICATION.csv' AS row

WITH row
WHERE trim(row.Person_ID) <> ''
  AND trim(row.Publication_ID) <> ''

MATCH (p:Person {Person_ID: trim(row.Person_ID)})
MATCH (pub:Publication {Publication_ID: trim(row.Publication_ID)})

MERGE (p)-[:AUTHORED_PUBLICATION]->(pub);



////////////////////////////////////////////////////////////////////////
// AUTHORED_THESIS
// (Person)-[:AUTHORED_THESIS]->(Thesis)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///AUTHORED_THESIS.csv' AS row

WITH row
WHERE trim(row.Person_ID) <> ''
  AND trim(row.Thesis_ID) <> ''

MATCH (p:Person {Person_ID: trim(row.Person_ID)})
MATCH (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})

MERGE (p)-[:AUTHORED_THESIS]->(t);



////////////////////////////////////////////////////////////////////////
// BELONGS_TO_FIELD
// (Patent)-[:BELONGS_TO_FIELD]->(Field)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///BELONGS_TO_FIELD.csv' AS row

WITH row
WHERE trim(row.Patent_ID) <> ''
  AND trim(row.Field_ID) <> ''

MATCH (p:Patent {Patent_ID: trim(row.Patent_ID)})
MATCH (f:Field {Field_ID: trim(row.Field_ID)})

MERGE (p)-[:BELONGS_TO_FIELD]->(f);



////////////////////////////////////////////////////////////////////////
// FUNDED_BY
// (Grant)-[:FUNDED_BY]->(FundingAgency)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///FUNDED_BY.csv' AS row

WITH row
WHERE trim(row.Agency_ID) <> ''
  AND trim(row.Grant_ID) <> ''

MATCH (fa:FundingAgency {Agency_ID: trim(row.Agency_ID)})
MATCH (g:Grant {Grant_ID: trim(row.Grant_ID)})

MERGE (g)-[:FUNDED_BY]->(fa);



////////////////////////////////////////////////////////////////////////
// END OF PART 1
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 03_import_relationships.cypher
//
// PART 2
//
// HANDLES_GRANT
// HANDLES_THESIS
// HAS_DEPARTMENT
// HAS_DOMAIN
// HAS_GRANT
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// HANDLES_GRANT
// (Department)-[:HANDLES_GRANT]->(Grant)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HANDLES_GRANT.csv' AS row

WITH row
WHERE trim(row.Department_ID) <> ''
  AND trim(row.Grant_ID) <> ''

MATCH (d:Department {Department_ID: trim(row.Department_ID)})
MATCH (g:Grant {Grant_ID: trim(row.Grant_ID)})

MERGE (d)-[:HANDLES_GRANT]->(g);



////////////////////////////////////////////////////////////////////////
// HANDLES_THESIS
// (Department)-[:HANDLES_THESIS]->(Thesis)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HANDLES_THESIS.csv' AS row

WITH row
WHERE trim(row.Department_ID) <> ''
  AND trim(row.Thesis_ID) <> ''

MATCH (d:Department {Department_ID: trim(row.Department_ID)})
MATCH (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})

MERGE (d)-[:HANDLES_THESIS]->(t);



////////////////////////////////////////////////////////////////////////
// HAS_DEPARTMENT
// (Institution)-[:HAS_DEPARTMENT]->(Department)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_DEPARTMENT.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Department_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (d:Department {Department_ID: trim(row.Department_ID)})

MERGE (i)-[:HAS_DEPARTMENT]->(d);



////////////////////////////////////////////////////////////////////////
// HAS_DOMAIN
// (Publication)-[:HAS_DOMAIN]->(Domain)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_DOMAIN.csv' AS row

WITH row
WHERE trim(row.Publication_ID) <> ''
  AND trim(row.Domain_ID) <> ''

MATCH (p:Publication {Publication_ID: trim(row.Publication_ID)})
MATCH (d:Domain {Domain_ID: trim(row.Domain_ID)})

MERGE (p)-[:HAS_DOMAIN]->(d);



////////////////////////////////////////////////////////////////////////
// HAS_GRANT
// (Institution)-[:HAS_GRANT]->(Grant)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_GRANT.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Grant_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (g:Grant {Grant_ID: trim(row.Grant_ID)})

MERGE (i)-[:HAS_GRANT]->(g);



////////////////////////////////////////////////////////////////////////
// END OF PART 2
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 03_import_relationships.cypher
//
// PART 3
//
// HAS_IPC
// HAS_KEYWORD
// HAS_PATENT
// HAS_PUBLICATION
// HAS_SUBDOMAIN
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// HAS_IPC
// (Patent)-[:HAS_IPC]->(IPC)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_IPC.csv' AS row

WITH row
WHERE trim(row.Patent_ID) <> ''
  AND trim(row.IPC_ID) <> ''

MATCH (p:Patent {Patent_ID: trim(row.Patent_ID)})
MATCH (i:IPC {IPC_ID: trim(row.IPC_ID)})

MERGE (p)-[:HAS_IPC]->(i);



////////////////////////////////////////////////////////////////////////
// HAS_KEYWORD
// (Thesis)-[:HAS_KEYWORD]->(Keyword)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_KEYWORD.csv' AS row

WITH row
WHERE trim(row.Thesis_ID) <> ''
  AND trim(row.Keyword_ID) <> ''

MATCH (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})
MATCH (k:Keyword {Keyword_ID: trim(row.Keyword_ID)})

MERGE (t)-[:HAS_KEYWORD]->(k);



////////////////////////////////////////////////////////////////////////
// HAS_PATENT
// (Institution)-[:HAS_PATENT]->(Patent)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_PATENT.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Patent_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (p:Patent {Patent_ID: trim(row.Patent_ID)})

MERGE (i)-[:HAS_PATENT]->(p);



////////////////////////////////////////////////////////////////////////
// HAS_PUBLICATION
// (Institution)-[:HAS_PUBLICATION]->(Publication)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_PUBLICATION.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Publication_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (p:Publication {Publication_ID: trim(row.Publication_ID)})

MERGE (i)-[:HAS_PUBLICATION]->(p);



////////////////////////////////////////////////////////////////////////
// HAS_SUBDOMAIN
// (Publication)-[:HAS_SUBDOMAIN]->(Subdomain)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_SUBDOMAIN.csv' AS row

WITH row
WHERE trim(row.Publication_ID) <> ''
  AND trim(row.Subdomain_ID) <> ''

MATCH (p:Publication {Publication_ID: trim(row.Publication_ID)})
MATCH (s:Subdomain {Subdomain_ID: trim(row.Subdomain_ID)})

MERGE (p)-[:HAS_SUBDOMAIN]->(s);



////////////////////////////////////////////////////////////////////////
// END OF PART 3
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
// SMART Knowledge Graph
// File: 03_import_relationships.cypher
//
// PART 4
//
// HAS_THESIS
// INVENTED
// LOCATED_IN
// PI_OF
// SUPERVISED
//
// Neo4j 5.x / Desktop 2026 Compatible
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// HAS_THESIS
// (Institution)-[:HAS_THESIS]->(Thesis)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///HAS_THESIS.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Thesis_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})

MERGE (i)-[:HAS_THESIS]->(t);



////////////////////////////////////////////////////////////////////////
// INVENTED
// (Person)-[:INVENTED]->(Patent)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///INVENTED.csv' AS row

WITH row
WHERE trim(row.Person_ID) <> ''
  AND trim(row.Patent_ID) <> ''

MATCH (p:Person {Person_ID: trim(row.Person_ID)})
MATCH (pat:Patent {Patent_ID: trim(row.Patent_ID)})

MERGE (p)-[:INVENTED]->(pat);



////////////////////////////////////////////////////////////////////////
// LOCATED_IN
// (Institution)-[:LOCATED_IN]->(Location)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///LOCATED_IN.csv' AS row

WITH row
WHERE trim(row.Institution_ID) <> ''
  AND trim(row.Location_ID) <> ''

MATCH (i:Institution {Institution_ID: trim(row.Institution_ID)})
MATCH (l:Location {Location_ID: trim(row.Location_ID)})

MERGE (i)-[:LOCATED_IN]->(l);



////////////////////////////////////////////////////////////////////////
// PI_OF
// (Person)-[:PI_OF]->(Grant)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///PI_OF.csv' AS row

WITH row
WHERE trim(row.Person_ID) <> ''
  AND trim(row.Grant_ID) <> ''

MATCH (p:Person {Person_ID: trim(row.Person_ID)})
MATCH (g:Grant {Grant_ID: trim(row.Grant_ID)})

MERGE (p)-[:PI_OF]->(g);



////////////////////////////////////////////////////////////////////////
// SUPERVISED
// (Person)-[:SUPERVISED]->(Thesis)
////////////////////////////////////////////////////////////////////////

LOAD CSV WITH HEADERS
FROM 'file:///SUPERVISED.csv' AS row

WITH row
WHERE trim(row.Person_ID) <> ''
  AND trim(row.Thesis_ID) <> ''

MATCH (p:Person {Person_ID: trim(row.Person_ID)})
MATCH (t:Thesis {Thesis_ID: trim(row.Thesis_ID)})

MERGE (p)-[:SUPERVISED]->(t);



////////////////////////////////////////////////////////////////////////
// END OF RELATIONSHIP IMPORT
////////////////////////////////////////////////////////////////////////