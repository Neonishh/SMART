import driver from "../config/neo4j.js";
import neo4j from "neo4j-driver";

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
const orNull = (v) => clean(v) || null;
const makeId = (v = "") =>
  String(v).trim().toUpperCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
const splitList = (v) => [...new Set(String(v || "").split(/[;,]/).map((s) => s.trim()).filter(Boolean))];
const newId = (p) => `MANUAL_${p}_${Date.now().toString(36).toUpperCase()}`;
const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const toNum = (v) => (v == null ? null : neo4j.isInt(v) ? v.toNumber() : Number(v));

function bad(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
function need(data, fields) {
  const missing = fields.filter((f) => !clean(data[f]));
  if (missing.length) throw bad(`Required: ${missing.join(", ")}`);
}
function year(v) {
  const y = num(v);
  if (!Number.isInteger(y) || y < 1900 || y > 2100) throw bad("Please enter a valid year.");
  return neo4j.int(y);
}
async function withSession(fn) {
  const s = driver.session();
  try { return await fn(s); } finally { await s.close(); }
}

/* Shared tail: optional location link on the institution */
const LOCATION = `
  FOREACH (_ IN CASE WHEN $locId IS NULL THEN [] ELSE [1] END |
    MERGE (l:Location {Location: $location}) ON CREATE SET l.Location_ID = $locId
    MERGE (inst)-[:LOCATED_IN]->(l))`;

/* ---------------- GRANT ---------------- */
async function createGrant(d, user) {
  need(d, ["Project_Title", "PI_Name", "Institution", "Sanction_Year"]);
  const id = newId("GRANT");
  let inr = num(d.Amount_INR);
  const lakhs = num(d.Amount_Lakhs);
  if (inr === null && lakhs !== null) inr = lakhs * 100000;

  await withSession((s) => s.run(`
    CREATE (g:Grant {Grant_ID:$id, Title:$title, Year:$year, Amount:$amount, Amount_Lakhs:$lakhs,
      Duration:$duration, Program_Scheme:$scheme, Discipline:$discipline, File_Number:$fileNumber,
      Source:$source, Source_URL:$sourceUrl,
      is_manual:true, is_deleted:false, created_at:datetime(), created_by:$by})
    MERGE (inst:Institution {Institution:$institution}) ON CREATE SET inst.Institution_ID=$instId
    MERGE (inst)-[:HAS_GRANT]->(g)
    MERGE (pi:Person {Name:$pi}) ON CREATE SET pi.Person_ID=$piId
    MERGE (pi)-[:PI_OF]->(g)
    FOREACH (_ IN CASE WHEN $agency IS NULL THEN [] ELSE [1] END |
      MERGE (a:FundingAgency {Funding_Agency:$agency}) ON CREATE SET a.Agency_ID=$agencyId
      MERGE (g)-[:FUNDED_BY]->(a))
    FOREACH (_ IN CASE WHEN $dept IS NULL THEN [] ELSE [1] END |
      MERGE (dp:Department {Department:$dept}) ON CREATE SET dp.Department_ID=$deptId
      MERGE (dp)-[:HANDLES_GRANT]->(g)
      MERGE (inst)-[:HAS_DEPARTMENT]->(dp))
    ${LOCATION}
  `, {
    id, title: clean(d.Project_Title), year: year(d.Sanction_Year), amount: inr, lakhs,
    duration: orNull(d.Duration), scheme: orNull(d.Program_Scheme), discipline: orNull(d.Discipline),
    fileNumber: orNull(d.File_Number), source: orNull(d.Source), sourceUrl: orNull(d.Source_URL),
    by: user?.name || "Contributor",
    institution: clean(d.Institution), instId: makeId(d.Institution),
    pi: clean(d.PI_Name), piId: makeId(d.PI_Name),
    agency: orNull(d.Funding_Agency), agencyId: makeId(d.Funding_Agency) || null,
    dept: orNull(d.Department), deptId: makeId(d.Department) || null,
    location: orNull(d.Location), locId: makeId(d.Location) || null,
  }));
  return { id };
}

/* ---------------- PATENT ---------------- */
async function createPatent(d, user) {
  need(d, ["Patent_Title", "Institution", "Application_Number", "Applicant_Name", "Inventor_Name"]);
  const id = newId("PATENT");
  const y = year(d.Year || clean(d.Application_Filing_Date).slice(0, 4));
  const inventors = splitList(d.Inventor_Name).map((n) => ({ id: makeId(n), name: n }));
  const codes = splitList(d.IPC_Code);

  await withSession(async (s) => {
    await s.run(`
      CREATE (pat:Patent {Patent_ID:$id, Patent_Title:$title, Patent_Status:$status,
        Application_Number:$appNo, Publication_Number:$pubNo,
        Application_Filing_Date:$filing, Publication_Date:$pubDate, Year:$year, Abstract:$abstract,
        is_manual:true, is_deleted:false, created_at:datetime(), created_by:$by})
      MERGE (inst:Institution {Institution:$institution}) ON CREATE SET inst.Institution_ID=$instId
      MERGE (inst)-[:HAS_PATENT]->(pat)
      MERGE (app:Applicant {Applicant_Name:$applicant})
        ON CREATE SET app.Applicant_ID=$applicantId, app.Applicant_Address=$address
      MERGE (app)-[:APPLIED_FOR]->(pat)
      FOREACH (_ IN CASE WHEN $field IS NULL THEN [] ELSE [1] END |
        MERGE (f:Field {Field:$field}) ON CREATE SET f.Field_ID=$fieldId
        MERGE (pat)-[:BELONGS_TO_FIELD]->(f))
      ${LOCATION}
    `, {
      id, title: clean(d.Patent_Title), status: orNull(d.Patent_Status),
      appNo: clean(d.Application_Number), pubNo: orNull(d.Publication_Number),
      filing: orNull(d.Application_Filing_Date), pubDate: orNull(d.Publication_Date),
      year: y, abstract: orNull(d.Abstract), by: user?.name || "Contributor",
      institution: clean(d.Institution), instId: makeId(d.Institution),
      applicant: clean(d.Applicant_Name), applicantId: makeId(d.Applicant_Name), address: orNull(d.Applicant_Address),
      field: orNull(d.Field_Of_Invention), fieldId: makeId(d.Field_Of_Invention) || null,
      location: orNull(d.Location), locId: makeId(d.Location) || null,
    });
    await s.run(`
      MATCH (pat:Patent {Patent_ID:$id})
      UNWIND $inventors AS inv
      MERGE (p:Person {Name:inv.name}) ON CREATE SET p.Person_ID=inv.id
      MERGE (p)-[:INVENTED]->(pat)`, { id, inventors });
    if (codes.length) {
      await s.run(`
        MATCH (pat:Patent {Patent_ID:$id})
        UNWIND $codes AS c
        MERGE (i:IPC {IPC_Code:c}) ON CREATE SET i.IPC_ID=c
        MERGE (pat)-[:HAS_IPC]->(i)`, { id, codes });
    }
  });
  return { id };
}

/* ---------------- PUBLICATION ---------------- */
async function createPublication(d, user) {
  need(d, ["Title", "Authors", "Institution", "Year"]);
  const id = newId("PUB");
  const authors = splitList(d.Authors).map((n) => ({ id: makeId(n), name: n }));
  const citations = num(d.Citations);

  await withSession(async (s) => {
    await s.run(`
      CREATE (p:Publication {Publication_ID:$id, Title:$title, Venue:$venue, Year:$year, DOI:$doi,
        Source_URL:$sourceUrl, Citations:$citations,
        is_manual:true, is_deleted:false, created_at:datetime(), created_by:$by})
      MERGE (inst:Institution {Institution:$institution}) ON CREATE SET inst.Institution_ID=$instId
      MERGE (inst)-[:HAS_PUBLICATION]->(p)
      FOREACH (_ IN CASE WHEN $domain IS NULL THEN [] ELSE [1] END |
        MERGE (dm:Domain {Domain:$domain}) ON CREATE SET dm.Domain_ID=$domainId
        MERGE (p)-[:HAS_DOMAIN]->(dm))
      FOREACH (_ IN CASE WHEN $subdomain IS NULL THEN [] ELSE [1] END |
        MERGE (sd:Subdomain {Subdomain:$subdomain}) ON CREATE SET sd.Subdomain_ID=$subdomainId
        MERGE (p)-[:HAS_SUBDOMAIN]->(sd))
      ${LOCATION}
    `, {
      id, title: clean(d.Title), venue: orNull(d.Venue), year: year(d.Year), doi: orNull(d.DOI),
      sourceUrl: orNull(d.Source_URL), citations: citations === null ? null : neo4j.int(citations),
      by: user?.name || "Contributor",
      institution: clean(d.Institution), instId: makeId(d.Institution),
      domain: orNull(d.Domain), domainId: makeId(d.Domain) || null,
      subdomain: orNull(d.Subdomain), subdomainId: makeId(d.Subdomain) || null,
      location: orNull(d.Location), locId: makeId(d.Location) || null,
    });
    await s.run(`
      MATCH (p:Publication {Publication_ID:$id})
      UNWIND $authors AS a
      MERGE (person:Person {Name:a.name}) ON CREATE SET person.Person_ID=a.id
      MERGE (person)-[:AUTHORED_PUBLICATION]->(p)`, { id, authors });
  });
  return { id };
}

const CREATORS = { Grant: createGrant, Patent: createPatent, Publication: createPublication };

export function createManual(type, data, user) {
  if (!CREATORS[type]) throw bad("Unsupported type.");
  return CREATORS[type](data || {}, user);
}

/* ---------------- LIST (manual only) ---------------- */
const LISTS = {
  Grant: {
    cypher: `
      MATCH (n:Grant) WHERE n.is_manual = true AND coalesce(n.is_deleted,false) = false
      OPTIONAL MATCH (inst:Institution)-[:HAS_GRANT]->(n)
      OPTIONAL MATCH (n)-[:FUNDED_BY]->(a:FundingAgency)
      OPTIONAL MATCH (pi:Person)-[:PI_OF]->(n)
      RETURN n.Grant_ID AS id, n.Title AS title, n.Year AS year, n.Source_URL AS sourceUrl,
             n.created_by AS createdBy, toString(n.created_at) AS createdAt, n.Amount AS amount,
             head(collect(DISTINCT inst.Institution)) AS institution,
             head(collect(DISTINCT a.Funding_Agency)) AS agency,
             collect(DISTINCT pi.Name) AS people
      ORDER BY createdAt DESC`,
    detail: (r) => [r.get("agency"),
      r.get("amount") != null ? `₹${Number(toNum(r.get("amount"))).toLocaleString("en-IN")}` : null]
      .filter(Boolean).join(" · "),
  },
  Patent: {
    cypher: `
      MATCH (n:Patent) WHERE n.is_manual = true AND coalesce(n.is_deleted,false) = false
      OPTIONAL MATCH (inst:Institution)-[:HAS_PATENT]->(n)
      OPTIONAL MATCH (app:Applicant)-[:APPLIED_FOR]->(n)
      OPTIONAL MATCH (p:Person)-[:INVENTED]->(n)
      RETURN n.Patent_ID AS id, n.Patent_Title AS title, n.Year AS year, n.Source_URL AS sourceUrl,
             n.created_by AS createdBy, toString(n.created_at) AS createdAt, n.Patent_Status AS status,
             head(collect(DISTINCT inst.Institution)) AS institution,
             head(collect(DISTINCT app.Applicant_Name)) AS applicant,
             collect(DISTINCT p.Name) AS people
      ORDER BY createdAt DESC`,
    detail: (r) => [r.get("applicant"), r.get("status")].filter(Boolean).join(" · "),
  },
  Publication: {
    cypher: `
      MATCH (n:Publication) WHERE n.is_manual = true AND coalesce(n.is_deleted,false) = false
      OPTIONAL MATCH (inst:Institution)-[:HAS_PUBLICATION]->(n)
      OPTIONAL MATCH (a:Person)-[:AUTHORED_PUBLICATION]->(n)
      RETURN n.Publication_ID AS id, n.Title AS title, n.Year AS year, n.Source_URL AS sourceUrl,
             n.created_by AS createdBy, toString(n.created_at) AS createdAt, n.Venue AS venue,
             head(collect(DISTINCT inst.Institution)) AS institution,
             collect(DISTINCT a.Name) AS people
      ORDER BY createdAt DESC`,
    detail: (r) => r.get("venue") || "",
  },
};

export async function listManual(type) {
  const cfg = LISTS[type];
  if (!cfg) throw bad("Unsupported type.");
  const result = await withSession((s) => s.run(cfg.cypher));
  return result.records.map((r) => ({
    id: r.get("id"),
    type,
    title: r.get("title"),
    year: toNum(r.get("year")),
    institution: r.get("institution"),
    people: r.get("people").filter(Boolean),
    detail: cfg.detail(r),
    sourceUrl: r.get("sourceUrl"),
    createdBy: r.get("createdBy"),
    createdAt: r.get("createdAt"),
  }));
}

/* ---------------- SOFT DELETE (manual only) ---------------- */
const META = {
  Grant: ["Grant", "Grant_ID"],
  Patent: ["Patent", "Patent_ID"],
  Publication: ["Publication", "Publication_ID"],
};

export async function softDeleteManual(type, id, by) {
  if (!META[type]) throw bad("Unsupported type.");
  const [label, key] = META[type];
  const result = await withSession((s) => s.run(`
    MATCH (n:${label} {${key}:$id}) WHERE n.is_manual = true AND coalesce(n.is_deleted,false) = false
    SET n.is_deleted = true, n.deleted_at = datetime(), n.deleted_by = $by
    RETURN n.${key} AS id`, { id, by }));
  if (!result.records.length) {
    const e = new Error("Contributed entry not found."); e.statusCode = 404; throw e;
  }
  return { id, deleted: true };
}