// Hand-written types matching 01_schema.sql.
// (Can later be replaced with `supabase gen types typescript` output.)

export type GroupType = "horse_racing" | "last_man_standing" | "nfl_survivor" | "series";
export type GroupStatus = "active" | "archived" | "finalised";
export type PaymentStatus = "pending" | "paid";

export interface DailyMeetingEntry {
  date: string; // YYYY-MM-DD
  meeting_id: string;
}

export interface Group {
  id: string;
  name: string;
  owner_email: string;
  member_emails: string[];
  member_names: Record<string, string>;
  meeting_ids: string[];
  daily_meeting_ids: DailyMeetingEntry[];
  invite_code: string;
  join_pin: string | null;
  entry_fee: number;
  entry_fee_enabled: boolean;
  currency: string;
  prize_description: string | null;
  type: GroupType;
  max_players: number;
  price_per_player: number;
  start_deadline: string | null;
  start_date: string | null;
  payment_status: PaymentStatus;
  series_id: string | null;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus = "upcoming" | "open" | "closed" | "completed";

export interface Meeting {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  status: MeetingStatus;
  close_at: string | null;
  points_1st: number;
  points_2nd: number;
  points_3rd: number;
  best_chance_multiplier_1st: number;
  best_chance_multiplier_2nd: number;
  best_chance_multiplier_3rd: number;
  sort_order: number;
  created_at: string;
}

export interface Horse {
  number: number;
  name: string;
  jockey?: string;
  trainer?: string;
}

export interface Race {
  id: string;
  meeting_id: string;
  race_number: number;
  race_name: string | null;
  race_time: string | null;
  race_type: "Thoroughbred" | "Harness" | "Greyhound";
  distance: string | null;
  horses: Horse[];
  result_1st: string | null;
  result_2nd: string | null;
  result_3rd: string | null;
  result_entered: boolean;
  created_at: string;
}

export interface EntrySelection {
  race_id: string;
  race_number: number;
  horse_name: string;
  is_best_chance: boolean;
  finish_position: number | null;
}

export interface Entry {
  id: string;
  meeting_id: string;
  group_id: string;
  user_email: string;
  participant_name: string;
  selections: EntrySelection[];
  total_points: number;
  submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardRow {
  email: string;
  total: number;
  participantName: string | null;
}
