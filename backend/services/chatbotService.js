import * as grantService from "./grantService.js";
import * as patentService from "./patentService.js";
import * as kgService from "./knowledgeGraphService.js";
import * as thesisService from "./thesisService.js";
import * as institutionService from "./institutionService.js";
import * as dashboardService from "./dashboardService.js";
import * as publicationService from "./publicationService.js";
import intentClassifier from "../utils/intentClassifier.js";
import * as researcherService from "./researcherService/index.js";

/**
 * getChatResponse
 * Minimal phase-1 handler that uses existing backend services.
 * Returns: { reply, sources, cypher }
 */
export async function getChatResponse(message, history = []) {

    try {

        const text = (message || "").toString().trim();

        if (!text) {
            return {
                reply: "Please provide a question or message to start the chat.",
                sources: [],
                cypher: null
            };
        }

        // Classify intent and extract entities
        const { intent, confidence, entities } = intentClassifier.classify(text);

        // Debug: show classifier output (remove when debugging complete)
        console.log({ text, intent, confidence, entities });

        // Route based on intent
        switch (intent) {
            case "grants": {
                const filters = { page: 1, limit: 5 };
                if (entities.years && entities.years.length) filters.year = entities.years[0];
                if (entities.institution) filters.institution = entities.institution;
                // Prefer fundingAgency over researcher as PI — avoid using the same token for both
                if (entities.fundingAgency) {
                    filters.agency = entities.fundingAgency;
                } else if (entities.researcher) {
                    filters.pi = entities.researcher;
                }
                // Fallback: if classifier didn't extract agency, detect common acronyms in raw text
                if (!filters.agency) {
                    const agencyMatch = (text.match(/\b(DST|SERB|DBT|CSIR|ANRF|ICMR|UGC)\b/i) || [])[1];
                    if (agencyMatch) {
                        filters.agency = agencyMatch.toUpperCase();
                    } else {
                        // As a looser fallback, if any of those acronyms appear in any case, use as search
                        const loose = (text.match(/\b([A-Za-z]{2,6})\b/g) || []).find(t => ["DST","SERB","DBT","CSIR","ANRF","ICMR","UGC"].includes(t.toUpperCase()));
                        if (loose) filters.search = loose;
                    }
                }
                if (entities.titles && entities.titles.length) filters.search = entities.titles[0];
                if (entities.keywords) filters.search = filters.search || entities.keywords;

                console.log("Grant filters:", filters);

                const result = await grantService.getAllGrants(filters);

                console.log("Grant service result:", result);

                const total = result.total ?? result.count ?? result.data?.length ?? 0;
                if (total === 0) return { reply: "No grants found for that query.", sources: [], cypher: null };

                const top = result.data.slice(0, 3).map((g, i) => `${i + 1}. ${g.title} (${g.year || 'N/A'}) - ${g.institution || 'Unknown'}`);
                return { reply: `Found ${total} grants. Top results:\n${top.join("\n")}`, sources: result.data.map(g => ({ type: "grant", id: g.id, title: g.title })), cypher: null };
            }

            case "patents": {
                const filters = { page: 1, limit: 5 };
                if (entities.years && entities.years.length) filters.year = entities.years[0];
                if (entities.institution) filters.institution = entities.institution;
                if (entities.researcher) filters.applicant = entities.researcher;
                if (entities.titles && entities.titles.length) filters.search = entities.titles[0];
                if (entities.keywords) filters.search = filters.search || entities.keywords;

                const result = await patentService.getAllPatents(filters);
                const total = result.total ?? 0;
                if (total === 0) return { reply: "No patents found for that query.", sources: [], cypher: null };

                const top = result.data.slice(0, 3).map((p, i) => `${i + 1}. ${p.title} (${p.year || 'N/A'}) - ${p.institution || 'Unknown'}`);
                return { reply: `Found ${total} patents. Top results:\n${top.join("\n")}`, sources: result.data.map(p => ({ type: "patent", id: p.id, title: p.title })), cypher: null };
            }

            case "theses": {
                // thesisService provides listTheses(); we can filter basic entities in-memory
                const list = await thesisService.listTheses();
                let filtered = list;
                if (entities.years && entities.years.length) filtered = filtered.filter(t => t.year === entities.years[0]);
                if (entities.institution) filtered = filtered.filter(t => t.institution && t.institution.toLowerCase().includes(entities.institution.toLowerCase()));
                if (entities.researcher) filtered = filtered.filter(t => (t.authors || []).some(a => a.toLowerCase().includes(entities.researcher.toLowerCase())) || (t.supervisors || []).some(s => s.toLowerCase().includes(entities.researcher.toLowerCase())));

                if (filtered.length === 0) return { reply: "No theses matched your query.", sources: [], cypher: null };

                const top = filtered.slice(0, 3).map((t, i) => `${i + 1}. ${t.title} (${t.year || 'N/A'}) - ${t.institution || 'Unknown'}`);
                return { reply: `Found ${filtered.length} theses. Top results:\n${top.join("\n")}`, sources: filtered.slice(0,5).map(t => ({ type: "thesis", id: t.id, title: t.title })), cypher: null };
            }

            case "institutions": {
                const list = await institutionService.getInstitutions();
                if (entities.institution) {
                    const matched = list.filter(i => i.name && i.name.toLowerCase().includes(entities.institution.toLowerCase()));
                    if (matched.length === 0) return { reply: `No institutions matched "${entities.institution}".`, sources: [], cypher: null };
                    return { reply: `Found ${matched.length} institutions. Top match: ${matched[0].name}.`, sources: matched.slice(0,5).map(i=>({ type:"institution", id: i.id, title: i.name })), cypher: null };
                }
                return { reply: `I can provide institutions and their counts. Total institutions: ${list.length}.`, sources: list.slice(0,5).map(i=>({ type:"institution", id:i.id, title:i.name })), cypher: null };
            }

            case "dashboard statistics": {
                const overview = await dashboardService.getDashboardOverview();
                return { reply: `Dashboard overview: Publications ${overview.stats[0].value}, Patents ${overview.stats[1].value}, Grants ${overview.stats[2].value}, Theses ${overview.stats[3].value}.`, sources: [], cypher: null };
            }

            case "knowledge graph": {
                try {
                    const graph = await kgService.getKnowledgeGraph();
                    const nodes = (graph.nodes || []).length;
                    const links = (graph.links || []).length;
                    return { reply: `Knowledge graph sample: ${nodes} nodes and ${links} links. Use the /knowledge-graph endpoint for more details.`, sources: [], cypher: null };
                } catch (err) {
                    console.error("Error loading KG:", err);
                    return { reply: "I couldn't load the knowledge graph right now.", sources: [], cypher: null };
                }
            }

            case "trends": {
                const overview = await dashboardService.getDashboardOverview();
                const trendSample = overview.publicationTrend?.slice?.(0,5) ?? overview.publicationTrend ?? [];
                if (!trendSample.length) return { reply: "No trend data available right now.", sources: [], cypher: null };
                const summary = trendSample.map(t => `${t.year}: ${t.publications} pubs`).join("; ");
                return { reply: `Publication trends: ${summary}`, sources: [], cypher: null };
            }

            case "publications": {
                const filters = { page: 1, limit: 5 };
                if (entities.years && entities.years.length) filters.year = entities.years[0];
                if (entities.institution) filters.institution = entities.institution;
                if (entities.researcher) filters.author = entities.researcher;
                if (entities.titles && entities.titles.length) filters.title = entities.titles[0];
                if (entities.keywords) filters.keyword = entities.keywords;

                const result = await publicationService.getAllPublications(filters);
                const total = result.total ?? 0;
                if (total === 0) return { reply: "No publications found for that query.", sources: [], cypher: null };

                const top = result.data.slice(0, 3).map((p, i) => `${i + 1}. ${p.title} (${p.year || 'N/A'}) - ${p.institution || 'Unknown'}`);
                return { reply: `Found ${total} publications. Top results:\n${top.join("\n")}`, sources: result.data.map(p => ({ type: "publication", id: p.id, title: p.title })), cypher: null };
            }

            case "researchers": {
                // Use existing researcherService to search or build a profile
                try {
                    const q = entities.researcher || entities.keywords || null;
                    const institution = entities.institution || null;

                    // If the user provided a numeric id, fetch profile by id
                    const numericId = q && /^\d+$/.test(q) ? Number(q) : null;

                    if (numericId) {
                        const profile = await researcherService.getResearcherProfile(numericId);
                        if (!profile) return { reply: `No researcher found with id ${numericId}.`, sources: [], cypher: null };

                        // also fetch a few related publications and patents from the graph services
                        const pubs = await publicationService.getAllPublications({ author: profile.name, page: 1, limit: 3 });
                        const pats = await patentService.getAllPatents({ applicant: profile.name, page: 1, limit: 3 });

                        const topPubs = (pubs.data || []).slice(0,3).map((p,i)=>`${i+1}. ${p.title} (${p.year||'N/A'})`);
                        const topPats = (pats.data || []).slice(0,3).map((p,i)=>`${i+1}. ${p.title} (${p.year||'N/A'})`);

                        const replyParts = [];
                        replyParts.push(`${profile.name} — ${profile.institution || 'Unknown institution'}.`);
                        replyParts.push(`Publications: ${profile.publications} — Top:\n${topPubs.join("\n") || 'None'}`);
                        replyParts.push(`Patents: ${profile.patents} — Top:\n${topPats.join("\n") || 'None'}`);

                        const sources = [];
                        if (pubs.data) sources.push(...(pubs.data.map(p=>({ type: 'publication', id: p.id, title: p.title }))));
                        if (pats.data) sources.push(...(pats.data.map(p=>({ type: 'patent', id: p.id, title: p.title }))));

                        return { reply: replyParts.join('\n\n'), sources, cypher: null };
                    }

                    // Search by name/term
                    const res = await researcherService.getResearchers(1, 10, q || "", institution || "", "", "rank");
                    const total = res.total ?? 0;
                    if (total === 0) return { reply: `No researchers matched your query.`, sources: [], cypher: null };

                    const top = res.researchers.slice(0,5).map((r,i)=>`${i+1}. ${r.name} — ${r.institution} (score: ${r.researchScore || 'N/A'})`);
                    return { reply: `Found ${total} researchers. Top matches:\n${top.join('\n')}`, sources: res.researchers.slice(0,5).map(r=>({ type: 'researcher', id: r.id, title: r.name })), cypher: null };

                } catch (err) {
                    console.error('researcher intent error', err);
                    return { reply: "I couldn't search researchers right now.", sources: [], cypher: null };
                }
            }

            case "funding agencies": {
                // use grantService facets to obtain known agencies
                const res = await grantService.getAllGrants({ page: 1, limit: 1 });
                const agencies = res.facets?.agencies ?? [];
                if (agencies.length === 0) return { reply: "No funding agency information available right now.", sources: [], cypher: null };
                return { reply: `Known funding agencies: ${agencies.slice(0,10).join(", ")}`, sources: agencies.slice(0,5).map(a=>({ type: "agency", id: a, title: a })), cypher: null };
            }

            case "unknown":
            default:
                return { reply: "I didn't understand your question. I can answer about grants, patents, theses, institutions, the knowledge graph, dashboard stats, and trends. Try asking about one of those topics.", sources: [], cypher: null };

        }

    }

    catch (error) {

        console.error("Chatbot Service Error:", error);

        return {
            reply: "Sorry, an error occurred while processing the message.",
            sources: [],
            cypher: null
        };

    }

}
