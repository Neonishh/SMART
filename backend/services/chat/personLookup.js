// ==========================================================
// Is this text a person's name? Used for bare-name questions
// ("richa sharma?") that carry no "by"/"Dr." cue.
// Checks the ranked researcher CSV first (in memory), then Person
// nodes in Neo4j with the same name rule as author/inventor filters.
// ==========================================================

import driver from "../../config/neo4j.js";
import { getResearchersData } from "../researcherService/csvLoader.js";
import { nameRegexes, nameTokens, looseNameKey } from "../../utils/nameParts.js";

/** Display name of a matching person, or null. Never throws. */
export async function findPersonByName(text) {
    const tokens = nameTokens(text);
    if (tokens.filter((t) => t.length >= 2).length < 2) return null;

    const key = looseNameKey(text);
    const csvHit = getResearchersData().find((r) => looseNameKey(r.researcher) === key);
    if (csvHit) return csvHit.researcher;

    const session = driver.session();
    try {
        const res = await session.run(
            `MATCH (p:Person)
             WHERE all(rx IN $regexes WHERE toLower(p.Name) =~ rx)
               AND (EXISTS { (p)-[:AUTHORED_PUBLICATION|INVENTED|PI_OF|AUTHORED_THESIS|SUPERVISED]->() })
             RETURN p.Name AS name LIMIT 1`,
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
