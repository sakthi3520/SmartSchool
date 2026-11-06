"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  type StudentFormInput,
  type TeacherFormInput,
} from "@/lib/api";

/* ============================================================
   SmartSchool - Admin Dashboard
   Uses ONLY your existing lib/api.js functions (students + teachers).
   Everything shown comes from MongoDB. No dummy data.
   ============================================================ */

// ---------- Types ----------

type Section = "dashboard" | "students" | "teachers" | "attendance" | "marks" | "reports" | "settings";
type Kind = "student" | "teacher";

type Person = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  age: string;
  className: string;
  section: string;
  admissionNo: string;
  subject: string;
  createdAt: number; // milliseconds, 0 if unknown
};

type ActivityItem = { id: string; text: string; time: number; tone: "student" | "teacher" | "action" };

const MENU: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "students", label: "Students", icon: "users" },
  { id: "teachers", label: "Teachers", icon: "teacher" },
  { id: "attendance", label: "Attendance", icon: "calendar" },
  { id: "marks", label: "Marks & Exams", icon: "marks" },
  { id: "reports", label: "Reports", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" },
];

// ---------- Helpers ----------

function pickText(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

// The API may return [..] or { students: [..] } or { data: [..] }
function extractList(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    for (const key of ["students", "teachers", "data", "users", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

// MongoDB _id contains its creation time, so we can show "registered X days ago" without a new API
function getCreatedAt(raw: Record<string, unknown>, id: string) {
  const created = raw.createdAt;
  if (typeof created === "string") {
    const time = Date.parse(created);
    if (!Number.isNaN(time)) return time;
  }
  if (/^[0-9a-f]{24}$/i.test(id)) return parseInt(id.slice(0, 8), 16) * 1000;
  return 0;
}

function toPerson(raw: Record<string, unknown>): Person {
  const email = pickText(raw, ["email"]);
  const id = pickText(raw, ["_id", "id"]) || email;
  return {
    id,
    name: pickText(raw, ["name", "fullName", "studentName", "teacherName"]) || "Unnamed",
    email,
    mobile: pickText(raw, ["mobile", "mobileNumber", "phone", "phoneNumber", "contact"]),
    address: pickText(raw, ["address"]),
    age: pickText(raw, ["age"]),
    className: pickText(raw, ["className", "class", "grade", "standard"]),
    section: pickText(raw, ["section", "division"]),
    admissionNo: pickText(raw, ["admissionNumber", "admissionNo", "admission_no", "rollNumber", "rollNo"]),
    subject: pickText(raw, ["subject", "subjects", "department"]),
    createdAt: getCreatedAt(raw, id),
  };
}

function loadList(response: unknown): Person[] {
  const unique = new Map<string, Person>();
  extractList(response).forEach((raw) => {
    const person = toPerson(raw);
    if (person.id && !unique.has(person.id)) unique.set(person.id, person);
  });
  return Array.from(unique.values());
}

function classLabel(p: Person) {
  if (p.className && p.section) return `${p.className} - ${p.section}`;
  return p.className || p.section || "";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const AVATARS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function avatarColor(name: string) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return AVATARS[sum % AVATARS.length];
}

function timeAgo(time: number) {
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Reads the expiry time from the JWT token (null if it cannot be read)
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ---------- Icons (inline SVG, no packages needed) ----------

const ICONS: Record<string, string[]> = {
  home: ["M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z"],
  users: [
    "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2",
    "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M21 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  teacher: ["M3 4h18v12H3z", "M8 20l4-4 4 4", "M7 9h6M7 12h10"],
  calendar: [
    "M8 2v4M16 2v4M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    "M9 16l2 2 4-4",
  ],
  marks: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8M8 17h5"],
  chart: ["M3 3v18h18", "M7 15v3M12 9v9M17 5v13"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  menu: ["M3 6h18M3 12h18M3 18h18"],
  close: ["M18 6L6 18M6 6l12 12"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
  refresh: ["M23 4v6h-6", "M1 20v-6h6", "M3.5 9a9 9 0 0 1 14.9-3.4L23 10", "M1 14l4.6 4.4A9 9 0 0 0 20.5 15"],
  plus: ["M12 5v14M5 12h14"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  trash: ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  cap: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  alert: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4M12 16h.01"],
  arrow: ["M5 12h14", "M12 5l7 7-7 7"],
  printer: ["M6 9V2h12v7", "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2", "M6 14h12v8H6z"],
  check: ["M20 6L9 17l-5-5"],
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {(ICONS[name] || []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

// ---------- Reusable UI pieces ----------

function Heading({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
      {title && <h3 className="mb-4 font-semibold text-slate-800">{title}</h3>}
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{text}</p>;
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="animate-fade-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Horizontal bars (used for class distribution)
function BarList({ items, color = "from-indigo-500 to-violet-500" }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-800">{item.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Donut chart (students vs teachers)
function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {total > 0 &&
          parts.map((p) => {
            const length = (p.value / total) * circumference;
            const circle = (
              <circle
                key={p.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={p.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        <text x="70" y="70" transform="rotate(90 70 70)" textAnchor="middle" dominantBaseline="central" className="fill-slate-800 text-2xl font-bold">
          {total}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            {p.label}: <strong className="text-slate-800">{p.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Vertical bars for registrations in the last 6 months
function MonthBars({ people }: { people: Person[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const list: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), count: 0 });
    }
    people.forEach((p) => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);
      const month = list.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (month) month.count += 1;
    });
    return list;
  }, [people]);

  const max = Math.max(1, ...months.map((m) => m.count));

  return (
    <div className="flex h-40 items-end justify-between gap-3">
      {months.map((m) => (
        <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold text-slate-600">{m.count}</span>
          <div
            className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400 transition-all duration-700"
            style={{ height: `${Math.max(4, (m.count / max) * 100)}px` }}
          />
          <span className="text-xs text-slate-400">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function DashboardSection({
  name,
  students,
  teachers,
  loading,
  sessionActivity,
  goTo,
}: {
  name: string;
  students: Person[];
  teachers: Person[];
  loading: boolean;
  sessionActivity: ActivityItem[];
  goTo: (s: Section) => void;
}) {
  const classGroups = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => {
      const label = classLabel(s);
      if (label) counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label: `Class ${label}`, value }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const newThisMonth = [...students, ...teachers].filter((p) => p.createdAt >= monthStart).length;

  // Recent activity = latest real registrations + what the admin did in this session
  const activity: ActivityItem[] = [
    ...sessionActivity,
    ...students.filter((s) => s.createdAt).map((s) => ({ id: `s${s.id}`, text: `${s.name} registered as a student`, time: s.createdAt, tone: "student" as const })),
    ...teachers.filter((t) => t.createdAt).map((t) => ({ id: `t${t.id}`, text: `${t.name} registered as a teacher`, time: t.createdAt, tone: "teacher" as const })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  const val = (n: number) => (loading && n === 0 ? "..." : String(n));

  const cards = [
    { label: "Total Students", value: val(students.length), note: "From MongoDB", icon: "users", tile: "from-indigo-500 to-violet-500", go: "students" as Section },
    { label: "Total Teachers", value: val(teachers.length), note: "From MongoDB", icon: "teacher", tile: "from-emerald-500 to-teal-500", go: "teachers" as Section },
    { label: "Total Classes", value: String(classGroups.length), note: "From students' class data", icon: "cap", tile: "from-amber-500 to-orange-500", go: "reports" as Section },
    { label: "New This Month", value: val(newThisMonth), note: "Students + teachers", icon: "plus", tile: "from-sky-500 to-cyan-500", go: "reports" as Section },
    { label: "Today's Attendance", value: "-", note: "Open Attendance page", icon: "calendar", tile: "from-rose-500 to-pink-500", go: "attendance" as Section },
    { label: "Total Admins", value: "-", note: "Needs a users API", icon: "shield", tile: "from-slate-600 to-slate-800", go: "settings" as Section },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-28 h-40 w-40 rounded-full bg-emerald-400/10" />
        <p className="text-sm font-medium text-indigo-200">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome back, {name}! 👋</h2>
        <p className="mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
          Here is the live picture of your school, straight from the database.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => goTo(c.go)}
            className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tile} text-white shadow-md`}>
                <Icon name={c.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{c.label}</p>
                <p className="text-3xl font-bold text-slate-800">{c.value}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{c.note}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Students by Class">
          {classGroups.length === 0 ? <Empty text="No class information on students yet." /> : <BarList items={classGroups.slice(0, 8)} />}
        </Card>
        <Card title="Students vs Teachers">
          <Donut
            parts={[
              { label: "Students", value: students.length, color: "#6366f1" },
              { label: "Teachers", value: teachers.length, color: "#10b981" },
            ]}
          />
        </Card>
        <Card title="New Registrations (last 6 months)">
          <MonthBars people={[...students, ...teachers]} />
        </Card>
        <Card title="Recent Activity">
          {activity.length === 0 ? (
            <Empty text="No activity yet." />
          ) : (
            <ul className="space-y-2.5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.tone === "student" ? "bg-indigo-500" : a.tone === "teacher" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-slate-600">{a.text}</span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// STUDENTS / TEACHERS (one reusable manager for both)
// ============================================================

type FormState = {
  name: string;
  age: string;
  email: string;
  mobile: string;
  address: string;
  className: string;
  section: string;
  admissionNo: string;
  subject: string;
};

const emptyForm: FormState = { name: "", age: "", email: "", mobile: "", address: "", className: "", section: "", admissionNo: "", subject: "" };

function validateForm(kind: Kind, f: FormState, others: Person[]) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const label = kind === "student" ? "student" : "teacher";

  if (f.name.trim().length < 2) errors.name = "Enter the full name.";
  const age = Number(f.age);
  if (!Number.isInteger(age) || age < 3 || age > 100) errors.age = "Age must be between 3 and 100.";

  const email = f.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address.";
  else if (others.some((p) => p.email.toLowerCase() === email)) errors.email = `A ${label} or user with this email already exists.`;

  if (!/^[6-9]\d{9}$/.test(f.mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
  else if (others.some((p) => p.mobile === f.mobile)) errors.mobile = "This mobile number is already registered.";

  if (f.address.trim().length < 5) errors.address = "Enter the address.";
  return errors;
}

function PeopleManager({
  kind,
  people,
  everyone,
  loading,
  error,
  onReload,
  onActivity,
}: {
  kind: Kind;
  people: Person[];
  everyone: Person[]; // students + teachers, used to stop duplicate emails
  loading: boolean;
  error: string;
  onReload: () => Promise<void>;
  onActivity: (text: string) => void;
}) {
  const isStudent = kind === "student";
  const title = isStudent ? "Student" : "Teacher";
  const api = isStudent
    ? { add: addStudent, update: updateStudent, remove: deleteStudent }
    : { add: addTeacher, update: updateTeacher, remove: deleteTeacher };

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view" | "delete"; person?: Person } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Refresh the list every time this page is opened
  useEffect(() => {
    onReload();
  }, [onReload]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const groupOf = (p: Person) => (isStudent ? classLabel(p) : p.subject);
  const groups = useMemo(
    () => Array.from(new Set(people.map((p) => (isStudent ? classLabel(p) : p.subject)).filter(Boolean))).sort(),
    [people, isStudent]
  );

  const filtered = people.filter((p) => {
    if (filter !== "all" && groupOf(p) !== filter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [p.name, p.email, p.mobile, p.admissionNo, classLabel(p), p.subject].join(" ").toLowerCase().includes(term);
  });

  function openForm(mode: "add" | "edit", person?: Person) {
    setFormErrors({});
    setFormError("");
    setForm(
      person
        ? { name: person.name, age: person.age, email: person.email, mobile: person.mobile, address: person.address, className: person.className, section: person.section, admissionNo: person.admissionNo, subject: person.subject }
        : emptyForm
    );
    setModal({ mode, person });
  }

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !modal) return;

    const editingId = modal.person?.id;
    const others = everyone.filter((p) => p.id !== editingId);
    const errors = validateForm(kind, form, others);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      age: Number(form.age),
      email: form.email.trim(),
      mobile: form.mobile,
      address: form.address.trim(),
    };
    if (isStudent) {
      if (form.className.trim()) payload.className = form.className.trim();
      if (form.section.trim()) payload.section = form.section.trim();
      if (form.admissionNo.trim()) payload.admissionNumber = form.admissionNo.trim();
    } else if (form.subject.trim()) {
      payload.subject = form.subject.trim();
    }

    setSaving(true);
    setFormError("");
    try {
      if (editingId) await api.update(editingId, payload as unknown as StudentFormInput & TeacherFormInput);
      else await api.add(payload as unknown as StudentFormInput & TeacherFormInput);

      await onReload();
      onActivity(`${editingId ? "Updated" : "Added"} ${title.toLowerCase()} ${form.name.trim()}`);
      setToast(`${title} ${editingId ? "updated" : "added"} successfully.`);
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving || !modal?.person) return;
    setSaving(true);
    setFormError("");
    try {
      await api.remove(modal.person.id);
      await onReload();
      onActivity(`Deleted ${title.toLowerCase()} ${modal.person.name}`);
      setToast(`${title} deleted.`);
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setField(key, key === "mobile" ? e.target.value.replace(/\D/g, "") : e.target.value)}
        aria-invalid={!!formErrors[key]}
        className={`${inputClass} ${formErrors[key] ? "border-rose-300" : ""}`}
        {...props}
      />
      {formErrors[key] && <p className="mt-1 text-xs font-medium text-rose-600">{formErrors[key]}</p>}
    </div>
  );

  const detail = (label: string, value: string) => (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-700">{value || "-"}</p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <Heading title={`${title}s`} subtitle={`${people.length} ${title.toLowerCase()}${people.length === 1 ? "" : "s"} in the database`}>
        <div className="flex gap-2">
          <button
            onClick={onReload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-indigo-50 disabled:opacity-60"
          >
            <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => openForm("add")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90"
          >
            <Icon name="plus" className="h-4 w-4" /> Add {title}
          </button>
        </div>
      </Heading>

      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <Icon name="check" className="h-4 w-4" /> {toast}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}s by name, email, mobile...`} className={`${inputClass} pl-11`} />
        </div>
        {groups.length > 0 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} sm:w-52`}>
            <option value="all">{isStudent ? "All classes" : "All subjects"}</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {isStudent ? `Class ${g}` : g}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <ErrorBox text={error} />}

      {loading && people.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-slate-400">Loading...</p></Card>
      ) : filtered.length === 0 ? (
        <Empty text={people.length === 0 ? `No ${title.toLowerCase()}s yet. Click "Add ${title}" to create one.` : "Nothing matches your search."} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{title}</th>
                  <th className="px-5 py-3 font-semibold">{isStudent ? "Class" : "Subject"}</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Mobile</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition hover:bg-indigo-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${avatarColor(p.name)}`}>{initials(p.name)}</span>
                        <div>
                          <p className="font-semibold text-slate-700">{p.name}</p>
                          {isStudent && p.admissionNo && <p className="text-xs text-slate-400">Adm. {p.admissionNo}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{groupOf(p) || "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{p.email || "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{p.mobile || "-"}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton label="View" icon="eye" onClick={() => setModal({ mode: "view", person: p })} />
                        <IconButton label="Edit" icon="edit" onClick={() => openForm("edit", p)} />
                        <IconButton label="Delete" icon="trash" danger onClick={() => { setFormError(""); setModal({ mode: "delete", person: p }); }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${avatarColor(p.name)}`}>{initials(p.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-700">{p.name}</p>
                    <p className="truncate text-xs text-slate-400">{[groupOf(p), p.email].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <IconButton label="View" icon="eye" onClick={() => setModal({ mode: "view", person: p })} />
                  <IconButton label="Edit" icon="edit" onClick={() => openForm("edit", p)} />
                  <IconButton label="Delete" icon="trash" danger onClick={() => { setFormError(""); setModal({ mode: "delete", person: p }); }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- Modals ---------- */}
      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <Modal title={`${modal.mode === "add" ? "Add" : "Edit"} ${title}`} onClose={() => !saving && setModal(null)}>
          <form onSubmit={handleSave} noValidate className="space-y-4">
            {formError && <ErrorBox text={formError} />}
            {field("name", "Full name *", { placeholder: "Enter full name" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("age", "Age *", { type: "number", placeholder: "Age" })}
              {field("mobile", "Mobile *", { type: "tel", maxLength: 10, placeholder: "10-digit number" })}
            </div>
            {field("email", "Email *", { type: "email", placeholder: "name@example.com" })}
            {field("address", "Address *", { placeholder: "Address" })}
            {isStudent ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {field("className", "Class", { placeholder: "10" })}
                {field("section", "Section", { placeholder: "A" })}
                {field("admissionNo", "Admission No", { placeholder: "Optional" })}
              </div>
            ) : (
              field("subject", "Subject", { placeholder: "e.g. Mathematics" })
            )}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving..." : modal.mode === "add" ? `Add ${title}` : "Save Changes"}
              </button>
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.mode === "view" && modal.person && (
        <Modal title={`${title} Details`} onClose={() => setModal(null)}>
          <div className="mb-5 flex items-center gap-4">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${avatarColor(modal.person.name)}`}>{initials(modal.person.name)}</span>
            <div>
              <p className="text-lg font-bold text-slate-800">{modal.person.name}</p>
              <p className="text-sm text-slate-400">{title}{modal.person.createdAt ? ` · joined ${timeAgo(modal.person.createdAt)}` : ""}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {detail("Email", modal.person.email)}
            {detail("Mobile", modal.person.mobile)}
            {detail("Age", modal.person.age)}
            {isStudent ? detail("Class", classLabel(modal.person)) : detail("Subject", modal.person.subject)}
            {isStudent && detail("Admission No", modal.person.admissionNo)}
            <div className={isStudent ? "sm:col-span-2" : "sm:col-span-2"}>{detail("Address", modal.person.address)}</div>
          </div>
        </Modal>
      )}

      {modal?.mode === "delete" && modal.person && (
        <Modal title={`Delete ${title}`} onClose={() => !saving && setModal(null)}>
          {formError && <ErrorBox text={formError} />}
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{modal.person.name}</strong>? This cannot be undone.
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={handleDelete} disabled={saving} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
              {saving ? "Deleting..." : "Yes, delete"}
            </button>
            <button onClick={() => setModal(null)} disabled={saving} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IconButton({ label, icon, onClick, danger = false }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 transition ${danger ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-indigo-50 hover:text-indigo-600"}`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

// ============================================================
// ATTENDANCE / MARKS  (open your existing pages)
// ============================================================

function LinkPanel({ title, text, href, icon }: { title: string; text: string; href: string; icon: string }) {
  return (
    <div className="animate-fade-in">
      <Heading title={title} subtitle="Uses your existing page, so nothing is duplicated." />
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
          <Icon name={icon} className="h-8 w-8" />
        </div>
        <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">{text}</p>
        <Link href={href} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90">
          Open {title} <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}

// ============================================================
// REPORTS (real analytics + class list)
// ============================================================

function ReportsSection({ students, teachers }: { students: Person[]; teachers: Person[] }) {
  const classes = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const label = classLabel(s);
      if (label) map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [students]);

  const noClass = students.filter((s) => !classLabel(s)).length;
  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    teachers.forEach((t) => t.subject && map.set(t.subject, (map.get(t.subject) || 0) + 1));
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [teachers]);

  const ratio = teachers.length ? (students.length / teachers.length).toFixed(1) : "-";

  return (
    <div className="animate-fade-in space-y-6">
      <Heading title="Reports & Analytics" subtitle="Live numbers calculated from your database.">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 print:hidden">
          <Icon name="printer" className="h-4 w-4" /> Print report
        </button>
      </Heading>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Students", String(students.length)],
          ["Teachers", String(teachers.length)],
          ["Students per teacher", ratio],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Class Overview (${classes.length} classes)`}>
          {classes.length === 0 ? (
            <Empty text="No class data yet. Add a class when creating students." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="pb-2">Class</th><th className="pb-2 text-right">Students</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map(([label, count]) => (
                  <tr key={label}><td className="py-2 font-medium text-slate-700">Class {label}</td><td className="py-2 text-right text-slate-600">{count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {noClass > 0 && <p className="mt-3 text-xs text-amber-600">{noClass} student{noClass === 1 ? " has" : "s have"} no class assigned.</p>}
        </Card>

        <Card title="Teachers by Subject">
          {subjects.length === 0 ? <Empty text="No subject data on teachers yet." /> : <BarList items={subjects} color="from-emerald-500 to-teal-500" />}
        </Card>
      </div>

      <Card title="Registrations (last 6 months)">
        <MonthBars people={[...students, ...teachers]} />
      </Card>
    </div>
  );
}

// ============================================================
// SETTINGS / PROFILE
// ============================================================

function SettingsSection({ user, expiry, onLogout }: { user: Record<string, string>; expiry: number | null; onLogout: () => void }) {
  const rows: [string, string][] = [
    ["Name", user.name],
    ["Email", user.email],
    ["Mobile", user.mobile],
    ["Role", "Administrator"],
    ["Session expires", expiry ? new Date(expiry).toLocaleString("en-IN") : "Not available"],
  ];

  return (
    <div className="animate-fade-in">
      <Heading title="Profile & Settings" subtitle="Your admin account details." />
      <Card className="max-w-2xl">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white">{initials(user.name || "A")}</span>
          <div>
            <p className="text-lg font-bold text-slate-800">{user.name || "Admin"}</p>
            <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
              <Icon name="shield" className="h-3 w-3" /> Administrator
            </p>
          </div>
        </div>
        <dl className="divide-y divide-slate-100 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium text-slate-700">{value || "-"}</dd>
            </div>
          ))}
        </dl>
        <button onClick={onLogout} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">
          <Icon name="logout" className="h-4 w-4" /> Logout
        </button>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function AdminDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<Record<string, string>>({});
  const [expiry, setExpiry] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [students, setStudents] = useState<Person[]>([]);
  const [teachers, setTeachers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [teachersError, setTeachersError] = useState("");
  const [sessionActivity, setSessionActivity] = useState<ActivityItem[]>([]);

  function clearLogin() {
    localStorage.removeItem("smartschool_token");
    localStorage.removeItem("smartschool_user");
  }

  // ----- Only admins may enter (same rules as your original page + token expiry check) -----
  useEffect(() => {
    const token = localStorage.getItem("smartschool_token");
    const savedUser = localStorage.getItem("smartschool_user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const saved = JSON.parse(savedUser);
      const exp = tokenExpiry(token);

      if (exp && exp < Date.now()) {
        clearLogin();
        router.replace("/login");
        return;
      }

      if (saved.role !== "admin") {
        router.replace(saved.role === "teacher" ? "/teacher" : saved.role === "student" ? "/student" : "/login");
        return;
      }

      setUser({ name: saved.name || "Admin", email: saved.email || "", mobile: saved.mobile || "" });
      setExpiry(exp);
      setChecking(false);
    } catch {
      clearLogin();
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    clearLogin();
    router.replace("/login");
  }

  // ----- Load students and teachers from the existing API -----
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, t] = await Promise.allSettled([getStudents(), getTeachers()]);

    const problem = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : "Could not load data.");

    if (s.status === "fulfilled") {
      setStudents(loadList(s.value));
      setStudentsError("");
    } else setStudentsError(problem(s));

    if (t.status === "fulfilled") {
      setTeachers(loadList(t.value));
      setTeachersError("");
    } else setTeachersError(problem(t));

    // An expired / invalid token means we should go back to login
    const messages = [s, t].filter((r): r is PromiseRejectedResult => r.status === "rejected").map(problem).join(" ");
    if (/token|unauthori[sz]ed|expired|not authorized/i.test(messages)) {
      clearLogin();
      router.replace("/login");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!checking) loadAll();
  }, [checking, loadAll]);

  function addActivity(text: string) {
    setSessionActivity((prev) => [{ id: String(Date.now()), text, time: Date.now(), tone: "action" as const }, ...prev].slice(0, 5));
  }

  function goTo(next: Section) {
    setSection(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }

  const everyone = useMemo(() => [...students, ...teachers], [students, teachers]);

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading dashboard...</main>;
  }

  const title = MENU.find((m) => m.id === section)?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden print:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`sidebar-bg fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden text-white transition-transform duration-300 print:hidden lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative flex items-center justify-between px-6 pb-4 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
              <Icon name="cap" className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight">SmartSchool</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="relative mt-4 flex-1 space-y-1.5 overflow-y-auto px-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Management</p>
          {MENU.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  active ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10" : "text-slate-300 hover:translate-x-1 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30" : "bg-white/5 text-slate-300 group-hover:bg-white/10"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1">{item.label}</span>
                {active && <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_2px_rgba(252,211,77,0.7)]" />}
              </button>
            );
          })}
        </nav>

        <div className="relative space-y-3 px-4 pb-6 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold">{initials(user.name) || "A"}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.email || "Administrator"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200 ring-1 ring-rose-400/20 transition hover:bg-rose-500 hover:text-white"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" /> Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="lg:pl-72 print:pl-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/70 bg-[#f4f6fb]/85 px-4 py-3 backdrop-blur print:hidden sm:px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm ring-1 ring-slate-200 lg:hidden" aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">SmartSchool / Admin</p>
            <h1 className="truncate text-lg font-bold text-slate-800">{title}</h1>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {(section === "dashboard" || section === "reports") && (studentsError || teachersError) && <ErrorBox text={[studentsError, teachersError].filter(Boolean).join(" · ")} />}

            {section === "dashboard" && <DashboardSection name={user.name} students={students} teachers={teachers} loading={loading} sessionActivity={sessionActivity} goTo={goTo} />}

            {section === "students" && (
              <PeopleManager kind="student" people={students} everyone={everyone} loading={loading} error={studentsError} onReload={loadAll} onActivity={addActivity} />
            )}

            {section === "teachers" && (
              <PeopleManager kind="teacher" people={teachers} everyone={everyone} loading={loading} error={teachersError} onReload={loadAll} onActivity={addActivity} />
            )}

            {section === "attendance" && <LinkPanel title="Attendance" icon="calendar" href="/attendance" text="Mark and review attendance on your existing attendance page." />}
            {section === "marks" && <LinkPanel title="Marks & Exams" icon="marks" href="/marks" text="Manage marks and exam records on your existing marks page." />}

            {section === "reports" && <ReportsSection students={students} teachers={teachers} />}
            {section === "settings" && <SettingsSection user={user} expiry={expiry} onLogout={handleLogout} />}
          </div>
        </main>
      </div>
    </div>
  );
}