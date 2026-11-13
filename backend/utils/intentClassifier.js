// ==========================================================
// Intent classifier + entity extractor (rule-based, no LLM)
//
// classify(text) => { intent, confidence, entities, flags }
//
// Responsibility: ONLY intent/entity extraction. No DB calls.
// ==========================================================

const CURRENT_YEAR = new Date().getFullYear();

// ----------------------------------------------------------
// Intents
// ----------------------------------------------------------

const INTENT_KEYWORDS = {
    publications: ["publication", "publications", "paper", "papers", "article", "articles", "journal", "conference", "published", "cited", "citations"],
    patents: ["patent", "patents", "invention", "inventions", "inventor", "inventors", "filed", "ipc"],
    grants: ["grant", "grants", "funding", "funded", "project", "projects", "sanctioned", "amount"],
    theses: ["thesis", "theses", "dissertation", "dissertations", "phd", "doctoral", "shodhganga"],
    researchers: ["researcher", "researchers", "author", "authors", "professor", "faculty", "scientist", "scientists", "who is", "who are", "experts", "expert", "investigator", "supervisor", "supervisors"],
    institutions: ["institution", "institutions", "university", "universities", "institute", "institutes", "college", "colleges"],
    "funding agencies": ["agency", "agencies", "funder", "funders", "sponsor", "sponsors"],
    "knowledge graph": ["knowledge graph", "graph", "neo4j", "node", "nodes", "relationship", "relationships", "schema"],
    "dashboard statistics": ["dashboard", "stats", "statistics", "overview", "summary", "total", "totals", "how many", "count", "number of"],
    trends: ["trend", "trends", "trending", "growing", "growth", "emerging", "momentum", "cagr", "rising", "over the years", "over time", "year on year", "yoy"],
    compare: ["compare", "comparison", "versus", " vs ", " vs.", "difference between"],
    help: ["help", "what can you do", "what can i ask", "how do i use", "capabilities"],
    greeting: ["hi", "hello", "hey", "good morning", "good evening", "namaste", "thanks", "thank you"],
};

// ----------------------------------------------------------
// The 8 SMART institutions — canonical names match Institution.csv
// ----------------------------------------------------------

const INSTITUTIONS = [
    { name: "Indian Institute of Science Bangalore", aliases: ["iisc", "indian institute of science"] },
    { name: "International Institute of Information Technology Bangalore", aliases: ["iiitb", "iiit-b", "iiit b", "iiit bangalore", "iiit-bangalore", "international institute of information technology"] },
    { name: "PES University", aliases: ["pes university", "pesu", "pes"] },
    { name: "R V College of Engineering", aliases: ["rvce", "rv college", "r v college", "r.v. college", "rv college of engineering"] },
    { name: "M S Ramaiah Institute of Technology", aliases: ["msrit", "ramaiah", "ms ramaiah", "m s ramaiah", "m.s. ramaiah"] },
    { name: "B.M.S. College of Engineering", aliases: ["bmsce", "bms college", "b.m.s. college", "bms"] },
    { name: "Dayananda Sagar College of Engineering", aliases: ["dsce", "dayananda sagar", "dayanand sagar"] },
    { name: "CMR Institute of Technology", aliases: ["cmrit", "cmr institute", "cmr"] },
];

// FundingAgency.csv acronyms ("RIT" deliberately excluded — collides with MSRIT)
const AGENCY_ACRONYMS = ["ANRF", "SERB", "DST", "DBT", "CSIR", "ICMR", "UGC", "AICTE", "VGST", "KSCST", "KREDL", "VTU", "ISRO", "DRDO", "MEITY", "BIRAC", "DAE", "MHRD", "NRDMS"];

