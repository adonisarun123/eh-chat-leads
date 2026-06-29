"use client";

export default function CategoryBars({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <div className="ph">
        <h2>{title}</h2>
        <span className="note">14 days</span>
      </div>
      <div className="pad" style={{ display: "grid", gap: 9 }}>
        {items.length === 0 && (
          <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>No data.</div>
        )}
        {items.map((i) => (
          <div key={i.label} style={{ display: "grid", gap: 4 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span>{i.label}</span>
              <span className="mono" style={{ color: "var(--ink-soft)" }}>
                {i.count}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                background: "var(--line)",
                overflow: "hidden",
              }}
            >
              <i
                style={{
                  display: "block",
                  height: "100%",
                  width: `${Math.round((i.count / max) * 100)}%`,
                  background: "var(--pine)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
