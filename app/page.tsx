"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionRow, StatsPayload } from "@/lib/types";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { todayYmd, DISPLAY_TZ } from "@/lib/leadLogic";
import DailyChart from "@/components/DailyChart";
import Pipeline from "@/components/Pipeline";
import CategoryBars from "@/components/CategoryBars";
import LeadFeed from "@/components/LeadFeed";

type ConnState = "connecting" | "live" | "poll" | "err";

const POLL_MS = 15000; // fallback / always-on safety refresh

export default function Dashboard() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [paused, setPaused] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const today = todayYmd();

  // IST midnight as an ISO bound for "today only".
  const istMidnightIso = `${today}T00:00:00+05:30`;

  const load = useCallback(async () => {
    try {
      const since = todayOnly ? `&since=${encodeURIComponent(istMidnightIso)}` : "";
      const [sRes, stRes] = await Promise.all([
        fetch(`/api/sessions?limit=80${since}`, { cache: "no-store" }),
        fetch(`/api/stats`, { cache: "no-store" }),
      ]);

      const sJson = await sRes.json();
      const stJson = await stRes.json();

      if (!sRes.ok) {
        setError(sJson.hint || sJson.error || "Failed to load sessions.");
        setConn("err");
        return;
      }
      setError(null);

      const incoming: SessionRow[] = sJson.rows ?? [];
      // Determine which rows are new since last render (for the flash).
      if (!firstLoad.current) {
        const fresh = new Set<string>();
        for (const r of incoming) {
          if (!seenRef.current.has(r.session_id)) fresh.add(r.session_id);
        }
        setFreshIds(fresh);
        if (fresh.size) {
          window.setTimeout(() => setFreshIds(new Set()), 1300);
        }
      }
      incoming.forEach((r) => seenRef.current.add(r.session_id));

      setRows(incoming);
      setTotal(sJson.total ?? null);
      if (!stRes.ok) {
        setWarn(stJson.hint || stJson.error || "Stats failed to load.");
      } else {
        setStats(stJson as StatsPayload);
        setWarn(null);
      }
      setUpdatedAt(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: DISPLAY_TZ,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
      firstLoad.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setConn("err");
    }
  }, [todayOnly, istMidnightIso]);

  // Initial + polling refresh.
  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (!paused) load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load, paused]);

  // Realtime subscription (optional — only if NEXT_PUBLIC_* envs are set).
  useEffect(() => {
    const client = getBrowserClient();
    if (!client) {
      setConn((c) => (c === "err" ? c : "poll"));
      return;
    }
    const channel = client
      .channel("chatbot_sessions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_sessions" },
        () => {
          // A change happened — re-fetch authoritative data from the server API.
          if (!paused) load();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConn("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setConn("poll");
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [load, paused]);

  useEffect(() => {
    document.body.classList.toggle("privacy", privacy);
  }, [privacy]);

  const k = stats?.kpis;
  const delta =
    k && k.yesterday > 0
      ? Math.round(((k.today - k.yesterday) / k.yesterday) * 100)
      : null;

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="mark">A</div>
          <div>
            <h1>EH Chat Leads · Asha</h1>
            <div className="sub">chatbot_sessions · {DISPLAY_TZ}</div>
          </div>
        </div>
        <div className="controls">
          <button
            className="btn"
            aria-pressed={todayOnly}
            onClick={() => {
              firstLoad.current = true;
              seenRef.current = new Set();
              setTodayOnly((v) => !v);
            }}
          >
            {todayOnly ? "Showing: Today" : "Showing: Recent"}
          </button>
          <button
            className="btn"
            aria-pressed={privacy}
            onClick={() => setPrivacy((v) => !v)}
            title="Blur names & phones until hover — for shared screens"
          >
            Privacy
          </button>
          <button
            className="btn"
            aria-pressed={paused}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="btn" onClick={() => load()}>
            Refresh
          </button>
          <div className="status">
            <span
              className={`dot ${
                conn === "live"
                  ? "live"
                  : conn === "err"
                  ? "err"
                  : conn === "poll"
                  ? "poll"
                  : ""
              }`}
            />
            <span>
              {conn === "live"
                ? "realtime"
                : conn === "poll"
                ? "polling 15s"
                : conn === "err"
                ? "error"
                : "connecting…"}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="banner error">
          <b>Could not load data.</b> {error}
        </div>
      )}
      {warn && !error && (
        <div className="banner warn">
          <b>Heads up.</b> {warn}
        </div>
      )}

      <section className="cards">
        <div className="card lead">
          <div className="lab">Sessions today</div>
          <div className="val">{k ? k.today.toLocaleString() : "—"}</div>
          <div className="meta">
            {delta == null ? (
              "since IST midnight"
            ) : (
              <>
                vs yesterday{" "}
                <span className={delta >= 0 ? "up" : "down"}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
                </span>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="lab">Leads complete today</div>
          <div className="val">{k ? k.leadsCompleteToday.toLocaleString() : "—"}</div>
          <div className="meta">{k ? `${k.emailedToday} emailed to team` : ""}</div>
        </div>
        <div className="card">
          <div className="lab">Last 7 days</div>
          <div className="val">{k ? k.last7.toLocaleString() : "—"}</div>
          <div className="meta">{k ? `${k.jobSeekersToday} job seekers today` : ""}</div>
        </div>
        <div className="card">
          <div className="lab">Total sessions</div>
          <div className="val">{k ? k.total.toLocaleString() : "—"}</div>
          <div className="meta">
            {k ? `${Math.round(k.completionRate * 100)}% complete all-time` : ""}
          </div>
        </div>
      </section>

      <div className="grid2">
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="ph">
            <h2>Daily volume · last 14 days</h2>
            <span className="note">amber = today</span>
          </div>
          <div className="pad">
            {stats ? (
              <DailyChart data={stats.daily} todayYmd={today} />
            ) : (
              <div className="empty">Loading chart…</div>
            )}
          </div>
        </div>
        <CategoryBars
          title="Top requested roles"
          items={stats?.byJobRole ?? []}
        />
      </div>

      <div className="panel">
        <div className="ph">
          <h2>Lead funnel · last 14 days</h2>
          <span className="note">cumulative — reached at least this stage</span>
        </div>
        {stats ? (
          <Pipeline counts={stats.pipeline} />
        ) : (
          <div className="empty">Loading pipeline…</div>
        )}
      </div>

      <div className="panel">
        <div className="ph">
          <h2>{todayOnly ? "Today's leads" : "Live feed · newest first"}</h2>
          <span className="note">
            {rows.length} shown{total != null ? ` · ${total.toLocaleString()} total` : ""}
          </span>
        </div>
        <LeadFeed rows={rows} freshIds={freshIds} />
      </div>

      <div className="foot">
        <span>updated {updatedAt || "—"}</span>
        <span>
          server-side reads · realtime via Supabase channel · {DISPLAY_TZ}
        </span>
      </div>
    </div>
  );
}
