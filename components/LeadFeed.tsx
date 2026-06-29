"use client";

import { SessionRow } from "@/lib/types";
import { deriveStage, normJobRole, normJobType, DISPLAY_TZ } from "@/lib/leadLogic";

function timeFmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function cleanPhone(p: string | null): string {
  if (!p) return "—";
  // raw data has values like "8861048336.0"
  return p.replace(/\.0$/, "");
}

export default function LeadFeed({
  rows,
  freshIds,
}: {
  rows: SessionRow[];
  freshIds: Set<string>;
}) {
  if (!rows.length) {
    return (
      <div className="empty">
        No sessions in range. If you expect rows here, your Supabase key may be
        blocked by Row Level Security — check the SELECT policy, or set a
        service-role key server-side.
      </div>
    );
  }

  return (
    <div className="feedwrap">
      <table>
        <thead>
          <tr>
            <th>Started</th>
            <th>Stage</th>
            <th>Type</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Role</th>
            <th>Job type</th>
            <th>Msgs</th>
            <th>Page</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const stage = deriveStage(r);
            const isJobSeeker = (r.lead_type ?? "").toLowerCase() === "job_seeker";
            return (
              <tr
                key={r.session_id}
                className={freshIds.has(r.session_id) ? "fresh" : ""}
              >
                <td className="ts">{timeFmt(r.started_at)}</td>
                <td>
                  <span className={`pill ${stage}`}>{stage}</span>
                </td>
                <td>
                  {r.lead_type ? (
                    <span className={`pill ${isJobSeeker ? "job_seeker" : ""}`}>
                      {isJobSeeker ? "job seeker" : r.lead_type}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="pii">{r.name || "—"}</td>
                <td className="pii mono">{cleanPhone(r.phone)}</td>
                <td>{r.area || "—"}</td>
                <td>{normJobRole(r.job_role) || "—"}</td>
                <td>{normJobType(r.job_type) || "—"}</td>
                <td className="mono">{r.message_count ?? "—"}</td>
                <td title={r.page || ""} style={{ color: "var(--ink-soft)" }}>
                  {r.page || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
