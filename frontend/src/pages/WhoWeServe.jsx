import { Microscope, Building2, Landmark, Factory, HandCoins } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";

const AUDIENCES = [
  {
    icon: Microscope,
    title: "Researchers",
    body: "Discover relevant research, uncover collaborations, and explore emerging trends with AI-powered intelligence.",
  },
  {
    icon: Building2,
    title: "Universities & Institutions",
    body: "Track research performance, benchmark achievements, identify strengths, and support strategic planning.",
  },
  {
    icon: Landmark,
    title: "Government & Policymakers",
    body: "Leverage data-driven insights to shape research policies, evaluate funding impact, and drive informed decisions.",
  },
  {
    icon: Factory,
    title: "Industry & Innovators",
    body: "Identify academic expertise, discover emerging technologies, and build meaningful research partnerships.",
  },
  {
    icon: HandCoins,
    title: "Funding Organizations",
    body: "Monitor research outcomes, evaluate investments, and identify high-impact opportunities across the research ecosystem.",
  },
];

export default function WhoWeServe() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <Watermark className="-right-24 -top-10 hidden lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-16">
          <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-4">
            SMART
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[var(--color-ink)] mb-6">
            Who we serve
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed max-w-xl">
            Researchers, universities, funding agencies, government
            policymakers, and industry innovators all use SMART to explore
            trends, benchmark performance, map expertise, and make
            evidence-based decisions from the same connected dataset.
          </p>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            const reversed = i % 2 === 1;
            const gridColsClass = reversed
              ? "md:grid-cols-[1fr_80px]"
              : "md:grid-cols-[80px_1fr]";

            return (
              <div
                key={a.title}
<<<<<<< HEAD
                className={`grid ${gridColsClass} gap-6 items-center py-8 border-b last:border-0 border-[var(--color-line)]`}
=======
                className={`grid ${gridColsClass} gap-6 items-center py-8 border-b last:border-0 border-[var(--color-ochre)]/25`}
>>>>>>> 09f87c862035299d92aa1f154176bb2323192fc9
              >
                <div className={reversed ? "md:order-2 md:justify-self-end" : ""}>
                  <div className="w-14 h-14 rounded-full border border-[var(--color-ochre)] flex items-center justify-center">
                    <Icon size={22} className="text-[var(--color-ochre)]" />
                  </div>
                </div>
                <div className={reversed ? "md:order-1 md:text-right" : ""}>
                  <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-2">
                    {a.title}
                  </h2>
                  <p
                    className={`text-[var(--color-muted)] leading-relaxed max-w-lg ${
                      reversed ? "md:ml-auto" : ""
                    }`}
                  >
                    {a.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}