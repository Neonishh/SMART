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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Public nav pages */}
      <Route
        path="/about"
        element={
          <InfoPage
            title="About SMART"
            body="SMART (Systematic Monitoring & Analysis for Research and Technology) is an AI-powered platform that connects publications, patents, grants, and theses into a single knowledge graph — helping researchers, institutions, and policymakers see the full picture of India's research output in real time."
          />
        }
      />
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
        element={
          <InfoPage
            title="The Knowledge Graph"
            body="A continuously updated, machine-readable graph connecting institutions, researchers, publications, patents, and grants — the foundation every SMART dashboard and search result is built on."
          />
        }
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

      {/* Dashboard pages */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/analytics" element={<Analytics />} />
      <Route path="/dashboard/search" element={<Search />} />
      <Route path="/dashboard/institutions" element={<Institutions />} />
      <Route path="/dashboard/researchers" element={<Researchers />} />
      <Route path="/dashboard/patents" element={<Patents />} />
      <Route path="/dashboard/grants" element={<Grants />} />
      <Route path="/dashboard/chatbot" element={<Chatbot />} />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
