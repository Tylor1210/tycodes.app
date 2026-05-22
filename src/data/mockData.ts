import type { ScheduleBlock, BacklogTask, DashboardMetrics } from '../types';

export const mockSchedule: ScheduleBlock[] = [
  { StartTime: '00:00', EndTime: '05:30', TaskName: 'Sleep',             Color: '#6366f1' },
  { StartTime: '05:30', EndTime: '06:00', TaskName: 'Morning Routine',   Color: '#06b6d4' },
  { StartTime: '06:00', EndTime: '07:15', TaskName: 'Gym',               Color: '#10b981' },
  { StartTime: '07:15', EndTime: '07:45', TaskName: 'Breakfast',         Color: '#f43f5e' },
  { StartTime: '07:45', EndTime: '08:15', TaskName: 'Commute',           Color: '#0ea5e9' },
  { StartTime: '08:15', EndTime: '12:00', TaskName: 'Deep Work',         Color: '#f59e0b' },
  { StartTime: '12:00', EndTime: '12:45', TaskName: 'Lunch',             Color: '#f43f5e' },
  { StartTime: '12:45', EndTime: '17:00', TaskName: 'Work Block 2',      Color: '#f59e0b' },
  { StartTime: '17:00', EndTime: '17:30', TaskName: 'Commute',           Color: '#0ea5e9' },
  { StartTime: '17:30', EndTime: '18:30', TaskName: 'Personal Projects', Color: '#8b5cf6' },
  { StartTime: '18:30', EndTime: '19:15', TaskName: 'Dinner',            Color: '#f43f5e' },
  { StartTime: '19:15', EndTime: '21:00', TaskName: 'Learning',          Color: '#8b5cf6' },
  { StartTime: '21:00', EndTime: '21:30', TaskName: 'Evening Routine',   Color: '#06b6d4' },
  { StartTime: '21:30', EndTime: '23:59', TaskName: 'Sleep',             Color: '#6366f1' },
];

export const mockBacklog: BacklogTask[] = [
  { id: 'b1', TaskName: 'Submit Q2 tax documents',     Status: 'missed',  Timestamp: '2026-05-20T09:00:00' },
  { id: 'b2', TaskName: 'Review insurance renewal',    Status: 'missed',  Timestamp: '2026-05-19T14:00:00' },
  { id: 'b3', TaskName: 'Schedule dentist appointment',Status: 'pending', Timestamp: '2026-05-21T10:00:00' },
  { id: 'b4', TaskName: 'Update portfolio site',       Status: 'pending', Timestamp: '2026-05-21T16:00:00' },
  { id: 'b5', TaskName: 'Renew domain registration',   Status: 'missed',  Timestamp: '2026-05-18T12:00:00' },
  { id: 'b6', TaskName: 'Organize cloud storage',      Status: 'pending', Timestamp: '2026-05-22T08:00:00' },
];

export const mockMetrics: DashboardMetrics = {
  unsorted_files: 47,
  unsorted_notes: 12,
};
