import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Trophy,
  Eye,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel } from "../components/ui";
import { listResearchers } from "../services/api";


export default function Researchers() {

  const navigate = useNavigate();

  const [researchers, setResearchers] = useState([]);
  const [filteredResearchers, setFilteredResearchers] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchText, setSearchText] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");

  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {

  async function loadResearchers() {

    try {

      const res = await listResearchers(
        page,
        20,
        searchText,
        institutionFilter
      );

      setResearchers(res.data.researchers);
      setFilteredResearchers(res.data.researchers);
      setTotalPages(res.data.totalPages);

    }

    catch (err) {

      console.error(err);

    }

  }

  loadResearchers();

}, [page, searchText, institutionFilter]);

  // ============================================
  // Institution List
  // ============================================
  // Fetched once, unfiltered and unpaginated, so the dropdown
  // always lists every institution — not just the ones on the
  // current page/search results.

  useEffect(() => {

    async function loadInstitutions() {

      try {

        const res = await listResearchers(1, 1000, "", "");

        const unique = [...new Set(
          res.data.researchers
            .map(r => r.institution)
            .filter(Boolean)
        )].sort();

        setInstitutions(unique);

      }

      catch (err) {

        console.error(err);

      }

    }

    loadInstitutions();

  }, []);

  const topThree = filteredResearchers.slice(0, 3);

  // Everything else — on page 1 this excludes the top 3 already
  // shown above so researchers don't get rendered twice.
  const restOfResearchers = page === 1
    ? filteredResearchers.slice(3)
    : filteredResearchers;

  return (

    <DashboardLayout
      title="Researchers"
      description="Explore the leading researchers across Karnataka's research ecosystem."
    >

      {/* =======================
          Search + Filter
      ======================= */}

      <div className="flex flex-col lg:flex-row gap-4 mb-8">

        <div className="relative flex-1">

          <Search
            size={18}
            className="absolute left-4 top-3.5 text-[var(--color-muted)]"
          />

          <input
            type="text"
            placeholder="Search researchers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-sm border border-[var(--color-line)] outline-none"
          />

        </div>

        <select
          value={institutionFilter}
          onChange={(e) => setInstitutionFilter(e.target.value)}
          className="px-4 py-3 rounded-sm border border-[var(--color-line)] min-w-[260px]"
        >

          <option value="">

            All Institutions

          </option>

          {

            institutions.map(inst => (

              <option
                key={inst}
                value={inst}
              >

                {inst}

              </option>

            ))

          }

        </select>

      </div>

      {/* =======================
          Top Researchers
      ======================= */}

      {

        page === 1 && (

          <>

            <div className="flex items-center gap-3 mb-5">

              <Trophy
                className="text-[var(--color-ochre)]"
                size={24}
              />

              <h2 className="font-serif text-2xl">

                Top Researchers

              </h2>

            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-10">

              {

                topThree.map((r) => (

                  <Card
                    key={r.id}
                    className="border-2 hover:shadow-lg transition-all duration-300"
                  >

                    <h2 className="mt-5 font-serif text-2xl font-semibold">

                      {r.name}

                    </h2>

                    <p className="text-sm text-[var(--color-muted)] mt-1">

                      {r.institution}

                    </p>

                    <div className="grid grid-cols-3 gap-5 mt-7">

                      <div>

                        <SectionLabel>

                          Papers

                        </SectionLabel>

                        <p className="font-serif text-2xl">

                          {r.publications}

                        </p>

                      </div>

                      <div>

                        <SectionLabel>

                          Citations

                        </SectionLabel>

                        <p className="font-serif text-2xl">

                          {r.citations}

                        </p>

                      </div>

                      <div>

                        <SectionLabel>

                          Theses

                        </SectionLabel>

                        <p className="font-serif text-2xl">

                          {r.theses}

                        </p>

                      </div>

                    </div>

                    <button
                      onClick={() => navigate(`/dashboard/researchers/${r.id}`)}
                      className="mt-8 w-full border border-[var(--color-line)] rounded-sm py-2 flex justify-center items-center gap-2 hover:bg-[var(--color-paper-dim)] transition"
                    >

                      <Eye size={17} />

                      View Profile

                    </button>

                  </Card>

                ))

              }

            </div>

            <h2 className="font-serif text-2xl mb-5">

              All Researchers

            </h2>

          </>

        )

      }

      {/* =======================
          All Researchers
      ======================= */}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

        {restOfResearchers.map((r) => (

          <Card
            key={r.id}
            className="hover:shadow-lg transition-all duration-300"
          >

            <h3 className="font-serif text-xl font-semibold text-[var(--color-ink)]">

              {r.name}

            </h3>

            <p className="text-sm text-[var(--color-muted)] mt-1">

              {r.institution}

            </p>

            <div className="grid grid-cols-3 gap-4 mt-6">

              <div>

                <SectionLabel>

                  Papers

                </SectionLabel>

                <p className="font-serif text-xl">

                  {r.publications}

                </p>

              </div>

              <div>

                <SectionLabel>

                  Citations

                </SectionLabel>

                <p className="font-serif text-xl">

                  {r.citations}

                </p>

              </div>

              <div>

                <SectionLabel>

                  Theses

                </SectionLabel>

                <p className="font-serif text-xl">

                  {r.theses}

                </p>

              </div>

            </div>

            <button
              onClick={() => navigate(`/dashboard/researchers/${r.id}`)}
              className="mt-6 w-full border border-[var(--color-line)] rounded-sm py-2 flex items-center justify-center gap-2 hover:bg-[var(--color-paper-dim)] transition"
            >

              <Eye size={17} />

              View Profile

            </button>

          </Card>

        ))}

      </div>

      {/* =======================
          Pagination
      ======================= */}

      <div className="flex justify-center items-center gap-4 mt-10">

        <button

          disabled={page === 1}

          onClick={() => setPage(page - 1)}

          className="px-4 py-2 rounded-sm border border-[var(--color-line)] disabled:opacity-40 hover:bg-[var(--color-paper-dim)]"

        >

          Previous

        </button>

        <span className="font-medium">

          Page {page} of {totalPages}

        </span>

        <button

          disabled={page === totalPages}

          onClick={() => setPage(page + 1)}

          className="px-4 py-2 rounded-sm border border-[var(--color-line)] disabled:opacity-40 hover:bg-[var(--color-paper-dim)]"

        >

          Next

        </button>

      </div>

    </DashboardLayout>

  );

}
