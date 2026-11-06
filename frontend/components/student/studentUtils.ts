import type { AttendanceRecord, Mark } from "../../lib/api";

export const PASS_PERCENT = 40; // change this if your school uses a different pass mark

export function percentOf(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((obtained / total) * 1000) / 10;
}

export function gradeFor(percent: number): string {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B+";
  if (percent >= 60) return "B";
  if (percent >= 50) return "C";
  if (percent >= PASS_PERCENT) return "D";
  return "F";
}

export function isPass(percent: number): boolean {
  return percent >= PASS_PERCENT;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// "YYYY-MM-DD" key from an API date (works for "2026-11-05" and full ISO strings)
export function dateKey(value: string): string {
  return String(value).slice(0, 10);
}

export function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDate(value: string): string {
  const key = dateKey(value);
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatLongToday(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Whole days from today until the given date (negative = in the past)
export function daysUntil(value: string): number {
  const target = new Date(`${dateKey(value)}T00:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percent: number;
}

export function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const total = present + absent;
  return { total, present, absent, percent: total ? Math.round((present / total) * 1000) / 10 : 0 };
}

export interface ExamGroup {
  name: string;
  marks: Mark[];
  obtained: number;
  total: number;
  percent: number;
}

// Groups marks by exam name. Oldest exam first (uses createdAt when available, otherwise order received).
export function groupByExam(marks: Mark[]): ExamGroup[] {
  const map = new Map<string, Mark[]>();
  marks.forEach((m) => {
    const list = map.get(m.examName) || [];
    list.push(m);
    map.set(m.examName, list);
  });

  const groups: ExamGroup[] = Array.from(map.entries()).map(([name, list]) => {
    const obtained = list.reduce((sum, m) => sum + m.marksObtained, 0);
    const total = list.reduce((sum, m) => sum + m.totalMarks, 0);
    return { name, marks: list, obtained, total, percent: percentOf(obtained, total) };
  });

  const firstTime = (g: ExamGroup) => {
    const times = g.marks.map((m) => (m.createdAt ? new Date(m.createdAt).getTime() : NaN)).filter((t) => !Number.isNaN(t));
    return times.length ? Math.min(...times) : null;
  };

  return groups
    .map((g, index) => ({ g, index, time: firstTime(g) }))
    .sort((a, b) => (a.time !== null && b.time !== null ? a.time - b.time : a.index - b.index))
    .map((x) => x.g);
}

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todayName(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}
