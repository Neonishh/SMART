// Person names in the graph are inconsistent: "PRASAD HONNAVALLI",
// "Prasad B. Honnavalli", "PROF. PRASAD B. HONNAVALLI", "Prasad Honnavalli B",
// "L. R. D. Murthy" / "Murthy L.R.D", "DR. SHYLAJA S S" / "S. S. Shylaja" / "Shylaja Ss".
//
// Rules:
// - Every full name part must appear as a whole word, in any order.
// - Initials are grouped into one "cluster" ("S. S." / "s s" / "ss" -> ss) that
//   matches however they are spaced or dotted ("s s", "s. s.", "ss", "s.s").
//   A short word with no vowels ("ss", "lrd", "hr") is treated as initials.
// - Initials are ignored when there are 2+ full parts ("Prasad Honnavalli"
//   finds "Prasad B. Honnavalli"), but required when there is only one
//   ("L. R. D. Murthy" must not match every Murthy).
const TITLES = new Set(["dr", "prof", "mr", "mrs", "ms"]);
const isInitialsWord = (w) => w.length >= 2 && w.length <= 4 && !/[aeiouy]/.test(w);

/** [{ text, initials }] — full words and initial clusters, in order. */
function nameUnits(name) {
    const tokens = String(name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !TITLES.has(w));
    const units = [];
    for (const t of tokens) {
        const prev = units[units.length - 1];
        if (t.length === 1 && prev?.initials) prev.text += t;          // "s" "s" -> "ss"
        else if (t.length === 1 || isInitialsWord(t)) units.push({ text: t, initials: true });
        else units.push({ text: t, initials: false });
    }
    return units;
}

/** The units that must all match (see rules above). */
function requiredUnits(name) {
    const units = nameUnits(name);
    const full = units.filter((u) => !u.initials);
    return full.length >= 2 ? full : units;
}

/** Plain strings, for callers that only need to count parts. */
export function nameTokens(name) {
    return requiredUnits(name).map((u) => u.text);
}

/** Number of full (non-initial) words in a name. */
export const fullNameWordCount = (name) => nameUnits(name).filter((u) => !u.initials).length;

const unitPattern = (u) => (u.initials ? `\\b${u.text.split("").join("[.\\s]*")}\\b` : `\\b${u.text}\\b`);

/** Regexes (for Neo4j `=~` on a lower-cased name) that must ALL match. */
export function nameRegexes(name) {
    const units = requiredUnits(name);
    if (!units.length) return [`(?s).*${String(name || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "")}.*`];
    return units.map((u) => `(?s).*${unitPattern(u)}.*`);
}

/** Same rule in JavaScript, for in-memory lists (theses, researcher CSV). */
export function nameMatcher(name) {
    const res = requiredUnits(name).map((u) => new RegExp(unitPattern(u)));
    return (candidate) => Boolean(candidate) && res.length > 0 && res.every((re) => re.test(String(candidate).toLowerCase()));
}

/** Punctuation/space-insensitive key: "L. R. D. Murthy" === "L R D Murthy". */
export const looseNameKey = (name) => String(name || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
