export interface ScheduleBlock {
  StartTime: string;
  EndTime: string;
  TaskName: string;
  Color: string;
}

export interface BacklogTask {
  id: string;
  TaskName: string;
  Status: 'missed' | 'pending' | 'done';
  Timestamp: string;
}

export interface DashboardMetrics {
  unsorted_files: number;
  unsorted_notes: number;
  [key: string]: number;
}

export interface DashboardData {
  schedule: ScheduleBlock[];
  backlog: BacklogTask[];
  metrics: DashboardMetrics;
  status: string;
  timestamp: string;
}

export interface ScriptureVerse {
  reference: string;
  text: string;
  translation: string;
}

export interface StockPosition {
  ticker: string;
  avgPrice: number;
  shares: number;
}

export interface QuickNote {
  id: string;
  text: string;
  createdAt: string;
}

/** A task in the Pomodoro-style work queue */
export interface QueueTask {
  id: string;
  title: string;
  addedAt: string;
  /** Total milliseconds accumulated BEFORE the current session */
  totalElapsed: number;
  /** Date.now() when the task was last started/resumed — null when paused */
  sessionStart: number | null;
  status: 'queued' | 'active' | 'paused' | 'done';
}
