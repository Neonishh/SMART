export function Card({ className = "", children }) {
  return (
    <div
      className={`bg-white border border-[var(--color-line)] rounded-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, delta }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono">
        {label}
      </p>
      <p className="font-serif text-3xl font-semibold text-[var(--color-ink)] mt-2">
        {value}
      </p>
      {delta && (
        <p className="text-xs text-[var(--color-ochre)] mt-1.5 font-medium">{delta}</p>
      )}
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-[var(--color-paper-dim)] text-[var(--color-muted)]",
    accent: "bg-[var(--color-ochre-soft)] text-[var(--color-ochre)]",
    navy: "bg-[var(--color-navy)] text-white",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }) {
  return (
    <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono mb-3">
      {children}
    </p>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="text-center py-16 border border-dashed border-[var(--color-line)] rounded-sm">
      <p className="font-serif text-lg text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-muted)] mt-1 max-w-md mx-auto">{description}</p>
      )}
    </div>
  );
}
