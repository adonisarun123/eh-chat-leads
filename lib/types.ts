// Shape of a row in the chatbot_sessions table (EzyHelpers / Asha bot).
// Derived from the real export. Many fields are nullable because a session
// may end before the bot collects them.

export interface ChatMessage {
  role: "assistant" | "user" | "system";
  content: string;
}

export interface SessionRow {
  session_id: string;
  started_at: string;
  last_message_at: string | null;
  closed_at: string | null;
  page: string | null;
  messages: ChatMessage[] | string | null;
  message_count: number | null;
  lead: Record<string, unknown> | string | null;
  lead_type: string | null; // customer | job_seeker | support
  name: string | null;
  phone: string | null;
  area: string | null;
  job_role: string | null;
  job_type: string | null;
  lead_complete: boolean | null;
  area_served: boolean | null;
  sentiment: string | null;
  unanswered: string | null;
  lead_emailed: boolean | null;
  feedback: string | null; // up | down
  details: Record<string, unknown> | string | null;
  registration_paid: boolean | null;
  txn_id: string | null;
  phase: number | null;
}

// A session reduced to the pipeline stage it currently sits in.
export type Stage = "new" | "engaged" | "qualified" | "complete" | "emailed";

export interface Kpis {
  today: number;
  yesterday: number;
  last7: number;
  total: number;
  leadsCompleteToday: number;
  emailedToday: number;
  jobSeekersToday: number;
  completionRate: number; // complete / sessions, all-time, 0..1
}

export interface DayBucket {
  date: string; // YYYY-MM-DD
  label: string; // M/D
  sessions: number;
  complete: number;
}

export interface PipelineCounts {
  new: number;
  engaged: number;
  qualified: number;
  complete: number;
  emailed: number;
}

export interface StatsPayload {
  kpis: Kpis;
  daily: DayBucket[];
  pipeline: PipelineCounts;
  byJobRole: { label: string; count: number }[];
  byLeadType: { label: string; count: number }[];
  generatedAt: string;
}
