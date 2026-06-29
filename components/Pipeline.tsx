"use client";

import { PipelineCounts } from "@/lib/types";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/leadLogic";

export default function Pipeline({ counts }: { counts: PipelineCounts }) {
  const max = Math.max(1, ...STAGE_ORDER.map((s) => counts[s]));
  return (
    <div className="pipe">
      {STAGE_ORDER.map((s) => {
        const n = counts[s];
        const pct = Math.round((n / max) * 100);
        return (
          <div className={`stage s-${s}`} key={s}>
            <div className="sct">{n.toLocaleString()}</div>
            <div className="slab">{STAGE_LABELS[s]}</div>
            <div className="sbar">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