// Technology domains from nlp/trend_engine/outputs/domain_cagr.csv
const DOMAINS = [
    { name: "Artificial Intelligence and Computer Vision", aliases: ["ai", "artificial intelligence", "computer vision", "machine learning", "ml", "deep learning", "neural network", "neural networks", "image processing"] },
    { name: "Wireless Communications and IoT", aliases: ["iot", "internet of things", "wireless", "5g", "6g", "communication", "communications", "antenna", "signal processing"] },
    { name: "Cybersecurity and Blockchain", aliases: ["cybersecurity", "cyber security", "security", "blockchain", "cryptography", "intrusion"] },
    { name: "Energy Storage and Renewable Energy", aliases: ["renewable", "renewable energy", "solar", "battery", "batteries", "energy storage", "fuel cell", "hydrogen"] },
    { name: "Smart Energy Systems", aliases: ["smart grid", "power systems", "power electronics", "electric vehicle", "ev"] },
    { name: "Robotics and Autonomous Systems", aliases: ["robotics", "robot", "robots", "autonomous", "drone", "drones", "uav"] },
    { name: "Semiconductors and Nanoelectronics", aliases: ["semiconductor", "semiconductors", "vlsi", "nanoelectronics", "chip", "chips", "transistor"] },
    { name: "Photonics and Quantum Materials", aliases: ["quantum", "photonics", "optics", "laser", "lasers"] },
    { name: "Healthcare and Biomedical Engineering", aliases: ["healthcare", "biomedical", "medical", "health", "medicine", "diagnosis"] },
    { name: "Bioinformatics and Life Sciences", aliases: ["bioinformatics", "life sciences", "biology", "genomics", "biotech", "biotechnology"] },
    { name: "Biomaterials and Tissue Engineering", aliases: ["biomaterials", "tissue engineering", "scaffold"] },
    { name: "Advanced Materials and Nanotechnology", aliases: ["nanotechnology", "nanomaterials", "materials science", "advanced materials", "graphene", "composites"] },
    { name: "Advanced Manufacturing and Metallurgy", aliases: ["manufacturing", "metallurgy", "additive manufacturing", "3d printing", "alloys", "welding"] },
    { name: "Speech and Language Technologies", aliases: ["nlp", "natural language processing", "speech", "language models", "llm", "llms"] },
    { name: "Data Science and Knowledge Discovery", aliases: ["data science", "data mining", "big data", "analytics", "knowledge discovery"] },
    { name: "Intelligent Transportation Systems", aliases: ["transportation", "traffic", "vehicles", "intelligent transportation"] },
    { name: "Agriculture and Environmental Systems", aliases: ["agriculture", "farming", "environment", "environmental", "crop", "crops"] },
    { name: "Smart Cities and Sustainability", aliases: ["smart cities", "smart city", "sustainability", "urban"] },
    { name: "Construction and Infrastructure Materials", aliases: ["construction", "concrete", "civil engineering", "infrastructure"] },
    { name: "Aerospace and Fluid Dynamics", aliases: ["aerospace", "fluid dynamics", "cfd", "aerodynamics", "turbulence"] },
    { name: "Applied Mathematics and Simulation", aliases: ["applied mathematics", "simulation", "numerical methods", "optimization"] },
    { name: "Computer Systems and Algorithms", aliases: ["algorithms", "computer systems", "distributed systems", "cloud computing", "operating systems"] },
    { name: "Mechanical Systems and Control Engineering", aliases: ["control systems", "control engineering", "mechanical systems", "vibration"] },
    { name: "Physics and Theoretical Sciences", aliases: ["physics", "theoretical physics", "astrophysics", "cosmology"] },
    { name: "Social Computing and Security Analytics", aliases: ["social computing", "social media", "social network", "misinformation"] },
];

// Words that carry no topic meaning (removed when extracting the topic)
const STOPWORDS = new Set(`a an the and or of in on at for to from by with about regarding related relating into over under
between during since after before until within across among per via is are was were be been being do does did done have has had
show list find give get tell display fetch me us my our your their them they those these this that it its which what who whom whose
where when how why many much more most less least top best leading lead leads highest lowest latest recent recently new newest
all any some each every only also please can could would should will shall may might want need looking look like know any
number count total amount numbers stats statistics overview summary details detail info information year years
publication publications paper papers article articles journal journals conference conferences published cited citation citations
patent patents invention inventions inventor inventors filed grant grants funding funded project projects sanctioned
thesis theses dissertation dissertations phd doctoral researcher researchers author authors professor professors faculty prof dr
scientist scientists expert experts investigator investigators supervisor supervisors institution institutions university
universities institute institutes college colleges agency agencies funder funders sponsor sponsors knowledge trend
trends trending growing growth emerging momentum rising compare comparison versus vs difference work working works done
field fields area areas domain domains topic topics research researching supervised authored invented bengaluru bangalore india indian last past
first second third between there here than then so very just one two three four five six seven eight nine ten
records record data dataset datasets results result answer question questions most-cited highly
form`.split(/\s+/)); // "form" = common typo of "from"

// Typos of long structural words ("insitute", "reserchers") must not become a topic.
// Only words of 6+ letters, one edit (incl. a swap) away from a stopword.
const LONG_STOPWORDS = [...STOPWORDS].filter((w) => w.length >= 6);

function withinOneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) {
        if (a.slice(i + 1) === b.slice(i + 1)) return true;                                      // substitution
        return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);    // swap
    }
    const [s, l] = a.length < b.length ? [a, b] : [b, a];
    return s.slice(i) === l.slice(i + 1);                                                      // insert/delete
}

