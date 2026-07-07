const COLUMNS = [
  {
    title: "Discover",
    links: ["Semantic Search", "Knowledge Graph", "Research Explorer", "Trends"],
  },
  {
    title: "Explore",
    links: ["Publications", "Patents", "Grants", "Theses", "Institutions"],
  },
  {
    title: "Solutions",
    links: ["Researchers", "Universities", "Government", "Industry"],
  },
  {
    title: "Company",
    links: ["About", "Contact"],
  },
  {
    title: "Support",
    links: ["FAQs", "Privacy", "Terms", "Help Center"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-serif text-sm font-semibold text-[var(--color-ink)] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-[var(--color-line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted)]">
            © 2026 SMART Research Platform. Developed as an Academic Research Project.
          </p>
          <p className="text-xs text-[var(--color-muted)] font-mono">
            An AI-Powered Research Intelligence Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
