/**
 * Syncology Android — Shared TypeScript Models
 *
 * Identik dengan src/types/index.ts di desktop.
 * Field names harus sinkron dengan Supabase schema.
 */

// ── Auth ───────────────────────────────────────────────────────
export interface FirebaseUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  idToken: string;
  refreshToken?: string;
}

// ── Rooms ──────────────────────────────────────────────────────
export interface Room {
  id: string;
  room_code: string;
  project_name: string;
  global_deadline: string;
  created_at: string;
  is_active: boolean;
  external_chat_url: string;
  archived_at: string;
  my_role?: 'leader' | 'member';
  my_member_id?: string;
}

// ── Members ────────────────────────────────────────────────────
export interface Member {
  id: string;
  uid: string;
  display_name: string;
  role: 'leader' | 'member';
  joined_at: string;
  nudge_pts: number;
  total_pts: number;
  nudge_sent_today: number;
  nudge_reset_date: string;
}

// ── Tasks ──────────────────────────────────────────────────────
export type TaskDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
export type TaskStatus =
  | 'proposed'
  | 'todo'
  | 'under_review'
  | 'completed'
  | 'disputed';
export type EscalationLevel = 0 | 1 | 2 | 3;

export const DIFFICULTY_WEIGHT: Record<TaskDifficulty, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
  'Very Hard': 35,
};

export type EvidenceType =
  | 'github_pr'
  | 'github_commit'
  | 'document'
  | 'image'
  | 'other_url'
  | 'file_upload';

export interface TypedEvidenceMeta {
  type: EvidenceType;
  primary_url: string;
  notes?: string;
  github_pr_num?: string;
  github_commit_hash?: string;
  image_urls?: string[];
  file_name?: string;
  file_type?: string;
  file_size?: number;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  completed_at?: string;
  assignee_uid?: string;
  due_date?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to_id: string;
  proposed_by_id: string;
  weight: number;
  difficulty: TaskDifficulty;
  category: 'technical' | 'management';
  status: TaskStatus;
  internal_deadline: string;
  evidence_url: string;
  evidence_meta?: TypedEvidenceMeta;
  approved_by_id: string;
  rejection_reason: string;
  is_rescue: boolean;
  proposed_at: string;
  approved_at: string;
  submitted_at: string;
  completed_at: string;
  escalation_level: EscalationLevel;
  escalated_at: string;
  assigned_reviewer_id: string;
  reviewer_backup_id?: string;
  review_due_at?: string;
  backup_message?: string;
  blocked_by?: string[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  kudos_by?: string[];
  kudos_count?: number;
  subtasks?: TaskSubtask[];
}

// ── Messages ───────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message_body: string;
  timestamp: string;
  edited?: boolean;
  reply_to?: string;
  reactions?: Record<string, string[]>;
}

// ── Nudges ─────────────────────────────────────────────────────
export interface Nudge {
  id: string;
  from_member_id: string;
  from_uid: string;
  from_name: string;
  to_uid: string;
  task_id: string;
  task_title: string;
  timestamp: string;
  read: boolean;
}

// ── Activity / Audit Events ────────────────────────────────────
export type EventType =
  | 'room_created'
  | 'room_updated'
  | 'room_ended'
  | 'member_joined'
  | 'member_rejoined'
  | 'member_removed'
  | 'task_proposed'
  | 'task_approved'
  | 'task_rejected'
  | 'task_rescued'
  | 'task_updated'
  | 'task_deleted'
  | 'evidence_submitted'
  | 'nudge_sent'
  | 'kudos_sent'
  | 'backup_called';

export interface ActivityEvent {
  id: string;
  actor_uid: string;
  actor_name: string;
  event_type: EventType;
  payload: Record<string, any>;
  timestamp: string;
}

// ── Task Comments ──────────────────────────────────────────────
export interface TaskComment {
  id: string;
  author_uid: string;
  author_name: string;
  comment_text: string;
  timestamp: string;
}

// ── Streaks & Badges ───────────────────────────────────────────
export interface MemberStats {
  uid: string;
  display_name: string;
  role: 'leader' | 'member';
  total_pts: number;
  tasks_completed: number;
  tasks_assigned: number;
  tasks_overdue: number;
  nudges_sent: number;
  nudges_received: number;
  rescues: number;
  reviews_done: number;
  reviews_pending: number;
  on_time_rate: number;
  weekly_activity: number[];
  current_streak: number;
  longest_streak: number;
  badges: string[];
  last_completed_at?: string;
}

export type BadgeId =
  | 'first_blood'
  | 'rescuer'
  | 'ghostbuster'
  | 'mentor'
  | 'streak_7'
  | 'streak_30'
  | 'nudge_master'
  | 'point_legend'
  | 'team_player';

// ── Toast / Notification ───────────────────────────────────────
export type ToastType = 'nudge' | 'backup' | 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  taskId?: string;
  senderName?: string;
  dedupKey?: string;
}
