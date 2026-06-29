import { SessionRow, Stage } from "./types";

// ── Normalisation ────────────────────────────────────────────────────────────
// The raw data has inconsistent casing (maid/Maid/Cook/cook, part-time/Part-time).
// Normalise so charts don't split one category into three.

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function normJobRole(v: string | null): string | null {
  if (!v) return null;
  return titleCase(v.trim());
}

export function normJobType(v: string | null): string | null {
  if (!v) return null;
  return titleCase(v.trim());
}

export function normLeadType(v: string | null): string {
  if (!v) return "Unknown";
  const t = v.trim().toLowerCase();
  if (t === "job_seeker") return "Job Seeker";
  if (t === "customer") return "Customer";
  if (t === "support") return "Support";
  return titleCase(t);
}

// ── Pipeline stage ───────────────────────────────────────────────────────────
// Derives where a session sits in the lead funnel from its flags. Highest
// stage reached wins.
//
//   new        -> session started, bot hasn't captured anything actionable
//   engaged    -> conversation underway (>=4 messages) but no contact details
//   qualified  -> we have a name or phone, but lead is not yet complete
//   complete   -> lead_complete = true (all required fields captured)
//   emailed    -> lead_emailed = true (handed off to the EzyHelpers team)

export function deriveStage(r: SessionRow): Stage {
  if (r.lead_emailed === true) return "emailed";
  if (r.lead_complete === true) return "complete";
  if (r.name || r.phone) return "qualified";
  if ((r.message_count ?? 0) >= 4) return "engaged";
  return "new";
}

export const STAGE_ORDER: Stage[] = [
  "new",
  "engaged",
  "qualified",
  "complete",
  "emailed",
];

export const STAGE_LABELS: Record<Stage, string> = {
  new: "New session",
  engaged: "Engaged",
  qualified: "Qualified",
  complete: "Lead complete",
  emailed: "Emailed to team",
};

// ── Date helpers (server runs in UTC; we bucket by the display TZ) ────────────
// We bucket by Asia/Kolkata so "today" matches the EzyHelpers team's day.
export const DISPLAY_TZ = "Asia/Kolkata";

export function ymdInTz(iso: string, tz: string = DISPLAY_TZ): string {
  const d = new Date(iso);
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayYmd(tz: string = DISPLAY_TZ): string {
  return ymdInTz(new Date().toISOString(), tz);
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function shortLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

// Parse the messages column, which arrives as a JSON string or array.
export function parseMessages(v: SessionRow["messages"]) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
