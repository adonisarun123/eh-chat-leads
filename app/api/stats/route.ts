import { NextResponse } from "next/server";
import { getServerClient, SUPABASE_TABLE } from "@/lib/supabaseServer";
import { SessionRow, StatsPayload, DayBucket, Stage } from "@/lib/types";
import {
  deriveStage,
  STAGE_ORDER,
  normJobRole,
  normLeadType,
  ymdInTz,
  todayYmd,
  addDaysYmd,
  shortLabel,
} from "@/lib/leadLogic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Aggregates KPIs, the 14-day daily volume, the pipeline funnel, and category
// breakdowns. Pulls a 14-day window of lightweight columns plus an all-time
// count, and computes everything server-side.
export async function GET() {
  try {
    const supabase = getServerClient();

    // 14-day window lower bound (in IST), expressed as UTC ISO for the query.
    const today = todayYmd();
    const windowStartYmd = addDaysYmd(today, -13);
    // IST is UTC+5:30; midnight IST == 18:30 UTC the previous day.
    const windowStartIso = `${addDaysYmd(windowStartYmd, -1)}T18:30:00.000Z`;

    // All-time total (head request, no rows transferred).
    const { count: total, error: countErr } = await supabase
      .from(SUPABASE_TABLE)
      .select("session_id", { count: "exact", head: true });
    if (countErr) {
      return NextResponse.json(
        { error: countErr.message, hint: rlsHint(countErr.message) },
        { status: 502 }
      );
    }

    // All-time completion rate needs total complete; cheap head count.
    const { count: totalComplete } = await supabase
      .from(SUPABASE_TABLE)
      .select("session_id", { count: "exact", head: true })
      .eq("lead_complete", true);

    // Windowed rows for daily buckets + pipeline + categories.
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select(
        "session_id, started_at, message_count, name, phone, lead_type, job_role, lead_complete, lead_emailed",
        { count: "exact" }
      )
      .gte("started_at", windowStartIso)
      .order("started_at", { ascending: true })
      .limit(50000);

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: rlsHint(error.message) },
        { status: 502 }
      );
    }

    const rows = (data ?? []) as SessionRow[];

    // ── Daily buckets (last 14 days incl. today) ─────────────────────────────
    const buckets = new Map<string, DayBucket>();
    for (let i = 13; i >= 0; i--) {
      const ymd = addDaysYmd(today, -i);
      buckets.set(ymd, {
        date: ymd,
        label: shortLabel(ymd),
        sessions: 0,
        complete: 0,
      });
    }

    const yesterday = addDaysYmd(today, -1);
    const last7Start = addDaysYmd(today, -6);

    let todayCount = 0,
      yesterdayCount = 0,
      last7 = 0,
      leadsCompleteToday = 0,
      emailedToday = 0,
      jobSeekersToday = 0;

    const pipeline: Record<Stage, number> = {
      new: 0,
      engaged: 0,
      qualified: 0,
      complete: 0,
      emailed: 0,
    };
    const roleCounts = new Map<string, number>();
    const leadTypeCounts = new Map<string, number>();

    for (const r of rows) {
      const ymd = ymdInTz(r.started_at);
      const b = buckets.get(ymd);
      if (b) {
        b.sessions++;
        if (r.lead_complete === true) b.complete++;
      }

      if (ymd === today) {
        todayCount++;
        if (r.lead_complete === true) leadsCompleteToday++;
        if (r.lead_emailed === true) emailedToday++;
        if ((r.lead_type ?? "").toLowerCase() === "job_seeker")
          jobSeekersToday++;
      }
      if (ymd === yesterday) yesterdayCount++;
      if (ymd >= last7Start) last7++;

      // Pipeline is CUMULATIVE: a session that reached "emailed" also counts
      // toward every earlier stage, so the funnel descends New >= Engaged >=
      // Qualified >= Complete >= Emailed instead of showing 0 for "complete"
      // when every complete lead was also emailed.
      const reached = deriveStage(r);
      const idx = STAGE_ORDER.indexOf(reached);
      for (let i = 0; i <= idx; i++) pipeline[STAGE_ORDER[i]]++;

      const role = normJobRole(r.job_role);
      if (role) roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);

      const lt = normLeadType(r.lead_type);
      leadTypeCounts.set(lt, (leadTypeCounts.get(lt) ?? 0) + 1);
    }

    const byJobRole = [...roleCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const byLeadType = [...leadTypeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const payload: StatsPayload = {
      kpis: {
        today: todayCount,
        yesterday: yesterdayCount,
        last7,
        total: total ?? 0,
        leadsCompleteToday,
        emailedToday,
        jobSeekersToday,
        completionRate:
          total && total > 0 ? (totalComplete ?? 0) / total : 0,
      },
      daily: [...buckets.values()],
      pipeline,
      byJobRole,
      byLeadType,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function rlsHint(msg: string): string | undefined {
  if (/permission|rls|row-level|JWT|policy/i.test(msg)) {
    return "Supabase returned an auth/RLS error. Add a SELECT policy for your key's role, or use a service-role key server-side.";
  }
  return undefined;
}
