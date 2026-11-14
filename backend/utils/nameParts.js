// Person names in the graph are inconsistent: "PRASAD HONNAVALLI",
// "Prasad B. Honnavalli", "PROF. PRASAD B. HONNAVALLI", "Prasad Honnavalli B",
// "L. R. D. Murthy" / "Murthy L.R.D".
//
// Rule: every full name part (2+ letters) must appear as a whole word, in any
// order. Initials are ignored when there are 2+ full parts ("Prasad Honnavalli"
// finds "Prasad B. Honnavalli"), but required as standalone letters when there
// is only one ("L. R. D. Murthy" must not match every Murthy).
const TITLES = new Set(["dr", "prof", "mr", "mrs", "ms"]);

export function nameTokens(name) {
    const tokens = String(name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !TITLES.has(w));
    const full = tokens.filter((w) => w.length >= 2);
    const initials = tokens.filter((w) => w.length === 1);
    return full.length >= 2 ? full : [...full, ...initials];
}

/** Regexes (for Neo4j `=~` on a lower-cased name) that must ALL match. */
export function nameRegexes(name) {
    const tokens = nameTokens(name);
    if (!tokens.length) return [`(?s).*${String(name || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "")}.*`];
    return tokens.map((t) => `(?s).*\\b${t}\\b.*`);
}

/** Same rule in JavaScript, for in-memory lists (e.g. theses). */
export function nameMatcher(name) {
    const tokens = nameTokens(name);
    const res = tokens.map((t) => new RegExp(`(^|[^\\p{L}\\p{N}])${t}($|[^\\p{L}\\p{N}])`, "u"));
    return (candidate) => Boolean(candidate) && res.length > 0 && res.every((re) => re.test(String(candidate).toLowerCase()));
}

/** Punctuation/space-insensitive key: "L. R. D. Murthy" === "L R D Murthy". */
export const looseNameKey = (name) => String(name || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