const isStopword = (lw) => STOPWORDS.has(lw) || (lw.length >= 6 && LONG_STOPWORDS.some((s) => withinOneEdit(lw, s)));

// "top 3 researchers from every institute", "each college", "institution-wise"
// — tolerating one typo in the noun ("insitute", "colege").
const INSTITUTION_NOUNS = ["institute", "institutes", "institution", "institutions", "college", "colleges", "university", "universities", "uni", "unis"];
const isInstitutionNoun = (w) => INSTITUTION_NOUNS.some((n) => n === w || (w.length >= 5 && withinOneEdit(w, n)));

function asksPerInstitution(text) {
    const lower = text.toLowerCase();
    const re = /\b(?:every|each|all|per)\s+(?:the\s+)?([a-z]+)|\b([a-z]+)[- ]?wise\b/g;
    let m;
    while ((m = re.exec(lower)) !== null) if (isInstitutionNoun(m[1] || m[2])) return true;
    return false;
}
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function findTopN(text) {
    const m = /\btop\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(text);
    if (!m) return null;
    const n = NUMBER_WORDS[m[1].toLowerCase()] || Number(m[1]);
    return n >= 1 && n <= 25 ? n : null;
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasRegex(alias) {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(alias)}(?=$|[^a-z0-9])`, "i");
}

export function findInstitutions(text) {
    const found = [];
    for (const inst of INSTITUTIONS) {
        let bestIdx = -1;
        for (const alias of inst.aliases) {
            const m = text.match(aliasRegex(alias));
            if (m && (bestIdx === -1 || m.index < bestIdx)) bestIdx = m.index;
        }
        if (bestIdx !== -1) found.push({ name: inst.name, index: bestIdx });
    }
    return found.sort((a, b) => a.index - b.index).map((f) => f.name);
}

export function canonicalInstitution(raw) {
    if (!raw) return null;
    const hits = findInstitutions(String(raw));
    return hits[0] || null;
}

function findDomain(text) {
    const lower = text.toLowerCase();
    // exact domain name first
    for (const d of DOMAINS) {
        if (lower.includes(d.name.toLowerCase())) return d.name;
    }
    // longest alias wins ("machine learning" over "ml")
    let best = null;
    for (const d of DOMAINS) {
        for (const alias of d.aliases) {
            if (aliasRegex(alias).test(lower) && (!best || alias.length > best.len)) {
                best = { name: d.name, len: alias.length };
            }
        }
    }
    return best ? best.name : null;
}

function findYears(text) {
    const years = [];
    const re = /\b(19[5-9]\d|20[0-4]\d)\b/g;
    let m;
    while ((m = re.exec(text)) !== null) years.push(Number(m[0]));
    return years;
}

function findYearRange(text, years) {
    const lower = text.toLowerCase();

    let m = lower.match(/(?:between|from)\s+(\d{4})\s+(?:and|to|-|till|until)\s+(\d{4})/);
    if (m) return { from: Math.min(+m[1], +m[2]), to: Math.max(+m[1], +m[2]) };

    m = lower.match(/\b(\d{4})\s*(?:-|–|to)\s*(\d{4})\b/);
    if (m) return { from: Math.min(+m[1], +m[2]), to: Math.max(+m[1], +m[2]) };

    m = lower.match(/(?:last|past|previous)\s+(\d{1,2}|two|three|four|five|six|seven)\s+years?/);
    if (m) {
        const words = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
        const n = words[m[1]] || Number(m[1]);
        return { from: CURRENT_YEAR - n + 1, to: CURRENT_YEAR };
    }

    m = lower.match(/(?:since|after|starting(?: from)?)\s+(\d{4})/) || lower.match(/from\s+(\d{4})\s*(?:onwards|on|and later|and after)/) || lower.match(/(\d{4})\s+onwards/);
    if (m) return { from: +m[1] + (/\bafter\b/.test(lower) ? 1 : 0), to: null };

    m = lower.match(/(?:before|until|till|up to|upto)\s+(\d{4})/);
    if (m) return { from: null, to: +m[1] - (lower.includes("before") ? 1 : 0) };

    if (/\bthis year\b/.test(lower)) return { from: CURRENT_YEAR, to: CURRENT_YEAR };
    if (/\blast year\b/.test(lower)) return { from: CURRENT_YEAR - 1, to: CURRENT_YEAR - 1 };

    if (years.length === 1) return { from: years[0], to: years[0] };
    return null;
}

function findQuoted(text) {
    const quotes = [];
    const re = /"([^"]{3,})"|“([^”]{3,})”|'([^']{3,})'/g;
    let m;
    while ((m = re.exec(text)) !== null) quotes.push(m[1] || m[2] || m[3]);
    return quotes;
}

function findFundingAgency(text) {
    const re = /\b([A-Za-z]{2,6})\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const up = m[1].toUpperCase();
        // Require uppercase in the original text for short tokens like "dst"
        // OR an explicit agency keyword nearby, to avoid false hits.
        if (AGENCY_ACRONYMS.includes(up) && (m[1] === up || /agenc|fund|grant/i.test(text))) {
            return up === "MEITY" ? "MeitY" : up;
        }
    }
    const longForm = text.match(/\b(Department of Science and Technology|Science and Engineering Research Board|Department of Biotechnology|Anusandhan National Research Foundation)\b/i);
    return longForm ? longForm[1] : null;
}

const NAME_BLOCKLIST = new Set(["Show", "List", "Find", "Give", "Tell", "Which", "What", "Who", "How", "Top", "Most", "Compare", "Papers", "Patents", "Grants", "Theses", "Publications", "Researchers", "Institute", "University", "College", "Engineering", "Technology", "Science", "Bangalore", "Bengaluru", "India", "Indian", "Knowledge", "Graph", "Dr", "Prof"]);

function findResearcher(text, institutions) {
    // Explicit cues: "Dr. Jane Doe", "Prof Rao", "by Jane Doe", "researcher Jane Doe", "about Jane Doe"
    const cue = /(?:\bdr\.?|\bprof(?:essor)?\.?|\bby|\bauthor(?:ed)? by|\bresearcher|\bsupervised by|\bpi|\binvestigator|\bwho is|\btell me about|\bprofile of|\babout)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]*){0,3})/;
    // Possessive: "Show PRASAD HONNAVALLI's publications", "Satyam Suwas’ patents"
    const possessive = /\b([A-Z][A-Za-z.-]+(?:\s+[A-Z][A-Za-z.-]*){1,4})(?:['’]s|['’])(?=\s|$)/;
    const m = text.match(cue) || text.match(possessive);
    if (m) {
        let words = m[1]
            .replace(/['’]s?$/, "")
            .replace(/^(?:dr|prof|professor)\.?\s+/i, "")
            .replace(/\s+(?:at|from|in|of)$/i, "")
            .trim()
            .split(/\s+/);
        // drop leading command words caught by the capitalised-name pattern ("Show ...")
        while (words.length > 1 && NAME_BLOCKLIST.has(words[0].replace(/\./g, ""))) words = words.slice(1);
        const candidate = words.join(" ");
        const looksLikeName = words.every((w) => !NAME_BLOCKLIST.has(w.replace(/\./g, "")));
        const isInstitution = findInstitutions(candidate).length > 0;
        const isDomain = findDomain(candidate) !== null && words.length <= 3 && !/\./.test(candidate);
        const isAcronym = /^[A-Z]{2,6}$/.test(candidate);
        if (looksLikeName && !isInstitution && !isDomain && !isAcronym) return candidate;
    }
    return null;
}

function extractTopic(text, consumed) {
    let t = ` ${text} `.replace(/knowledge graph/ig, " ");
    for (const piece of consumed.filter(Boolean)) {
        t = t.replace(new RegExp(escapeRe(piece), "ig"), " ");
    }
    // remove institution aliases, years, punctuation
    for (const inst of INSTITUTIONS) for (const a of inst.aliases) t = t.replace(new RegExp(aliasRegex(a).source, "ig"), " ");
    t = t.replace(/\b(19|20)\d{2}\b/g, " ").replace(/[?!.,;:()"“”]/g, " ").replace(/\b([a-z]+)[- ]wise\b/gi, (m, w) => (isInstitutionNoun(w.toLowerCase()) ? " " : m));

    const words = t.split(/\s+/).filter(Boolean);
    const kept = words.filter((w) => {
        const lw = w.toLowerCase();
        if (isStopword(lw)) return false;
        if (AGENCY_ACRONYMS.includes(w.toUpperCase()) && w === w.toUpperCase()) return false;
        // keep short acronyms like AI, ML, IoT, 5G; drop other 1-2 char noise
        if (lw.length <= 2 && !/^(ai|ml|iot|5g|6g|ar|vr|ev)$/i.test(lw)) return false;
        return true;
    });
    const topic = kept.join(" ").trim();
    return topic.length >= 2 ? topic : null;
}

function scoreIntents(text) {
    const lower = ` ${text.toLowerCase()} `;
    const scores = {};
    for (const intent of Object.keys(INTENT_KEYWORDS)) {
        let score = 0;
        for (const kw of INTENT_KEYWORDS[intent]) {
            const re = kw.includes(" ") ? new RegExp(escapeRe(kw), "i") : aliasRegex(kw);
            if (re.test(lower)) score += 1;
        }
        scores[intent] = score;
    }
    return scores;
}

const FOLLOW_UP_RE = /^(and|also|what about|how about|same|only|now|then|ok(ay)?|so)\b|\b(their|them|they|those|these|his|her|its|it|that one|this one|him|same)\b/i;

// ----------------------------------------------------------
// Main
// ----------------------------------------------------------

export function classify(text = "") {
    const cleaned = (text || "").toString().trim();
    if (!cleaned) return { intent: "unknown", confidence: 0, entities: {}, flags: {} };

    const lower = cleaned.toLowerCase();
    const scores = scoreIntents(cleaned);

    const years = findYears(cleaned);
    const yearRange = findYearRange(cleaned, years);
    const titles = findQuoted(cleaned);
    const institutions = findInstitutions(cleaned);
    const fundingAgency = findFundingAgency(cleaned);
    const researcher = findResearcher(cleaned, institutions);
    const domain = findDomain(cleaned);

    const flags = {
        wantsCount: /\b(how many|count|number of|total)\b/i.test(cleaned),
        wantsTop: /\b(top|most|best|leading|lead|leads|highest|largest|biggest|maximum|max)\b/i.test(cleaned),
        sortByCitations: /\b(most|highly|highest)[ -]cited\b|\bcitations?\b/i.test(cleaned),
        wantsCompare: scores.compare > 0 || institutions.length >= 2 && /\b(and|vs|versus|or)\b/i.test(cleaned) && /\bcompare|better|more|difference|vs|versus\b/i.test(cleaned),
        isFollowUp: FOLLOW_UP_RE.test(cleaned),
        isSemantic: /\b(about|on|related to|regarding|similar to|working on|work on|in the area of|in the field of|focus(?:ed|ing)? on|deal(?:s|ing)? with)\b/i.test(cleaned),
        perInstitution: institutions.length === 0 && asksPerInstitution(cleaned),
        topN: findTopN(cleaned),
    };

    // Topic = what's left after removing structural words / entities
    const topic = titles[0] || extractTopic(cleaned, [researcher, fundingAgency]);
    if (topic) flags.isSemantic = true;

    // ---- pick intent ----
    let intent = "unknown";
    let best = 0;
    const PRIORITY = ["compare", "publications", "patents", "grants", "theses", "researchers", "funding agencies", "trends", "institutions", "knowledge graph", "dashboard statistics", "help", "greeting"];
    for (const k of PRIORITY) {
        if (scores[k] > best) { best = scores[k]; intent = k; }
    }

    if (flags.wantsCompare && institutions.length >= 2) intent = "compare";
    // "how many patents" => patents (count handled by flag), not dashboard
    if (intent === "dashboard statistics") {
        const typed = ["publications", "patents", "grants", "theses", "researchers"].find((k) => scores[k] > 0);
        if (typed) intent = typed;
        else if (institutions.length) intent = "institutions";
    }
    if (intent === "greeting" && cleaned.split(/\s+/).length > 4) {
        // "hi, show me patents from PES" => not a greeting
        const other = PRIORITY.filter((k) => k !== "greeting").find((k) => scores[k] > 0);
        intent = other || (topic ? "search" : "greeting");
    }
    if (intent === "unknown") {
        if (researcher) intent = "researchers";
        else if (fundingAgency) intent = "grants";
        else if (institutions.length) intent = "institutions";
        else if (topic) intent = "search";
    }
    if (/funding agenc|funders|sponsors/i.test(cleaned) && !fundingAgency) intent = "funding agencies";
    if (intent === "funding agencies" && fundingAgency && /grant|fund|project/i.test(cleaned)) intent = "grants";

    const confidence = intent === "unknown" ? 0 : Math.min(1, 0.4 + 0.2 * Math.max(best, 1) + (topic || institutions.length ? 0.1 : 0));

    return {
        intent,
        confidence: Number(confidence.toFixed(2)),
        entities: {
            years,
            yearRange,
            titles,
            institution: institutions[0] || null,
            institutions,
            researcher,
            fundingAgency,
            domain,
            topic,
            // kept for backwards compatibility with older callers
            keywords: topic,
        },
        flags,
        scores,
    };
}

export const KNOWN_INSTITUTIONS = INSTITUTIONS.map((i) => i.name);
export const KNOWN_DOMAINS = DOMAINS.map((d) => d.name);

export default { classify, canonicalInstitution, findInstitutions, KNOWN_INSTITUTIONS, KNOWN_DOMAINS };
