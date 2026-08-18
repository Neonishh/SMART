import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Search from "./pages/Search";
import Institutions from "./pages/Institutions";
import Researchers from "./pages/Researchers";
import ResearcherProfile from "./pages/ResearcherProfile";
import Patents from "./pages/Patents";
import Grants from "./pages/Grants";
import Chatbot from "./pages/Chatbot";
import Login from "./pages/Login";
import InfoPage from "./pages/InfoPage";
import About from "./pages/About";
import WhoWeServe from "./pages/WhoWeServe";
import Theses from "./pages/Theses";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";
import Publications from "./pages/Publications";
import PublicationProfile from "./pages/PublicationProfile";
import Reports from "./pages/Reports";


export default function App() {

    return (

        <Routes>

            {/* ====================================================== */}
            {/* Public Pages */}
            {/* ====================================================== */}

            <Route path="/" element={<Landing />} />

            <Route path="/about" element={<About />} />

           <Route path="/who-we-serve" element={<WhoWeServe />} />

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
                path="/dashboard/researchers/:id"
                element={<ResearcherProfile />}
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
            <Route
                path="/dashboard/reports"
                element={<Reports />}
            />
      <Route path="/dashboard/publications" element={<Publications />} />
<Route path="/dashboard/publications/:id" element={<PublicationProfile />} />
      <Route path="/dashboard/theses" element={<Theses />} />

            {/* ====================================================== */}
            {/* Fallback */}
            {/* ====================================================== */}

            <Route path="*" element={<Landing />} />

        </Routes>

    );

}
