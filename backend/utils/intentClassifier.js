// Lightweight intent classifier and entity extractor for Phase 1.5
// Exports: classify(text) => { intent, confidence, entities }

const INTENT_KEYWORDS = {
    publications: ["publication", "paper", "article", "journal", "conference", "publications"],
    patents: ["patent", "patents", "application number", "publication number"],
    grants: ["grant", "grants", "funding", "funded"],
    theses: ["thesis", "theses", "dissertation"],
    institutions: ["institution", "university", "institute", "college", "school", "iisc", "iit"],
    researchers: ["researcher", "author", "authors", "professor", "prof", "dr ", "pi ", "principal investigator"],
    "funding agencies": ["agency", "foundation", "council", "serb", "dst", "dbt", "csir", "anrf"],
    "knowledge graph": ["knowledge graph", "graph", "neo4j", "node", "relationship"],
    "dashboard statistics": ["dashboard", "stats", "statistics", "overview", "count", "how many"],
    trends: ["trend", "trends", "growing", "growth", "emerging"]
};

// Common abbreviation -> canonical name map
const INSTITUTION_MAP = {
    "iisc": "Indian Institute of Science Bangalore",
    "iisc\.": "Indian Institute of Science Bangalore",
    "iitb": "Indian Institute of Technology Bombay",
    "iitm": "Indian Institute of Technology Madras",
    "iitd": "Indian Institute of Technology Delhi",
    "iiitb": "International Institute of Information Technology Bangalore",
    "nitk": "National Institute of Technology Karnataka"
};

function mapInstitutionName(raw) {
    if (!raw) return null;
    const lower = raw.toString().toLowerCase().trim();

    // direct abbreviation match
    for (const key of Object.keys(INSTITUTION_MAP)) {
        const cleanKey = key.replace(/\\./g, "");
        if (lower === cleanKey || lower === cleanKey.replace(/s$/, "")) {
            return INSTITUTION_MAP[key];
        }
    }

    // find abbreviation inside text
    const abbrRe = /\b(iisc|iitb|iitm|iitd|iiitb|nitk)\b/i;
    const m = raw.match(abbrRe);
    if (m) return INSTITUTION_MAP[m[1].toLowerCase()];

    // fallback: return the original cleaned string
    return raw.trim();
}

function findYears(text) {
    const years = [];
    const re = /\b(19|20)\d{2}\b/g;
    let m;
    while ((m = re.exec(text)) !== null) years.push(Number(m[0]));
    return years;
}

function findQuoted(text) {
    const quotes = [];
    const re = /"([^"]+)"|'([^']+)'/g;
    let m;
    while ((m = re.exec(text)) !== null) quotes.push(m[1] || m[2]);
    return quotes;
}

function findInstitution(text) {
    const re = /([A-Z][\w&.,'-]+(?:\s+[A-Z][\w&.,'-]+){0,5})\s+(Institute|University|College|Centre|Center|School|IISc|IIT)\b/i;
    const m = text.match(re);
    if (m) return (m[1] + ' ' + m[2]).trim();

    const atRe = /(?:at|in)\s+([A-Z][\w\s&.,'-]{3,60}(?:Institute|University|College|School|Centre|Center|IISc|IIT))/i;
    const n = text.match(atRe);
    if (n) return n[1].trim();

    return null;
}

function findResearcher(text) {
    // look for prefixes
    const re = /(?:by|author|authors|pi|prof(?:essor)?|dr\.?|supervised by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i;
    const m = text.match(re);
    if (m) return m[1];

    // fallback: two capitalized words
    const nameRe = /\b([A-Z][a-z]{2,} [A-Z][a-z]{2,})(?:\b|$)/g;
    const res = [];
    let mm;
    while ((mm = nameRe.exec(text)) !== null) {
        res.push(mm[1]);
    }
    return res.length > 0 ? res[0] : null;
}

function findFundingAgency(text) {
    // common acronyms
    const acrRe = /\b([A-Z]{2,5})\b/g;
    const matches = [];
    let m;
    while ((m = acrRe.exec(text)) !== null) {
        const s = m[1];
        if (["DST","SERB","DBT","CSIR","ANRF","ICMR","UGC"].includes(s)) matches.push(s);
    }
    if (matches.length) return matches[0];

    const agencyRe = /([A-Z][\w&'\-\s]+(?:Agency|Foundation|Council|Board|Trust))/i;
    const n = text.match(agencyRe);
    if (n) return n[1].trim();

    return null;
}

function findKeywords(text) {
    const re = /(?:about|on|regarding|about:|on:|regarding:)\s+([a-zA-Z0-9\-\s]{2,80})/i;
    const m = text.match(re);
    if (m) return m[1].trim();
    return null;
}

function scoreIntents(text) {
    const scores = {};
    const lower = text.toLowerCase();
    for (const intent in INTENT_KEYWORDS) {
        let score = 0;
        for (const kw of INTENT_KEYWORDS[intent]) {
            if (lower.includes(kw)) score += 1;
        }
        scores[intent] = score;
    }
    return scores;
}

export function classify(text = "") {
    const cleaned = (text || "").toString().trim();

    if (!cleaned) return { intent: "unknown", confidence: 0, entities: {} };

    const scores = scoreIntents(cleaned);

    // pick highest scoring intent
    let best = null;
    let bestScore = 0;
    for (const k of Object.keys(scores)) {
        if (scores[k] > bestScore) {
            best = k;
            bestScore = scores[k];
        }
    }

    const intent = bestScore > 0 ? best : "unknown";

    // Entity extraction
    const years = findYears(cleaned);
    const quotes = findQuoted(cleaned);
    const rawInstitution = findInstitution(cleaned);
    const institution = mapInstitutionName(rawInstitution || cleaned.match(/\b(iisc|iitb|iitm|iitd|iiitb|nitk)\b/i)?.[0] || rawInstitution);
    const researcher = findResearcher(cleaned);
    const fundingAgency = findFundingAgency(cleaned);
    
    // If the detected funding agency is the same token as the researcher (e.g. "DST"),
    // clear the researcher to avoid downstream filters matching PI = "DST".
    let finalResearcher = researcher || null;
    if (fundingAgency && finalResearcher) {
        try {
            if (finalResearcher.toString().toLowerCase() === fundingAgency.toString().toLowerCase()) {
                finalResearcher = null;
            }
            // also clear if researcher is an uppercase acronym matching known agencies
            const acr = finalResearcher && finalResearcher.toString().toUpperCase();
            if (acr && ["DST","SERB","DBT","CSIR","ANRF","ICMR","UGC"].includes(acr)) {
                finalResearcher = null;
            }
        } catch (e) {
            // ignore
        }
    }
    const keywords = findKeywords(cleaned);

    const entities = {
        years,
        titles: quotes,
        institution: institution || null,
        researcher: finalResearcher || null,
        fundingAgency: fundingAgency || null,
        keywords: keywords || null
    };

    // rough confidence: normalized bestScore / maxKeywords
    const maxKw = 4;
    const confidence = Math.min(1, bestScore / maxKw);

    return { intent, confidence, entities };
}

export default { classify };
