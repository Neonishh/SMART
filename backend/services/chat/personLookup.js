// ==========================================================
// Is this text a person's name? Used when a question names someone
// without a "by"/"Dr." cue ("richa sharma?", "give shylaja ss patent titles").
// Checks the ranked researcher CSV first (in memory, best rank wins), then
// Person nodes in Neo4j, with the same name rule as author/inventor filters.
// ==========================================================

import driver from "../../config/neo4j.js";
import { getResearchersData } from "../researcherService/csvLoader.js";
import { nameRegexes, nameMatcher, nameTokens, fullNameWordCount } from "../../utils/nameParts.js";

/** Display name of the best matching person, or null. Never throws. */
export async function findPersonByName(text) {
    // need a real name word plus something else (surname or initials):
    // a single word ("iot", "shylaja") is too ambiguous to treat as a person
    if (fullNameWordCount(text) < 1 || nameTokens(text).length < 2) return null;

    const matches = nameMatcher(text);
    const csvHits = getResearchersData().filter((r) => matches(r.researcher));
    if (csvHits.length) {
        csvHits.sort((a, b) => Number(a.rank) - Number(b.rank)); // rank 1 = top researcher
        return csvHits[0].researcher;
    }

    const session = driver.session();
    try {
        const res = await session.run(
            `MATCH (p:Person)
             WHERE all(rx IN $regexes WHERE toLower(p.Name) =~ rx)
             WITH p, COUNT { (p)-[:AUTHORED_PUBLICATION|INVENTED|PI_OF|AUTHORED_THESIS|SUPERVISED]->() } AS works
             WHERE works > 0
             RETURN p.Name AS name ORDER BY works DESC LIMIT 1`,
            { regexes: nameRegexes(text) },
        );
        return res.records[0]?.get("name") ?? null;
    } catch (err) {
        console.error("[chat] person lookup failed:", err.message);
        return null;
    } finally {
        await session.close();
    }
}
