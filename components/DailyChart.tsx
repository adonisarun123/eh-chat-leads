"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { DayBucket } from "@/lib/types";

export default function DailyChart({
  data,
  todayYmd,
}: {
  data: DayBucket[];
  todayYmd: string;
}) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ece6da" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#5b6661", fontFamily: "monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#cfc7b6" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#5b6661", fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,92,74,0.06)" }}
            contentStyle={{
              fontFamily: "monospace",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #cfc7b6",
            }}
            formatter={(v: number, n: string) => [v, n === "sessions" ? "Sessions" : "Complete"]}
          />
          <Bar dataKey="sessions" radius={[4, 4, 0, 0]} maxBarSize={34}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.date === todayYmd ? "#c9772b" : "#0f5c4a"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
