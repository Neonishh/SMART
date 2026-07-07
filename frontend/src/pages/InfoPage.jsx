import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";

export default function InfoPage({ title, body }) {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <Watermark className="-right-24 -top-10 hidden lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-24">
          <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-4">
            SMART
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[var(--color-ink)] mb-6">
            {title}
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed max-w-xl">{body}</p>
        </div>
      </section>
    </PublicLayout>
  );
}
