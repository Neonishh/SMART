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
import WhoWeServe from "./pages/WhoWeServe";
<<<<<<< HEAD
import Publications from "./pages/Publications";
import Theses from "./pages/Theses";
=======
>>>>>>> 09f87c862035299d92aa1f154176bb2323192fc9

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Public nav pages */}
      {/* Public nav pages */}
<Route path="/about" element={<About />} />
<<<<<<< HEAD
        
      
      <Route path="/who-we-serve" element={<WhoWeServe />} />
=======
        <Route path="/who-we-serve" element={<WhoWeServe />} />
>>>>>>> 09f87c862035299d92aa1f154176bb2323192fc9
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
      <Route path="/dashboard/publications" element={<Publications />} />
      <Route path="/dashboard/theses" element={<Theses />} />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
