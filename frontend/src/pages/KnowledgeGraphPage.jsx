// ==========================================================
// SMART Public Knowledge Graph Page
// ==========================================================

import { Link } from "react-router-dom";

import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";

import KnowledgeGraph from "./KnowledgeGraph";

const BENEFITS = [

    {

        title: "Connected Intelligence",

        body: "Trace research impact through a web of citations, funding and mentorship that a flat table can't capture."

    },

    {

        title: "Discover Collaborators",

        body: "Identify domain experts and surface the hidden bridges between institutions across Bangalore's research ecosystem."

    },

    {

        title: "Research Impact",

        body: "Visualise how a single publication, patent or thesis ripples outward through the wider academic network."

    },

    {

        title: "Semantic Navigation",

        body: "Move through India's academic landscape by relationship and relevance, not just keyword search."

    }

];

const ICONS = {

    "Connected Intelligence": (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="5" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="19" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7.2V13M12 13L6 16.2M12 13L18 16.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>

    ),

    "Discover Collaborators": (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="17" cy="15" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11.2 10.8L14.8 13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>

    ),

    "Research Impact": (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 18L9 11L13 14L20 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 6H20V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

    ),

    "Semantic Navigation": (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
            <path d="M15.5 8.5L13 13L8.5 15.5L11 11L15.5 8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>

    )

};

export default function KnowledgeGraphPage() {

    return (

        <PublicLayout>

            {/* ====================================================== */}
            {/* Hero */}
            {/* ====================================================== */}

            <section className="relative overflow-hidden">

                <Watermark
                    className="-right-24 -top-10 hidden lg:block"
                />

                <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    <div className="lg:col-span-7">

                        <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-4">

                            SMART

                        </p>

                        <h1 className="font-serif text-4xl font-semibold text-[var(--color-ink)] mb-6">

                            The Knowledge Graph

                        </h1>

                        <p className="text-[var(--color-muted)] leading-relaxed max-w-xl">

                            The SMART Knowledge Graph connects institutions,
                            researchers, departments, publications,
                            patents, grants and theses into one unified
                            research network. Every research output becomes
                            part of an interconnected ecosystem that can be
                            explored visually.

                        </p>

                    </div>

                    {/* Decorative node cluster — echoes the graph without adding any new colors */}
                    <div className="lg:col-span-5 relative hidden lg:flex items-center justify-center">

                        <div

                            className="relative w-72 h-72 rounded-full border"

                            style={{

                                borderColor: "rgba(0,0,0,0.08)",

                                background: "radial-gradient(circle at center, var(--color-surface) 0%, transparent 70%)"

                            }}

                        >

                            <span

                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"

                                style={{ width: 22, height: 22, background: "var(--color-ink)" }}

                            />

                            <span

                                className="absolute rounded-full"

                                style={{ width: 12, height: 12, top: "22%", left: "68%", background: "var(--color-ochre)" }}

                            />

                            <span

                                className="absolute rounded-full"

                                style={{ width: 10, height: 10, top: "70%", left: "28%", background: "var(--color-ochre)" }}

                            />

                            <span

                                className="absolute rounded-full"

                                style={{ width: 9, height: 9, top: "30%", left: "20%", background: "var(--color-muted)" }}

                            />

                            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }}>

                                <line x1="50%" y1="50%" x2="68%" y2="22%" stroke="var(--color-muted)" strokeWidth="1" />
                                <line x1="50%" y1="50%" x2="28%" y2="70%" stroke="var(--color-muted)" strokeWidth="1" />
                                <line x1="50%" y1="50%" x2="20%" y2="30%" stroke="var(--color-muted)" strokeWidth="1" />

                            </svg>

                        </div>

                    </div>

                </div>

                {/* Context strip */}
                <div className="relative z-10 border-t border-gray-200">

                    <div className="mx-auto max-w-7xl px-6 py-5 flex flex-wrap gap-x-10 gap-y-2 font-mono text-xs font-medium uppercase tracking-widest text-[var(--color-ink)]">

                        <span>Institutions</span>
                        <span>Researchers</span>
                        <span>Publications</span>
                        <span>Patents</span>
                        <span>Grants</span>
                        <span>Theses</span>

                    </div>

                </div>

            </section>

            {/* ====================================================== */}
            {/* Interactive Graph */}
            {/* ====================================================== */}

            <section className="bg-white border-t border-gray-200">

                <div className="mx-auto max-w-7xl px-6 py-16">

                    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">

                        <div>

                            <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-3">

                                Explore

                            </p>

                            <h2 className="font-serif text-2xl text-[var(--color-ink)]">

                                Live network view

                            </h2>

                        </div>

                        {/* Legend — matches the node colors defined in GraphCanvas.jsx's nodeColors map */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-[var(--color-muted)]">

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#1F3B73" }} />
                                Institutions
                            </span>

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D4A017" }} />
                                Publications
                            </span>

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#8A4FFF" }} />
                                Patents
                            </span>

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D96C06" }} />
                                Grants
                            </span>

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#5B8FB9" }} />
                                Theses
                            </span>

                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#6C757D" }} />
                                Departments
                            </span>

                        </div>

                    </div>

                    <KnowledgeGraph />

                </div>

            </section>

            {/* ====================================================== */}
            {/* About */}
            {/* ====================================================== */}

            <section className="bg-[var(--color-surface)]">

                <div className="mx-auto max-w-7xl px-6 py-20">

                    <div className="max-w-2xl mb-16">

                        <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-3">

                            Value proposition

                        </p>

                        <h2 className="font-serif text-3xl text-[var(--color-ink)] mb-6">

                            Why a Knowledge Graph?

                        </h2>

                        <p className="text-[var(--color-muted)] leading-8 text-lg">

                            Traditional databases store research as isolated
                            rows. SMART transforms that information into a
                            connected graph where institutions,
                            researchers, grants, publications, patents,
                            departments and theses are linked through
                            meaningful relationships.

                        </p>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                        {BENEFITS.map((item) => (

                            <div

                                key={item.title}

                                className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col gap-5 transition-colors hover:border-[var(--color-ink)]"

                            >

                                <div

                                    className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--color-ink)]"

                                    style={{ background: "var(--color-surface)" }}

                                >

                                    {ICONS[item.title]}

                                </div>

                                <div>

                                    <h4 className="font-serif text-lg text-[var(--color-ink)] mb-2">

                                        {item.title}

                                    </h4>

                                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">

                                        {item.body}

                                    </p>

                                </div>

                            </div>

                        ))}

                    </div>

                </div>

            </section>

            {/* ====================================================== */}
            {/* CTA */}
            {/* ====================================================== */}

            <section className="py-24" style={{ background: "var(--color-ink)" }}>

                <div className="mx-auto max-w-3xl px-6 text-center">

                    <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">

                        Ready to explore the network?

                    </h2>

                    <p className="text-white/70 leading-relaxed mb-10">

                        Join institutional leaders and researchers using
                        SMART to map the future of India's academic
                        ecosystem.

                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">

                        <Link

                            to="/dashboard"

                            className="bg-white text-[var(--color-ink)] px-8 py-3 font-mono text-xs uppercase tracking-widest rounded-md hover:opacity-90 transition-opacity"

                        >

                            Enter Platform

                        </Link>

                        <Link

                            to="/login"

                            className="border border-white/30 text-white px-8 py-3 font-mono text-xs uppercase tracking-widest rounded-md hover:bg-white/10 transition-colors"

                        >

                            Login

                        </Link>

                    </div>

                </div>

            </section>

        </PublicLayout>

    );

}