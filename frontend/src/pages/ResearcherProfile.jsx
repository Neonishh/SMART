import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { Card } from "../components/ui";
import { getResearcher } from "../services/api";

const PREVIEW_COUNT = 5;

// ==========================================================
// Sorts most-recent-first (missing/unknown years sink to the
// bottom instead of crashing the sort).
// ==========================================================

function sortByYearDesc(list) {

    return [...list].sort((a, b) => (b.year || 0) - (a.year || 0));

}

// ==========================================================
// Shared "capped list with View all" section
// ==========================================================

function ListSection({ title, items, renderItem, emptyLabel }) {

    const [expanded, setExpanded] = useState(false);

    const sorted = useMemo(() => sortByYearDesc(items), [items]);

    const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

    if (sorted.length === 0) {

        return (

            <Card>

                <h2 className="font-serif text-2xl mb-3">

                    {title}

                </h2>

                <p className="text-sm text-[var(--color-muted)]">

                    {emptyLabel}

                </p>

            </Card>

        );

    }

    return (

        <Card>

            <div className="flex items-center justify-between mb-5">

                <h2 className="font-serif text-2xl">

                    {title}

                </h2>

                <span className="text-sm text-[var(--color-muted)]">

                    {sorted.length} total

                </span>

            </div>

            <div className="flex flex-col gap-4">

                {visible.map((item, i) => renderItem(item, i))}

            </div>

            {

                sorted.length > PREVIEW_COUNT && (

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-6 w-full border border-[var(--color-line)] rounded-sm py-2 text-sm hover:bg-[var(--color-paper-dim)] transition"
                    >

                        {expanded
                            ? "Show less"
                            : `View all ${sorted.length}`}

                    </button>

                )

            }

        </Card>

    );

}

function ListRow({ title, meta, url }) {

    return (

        <div className="border-b border-[var(--color-line)] pb-4 last:border-0 last:pb-0">

            {

                url ? (

                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline decoration-[var(--color-ochre)]"
                    >

                        {title}

                    </a>

                ) : (

                    <p className="font-medium">

                        {title}

                    </p>

                )

            }

            <p className="text-sm text-[var(--color-muted)] mt-1">

                {meta}

            </p>

        </div>

    );

}

export default function ResearcherProfile() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [researcher, setResearcher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {

        async function loadResearcher() {

            setLoading(true);
            setError(false);

            try {

                const res = await getResearcher(id);

                setResearcher(res.data);

            }

            catch (err) {

                console.error(err);
                setError(true);

            }

            setLoading(false);

        }

        loadResearcher();

    }, [id]);

    if (loading) {

        return (

            <DashboardLayout
                title="Researcher Profile"
                description="Loading researcher details..."
            >

                <p className="text-[var(--color-muted)]">Loading...</p>

            </DashboardLayout>

        );

    }

    if (error || !researcher) {

        return (

            <DashboardLayout
                title="Researcher Profile"
                description="We couldn't find this researcher."
            >

                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
                >

                    <ArrowLeft size={16} />

                    Back to Researchers

                </button>

                <p className="text-[var(--color-muted)]">
                    Something went wrong loading this profile. Please try again.
                </p>

            </DashboardLayout>

        );

    }

    const domains = researcher.domains || [];

    return (

        <DashboardLayout
            title="Researcher Profile"
            description="Full research record for this researcher."
        >

            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
            >

                <ArrowLeft size={16} />

                Back to Researchers

            </button>

            <div className="mb-8">

                <h1 className="font-serif text-3xl font-semibold">

                    {researcher.name}

                </h1>

                <p className="text-[var(--color-muted)] mt-1">

                    {researcher.institution}

                </p>

            </div>

            {/* =======================
                Compact stat strip — name/institution already
                shown in the page header above, so this only
                carries the numbers plus domain tags.
            ======================= */}

            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 py-5 border-y border-[var(--color-line)] mb-8">

                <div>

                    <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)]">
                        Papers
                    </span>

                    <p className="font-serif text-2xl">

                        {researcher.publications}

                    </p>

                </div>

                <div>

                    <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)]">
                        Citations
                    </span>

                    <p className="font-serif text-2xl">

                        {researcher.citations}

                    </p>

                </div>

                <div>

                    <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)]">
                        Theses
                    </span>

                    <p className="font-serif text-2xl">

                        {researcher.theses}

                    </p>

                </div>

                {

                    domains.length > 0 && (

                        <div className="flex-1 min-w-[240px]">

                            <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)]">
                                Research Domains
                            </span>

                            <div className="flex flex-wrap gap-2 mt-2">

                                {

                                    domains.map((domain, i) => (

                                        <span
                                            key={i}
                                            className="px-3 py-1 text-sm rounded-full border border-[var(--color-line)]"
                                        >

                                            {domain}

                                        </span>

                                    ))

                                }

                            </div>

                        </div>

                    )

                }

            </div>

            <div className="flex flex-col gap-8">

                <ListSection
                    title="Publications"
                    items={researcher.publicationsList || []}
                    emptyLabel="No publications on record."
                    renderItem={(pub, i) => (
                        <ListRow
                            key={pub.id || i}
                            title={pub.title}
                            url={pub.url}
                            meta={`${pub.year || "—"} · ${pub.citations ?? 0} citations${pub.venue ? ` · ${pub.venue}` : ""}`}
                        />
                    )}
                />

                <ListSection
                    title="Patents"
                    items={researcher.patentsList || []}
                    emptyLabel="No patents on record."
                    renderItem={(pat, i) => (
                        <ListRow
                            key={pat.id || i}
                            title={pat.title}
                            meta={`${pat.year || "—"}${pat.status ? ` · ${pat.status}` : ""}`}
                        />
                    )}
                />

                <ListSection
                    title="Theses"
                    items={researcher.thesesList || []}
                    emptyLabel="No theses on record."
                    renderItem={(t, i) => (
                        <ListRow
                            key={t.id || i}
                            title={t.title}
                            url={t.url}
                            meta={`${t.year || "—"}${t.role ? ` · ${t.role}` : ""}`}
                        />
                    )}
                />

                <ListSection
                    title="Grants"
                    items={researcher.grantsList || []}
                    emptyLabel="No grants on record."
                    renderItem={(g, i) => (
                        <ListRow
                            key={g.id || i}
                            title={g.title}
                            meta={`${g.year || "—"}${g.amount ? ` · ₹${Number(g.amount).toLocaleString("en-IN")}` : ""}`}
                        />
                    )}
                />

            </div>

        </DashboardLayout>

    );

}
