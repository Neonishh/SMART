// ==========================================================
// Conversation memory — resolves follow-up questions.
//
// The frontend sends history as:
//   [{ role: "user", content }, { role: "assistant", content, context }]
// where `context` is what this backend returned for that turn:
//   { intent, entities, focus: { researcher, researcherId, institution, domain } }
//
// Example chain:
//   "Show AI researchers"   -> focus.researcher = <top AI researcher>, domain = AI
//   "Who has most patents?" -> inherits domain/topic  (patents, who)
//   "Show their publications" -> researcher = previous focus.researcher
// ==========================================================

import { classify } from "../../utils/intentClassifier.js";

const PRONOUN_RE = /\b(their|them|they|his|her|him|this person|that person|same person|that researcher|this researcher)\b/i;
const CARRY_INTENTS = new Set(["unknown", "search", "institutions", "greeting"]);
const TYPED_INTENTS = new Set(["publications", "patents", "grants", "theses", "researchers", "trends", "funding agencies", "compare"]);

function lastAssistantContext(history = []) {
    for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h?.role === "assistant" && h.context && typeof h.context === "object") return h.context;
    }
    // Older clients don't send context — rebuild it from the last user turn.
    for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h?.role === "user" && typeof h.content === "string") {
            const c = classify(h.content);
            return { intent: c.intent, entities: c.entities, focus: null };
        }
    }
    return null;
}

function hasOwnEntities(e) {
    return Boolean(e.institutions?.length || e.yearRange || e.topic || e.researcher || e.fundingAgency || e.domain);
}

/**
 * resolvePlan(classification, history, text) => plan
 * plan = { intent, entities, flags, scores, text, followUp: { used, inherited[] } }
 */
export function resolvePlan(classification, history, text) {
    const plan = {
        ...classification,
        entities: { ...classification.entities },
        text,
        followUp: { used: false, inherited: [] },
    };

    const prev = lastAssistantContext(history);
    if (!prev) return plan;

    const e = plan.entities;
    const pe = prev.entities || {};
    const wordCount = text.trim().split(/\s+/).length;
    const pronoun = PRONOUN_RE.test(text);

    const isFollowUp =
        classification.flags?.isFollowUp ||
        pronoun ||
        classification.intent === "unknown" ||
        (!hasOwnEntities(e) && wordCount <= 7);

    if (!isFollowUp) return plan;
    plan.followUp.used = true;

    // Pronoun -> the person the previous answer was about
    if (pronoun && !e.researcher && prev.focus?.researcher) {
        e.researcher = prev.focus.researcher;
        plan.followUp.inherited.push(`researcher=${e.researcher}`);
    }

    // Carry filters the user didn't restate
    const carry = (key, label = key) => {
        const empty = e[key] === null || e[key] === undefined || (Array.isArray(e[key]) && e[key].length === 0);
        const has = pe[key] !== null && pe[key] !== undefined && !(Array.isArray(pe[key]) && pe[key].length === 0);
        if (empty && has) {
            e[key] = pe[key];
            plan.followUp.inherited.push(label);
        }
    };

    // When a researcher is now the subject, the old topic/institution filters
    // usually narrow too much ("their publications" = all of them).
    if (!e.researcher) {
        carry("topic");
        carry("domain");
        // "...from every institute" deliberately has no institution — don't inherit one
        if (!e.institutions?.length && !classification.flags?.perInstitution) {
            carry("institutions");
            e.institution = e.institutions?.[0] || null;
        }
    }
    carry("yearRange", "years");
    carry("fundingAgency", "agency");
    e.keywords = e.topic;

    // "what about RVCE?" / "and in 2022?" -> keep the previous question type
    if (CARRY_INTENTS.has(plan.intent) && TYPED_INTENTS.has(prev.intent)) {
        // "compare" needs two institutions; with one, fall back to institutions
        plan.intent = prev.intent === "compare" && (e.institutions?.length || 0) < 2 ? "institutions" : prev.intent;
        plan.followUp.inherited.push(`intent=${plan.intent}`);
    }
    // "Show their publications" with a researcher -> publications by that author
    if (plan.intent === "researchers" && pronoun && /publication|paper|patent|grant|thes/i.test(text)) {
        plan.intent = /patent/i.test(text) ? "patents" : /grant/i.test(text) ? "grants" : /thes/i.test(text) ? "theses" : "publications";
    }

    return plan;
}
