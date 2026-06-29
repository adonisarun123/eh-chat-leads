import { NextRequest, NextResponse } from "next/server";
import { getServerClient, SUPABASE_TABLE } from "@/lib/supabaseServer";
import { SessionRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Returns the most recent sessions for the live feed.
// Query params:
//   limit  (default 60, max 200)
//   date   (optional YYYY-MM-DD) — restrict to sessions started on/after that
//          day (used for "today only" filtering; client passes IST midnight)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Number(sp.get("limit") ?? 60) || 60, 200);
    const sinceIso = sp.get("since"); // ISO timestamp lower bound, optional

    const supabase = getServerClient();
    let q = supabase
      .from(SUPABASE_TABLE)
      .select(
        "session_id, started_at, last_message_at, closed_at, page, message_count, lead_type, name, phone, area, job_role, job_type, lead_complete, area_served, sentiment, lead_emailed, feedback, phase",
        { count: "exact" }
      )
      .order("started_at", { ascending: false })
      .limit(limit);

    if (sinceIso) q = q.gte("started_at", sinceIso);

    const { data, error, count } = await q;

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: rlsHint(error.message) },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { rows: (data ?? []) as SessionRow[], total: count ?? null },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function rlsHint(msg: string): string | undefined {
  if (/permission|rls|row-level|JWT|policy/i.test(msg)) {
    return "Supabase returned an auth/RLS error. Either add a SELECT policy for the role your key uses, or set SUPABASE_KEY to a service-role key (server-side only).";
  }
  return undefined;
}
