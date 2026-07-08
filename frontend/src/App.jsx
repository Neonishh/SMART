import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Search from "./pages/Search";
import Institutions from "./pages/Institutions";
import Researchers from "./pages/Researchers";
import Patents from "./pages/Patents";
import Grants from "./pages/Grants";
import Chatbot from "./pages/Chatbot";
import Login from "./pages/Login";
import InfoPage from "./pages/InfoPage";
import About from "./pages/About";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";

export default function App() {

    return (

        <Routes>

            {/* ====================================================== */}
            {/* Public Pages */}
            {/* ====================================================== */}

            <Route path="/" element={<Landing />} />

            <Route path="/about" element={<About />} />

            <Route
                path="/who-we-serve"
                element={
                    <InfoPage
                        title="Who we serve"
                        body="Researchers, universities, funding agencies, government policymakers, and industry innovators all use SMART to explore trends, benchmark performance, map expertise, and make evidence-based decisions from the same connected dataset."
                    />
                }
            />

            <Route
                path="/resources"
                element={
                    <InfoPage
                        title="Resources"
                        body="Documentation, API references, and guides for working with the SMART knowledge graph and dashboard will live here."
                    />
                }
            />

            <Route
    path="/knowledge-graph"
    element={<KnowledgeGraphPage />}
/>

            <Route
                path="/help"
                element={
                    <InfoPage
                        title="Help Center"
                        body="Need a hand using SMART? Reach out to the team or browse FAQs — this section will be filled in as the platform grows."
                    />
                }
            />

            <Route path="/login" element={<Login />} />

            {/* ====================================================== */}
            {/* Dashboard */}
            {/* ====================================================== */}

            <Route path="/dashboard" element={<Dashboard />} />

            <Route
                path="/dashboard/knowledge-graph"
                element={<KnowledgeGraph />}
            />

            <Route
                path="/dashboard/analytics"
                element={<Analytics />}
            />

            <Route
                path="/dashboard/search"
                element={<Search />}
            />

            <Route
                path="/dashboard/institutions"
                element={<Institutions />}
            />

            <Route
                path="/dashboard/researchers"
                element={<Researchers />}
            />

            <Route
                path="/dashboard/patents"
                element={<Patents />}
            />

            <Route
                path="/dashboard/grants"
                element={<Grants />}
            />

            <Route
                path="/dashboard/chatbot"
                element={<Chatbot />}
            />

            {/* ====================================================== */}
            {/* Fallback */}
            {/* ====================================================== */}

            <Route path="*" element={<Landing />} />

        </Routes>

    );

}