"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStudents,
  getAttendance,
  saveAttendance,
  getRegisteredStudents,
  getAllHomework,
  createHomework as createHomeworkRequest,
  deleteHomework as deleteHomeworkRequest,
  getAllAnnouncements,
  postAnnouncement,
  deleteAnnouncement,
  getAllTimetable,
  saveTimetableDay,
  getMarks,
  addMark,
  type RegisteredStudentAccount,
  type Homework as ApiHomework,
  type Announcement as ApiAnnouncement,
  type TimetableDay as ApiTimetableDay,
  type TimetablePeriod,
  type Mark as ApiMark,
} from "@/lib/api";

/* ============================================================
   SmartSchool - Teacher Dashboard
   One page, five sections. The sidebar stays fixed and only
   the main area changes when you click a menu item.
   ============================================================ */

// ---------- Types ----------

type Section = "home" | "students" | "attendance" | "marks" | "homework" | "timetable" | "announcements" | "todo";
type AttendanceStatus = "present" | "absent" | "late";

type Student = {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  email: string;
  mobile: string;
};

type Homework = {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  description: string;
  status: "pending" | "completed";
};

function toTeacherHomework(homework: ApiHomework): Homework {
  return {
    id: homework._id,
    title: homework.title,
    subject: homework.subject,
    className: homework.className,
    dueDate: homework.dueDate.slice(0, 10),
    description: homework.description,
    status: "pending",
  };
}

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type AttendanceRecords = Record<string, Record<string, AttendanceStatus>>;

// ---------- Small helpers ----------

const MENU: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "students", label: "Student List", icon: "users" },
  { id: "attendance", label: "Attendance", icon: "calendar" },
  { id: "marks", label: "Mark List", icon: "book" },
  { id: "homework", label: "Homework", icon: "book" },
  { id: "timetable", label: "Timetable", icon: "calendar" },
  { id: "announcements", label: "Announcements", icon: "check" },
  { id: "todo", label: "To-do List", icon: "check" },
];

const PAGE_TITLES: Record<Section, string> = {
  home: "Dashboard",
  students: "Student List",
  attendance: "Attendance Management",
  marks: "Mark List Management",
  homework: "Homework Management",
  timetable: "Timetable Management",
  announcements: "Announcements",
  todo: "To-do List",
};

function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(value: string) {
  if (!value) return "-";
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pickText(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function extractList(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    for (const key of ["students", "data", "users", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function toStudent(raw: Record<string, unknown>): Student {
  const firstLast = [raw.firstName, raw.lastName]
    .filter((v) => typeof v === "string" && v)
    .join(" ");

  const email = pickText(raw, ["email"]);

  return {
    id: pickText(raw, ["_id", "id"]) || email,
    name:
      pickText(raw, ["name", "fullName", "studentName"]) ||
      firstLast ||
      "Unnamed student",
    admissionNo: pickText(raw, [
      "admissionNumber",
      "admissionNo",
      "admission_no",
      "admissionId",
      "rollNumber",
      "rollNo",
    ]),
    className: pickText(raw, ["className", "class", "grade", "standard"]),
    section: pickText(raw, ["section", "division"]),
    email,
    mobile: pickText(raw, [
      "mobile",
      "mobileNumber",
      "phone",
      "phoneNumber",
      "contact",
    ]),
  };
}

function classLabel(s: Student) {
  if (s.className && s.section) return `${s.className} - ${s.section}`;
  return s.className || s.section || "";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const AVATAR_COLORS = [
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
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved) as T);
    } catch {
      // ignore broken saved data
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!key || !loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked - ignore
    }
  }, [key, value, loaded]);

  return [value, setValue] as const;
}

// ---------- Icons ----------

const ICONS: Record<string, string[]> = {
  home: ["M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z"],
  users: [
    "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2",
    "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M21 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  calendar: [
    "M8 2v4M16 2v4M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    "M9 16l2 2 4-4",
  ],
  book: [
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  ],
  check: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  menu: ["M3 6h18M3 12h18M3 18h18"],
  close: ["M18 6L6 18M6 6l12 12"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
  refresh: [
    "M23 4v6h-6",
    "M1 20v-6h6",
    "M3.5 9a9 9 0 0 1 14.9-3.4L23 10",
    "M1 14l4.6 4.4A9 9 0 0 0 20.5 15",
  ],
  plus: ["M12 5v14M5 12h14"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  trash: [
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  ],
  cap: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"],
  tick: ["M20 6L9 17l-5-5"],
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

// ---------- Reusable UI pieces ----------

function SectionHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
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

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

// ============================================================
// STUDENT DROPDOWN COMPONENT
// ============================================================

function StudentDropdown({ students, onSelect }: { students: Student[]; onSelect: (student: Student) => void }) {
  const [value, setValue] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = students.filter((s) => {
    if (!value) return true;
    const search = value.name.toLowerCase();
    return s.name.toLowerCase().includes(search) || s.admissionNo.toLowerCase().includes(search);
  });

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${avatarColor(value.name)}`}>
              {initials(value.name)}
            </div>
            <span>{value.name}</span>
            <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
          </div>
        ) : (
          <span>Select a student...</span>
        )}
      </button>

      {open && (
        <div
          className="absolute w-full top-full mt-2 rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div className="px-2 max-h-64 overflow-y-auto">
            {filtered.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  onSelect(student);
                  setOpen(false);
                  setValue(null);
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 transition-colors"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${avatarColor(student.name)}`}>
                  {initials(student.name)}
                </div>
                <span>{student.name}</span>
                <span className="text-xs text-slate-500 ml-auto">{student.admissionNo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HOME
// ============================================================

function HomeSection({
  name,
  totalStudents,
  studentsLoading,
  presentToday,
  absentToday,
  lateToday,
  attendanceMarked,
  homework,
  todos,
  goTo,
}: {
  name: string;
  totalStudents: number;
  studentsLoading: boolean;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceMarked: boolean;
  homework: Homework[];
  todos: Todo[];
  goTo: (section: Section) => void;
}) {
  const pendingHomework = homework.filter((h) => h.status === "pending");
  const completedTasks = todos.filter((t) => t.done).length;
  const openTasks = todos.filter((t) => !t.done);

  const upcoming = [...pendingHomework]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const cards = [
    {
      label: "Total Students",
      value: studentsLoading ? "..." : String(totalStudents),
      note: "Registered in SmartSchool",
      icon: "users",
      tile: "from-indigo-500 to-violet-500",
      soft: "bg-indigo-50",
      go: "students" as Section,
    },
    {
      label: "Today's Attendance",
      value: attendanceMarked ? `${presentToday}/${totalStudents}` : "Not marked",
      note: attendanceMarked
        ? `${absentToday} absent · ${lateToday} late`
        : "Tap to mark attendance",
      icon: "calendar",
      tile: "from-emerald-500 to-teal-500",
      soft: "bg-emerald-50",
      go: "attendance" as Section,
    },
    {
      label: "Pending Homework",
      value: String(pendingHomework.length),
      note: "Waiting to be completed",
      icon: "book",
      tile: "from-amber-500 to-orange-500",
      soft: "bg-amber-50",
      go: "homework" as Section,
    },
    {
      label: "Completed Tasks",
      value: String(completedTasks),
      note: `${openTasks.length} still open`,
      icon: "check",
      tile: "from-sky-500 to-cyan-500",
      soft: "bg-sky-50",
      go: "todo" as Section,
    },
  ];

  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const now = new Date();
    setToday(now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }));
    const hour = now.getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <p className="text-sm font-medium text-indigo-100">{today}</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          {greeting}, {name}! 👋
        </h2>
        <p className="mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
          Here is a quick look at your classroom today. Use the menu on the left to
          manage students, attendance, homework and tasks.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => goTo(card.go)}
            className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tile} text-white shadow-md`}
              >
                <Icon name={card.icon} />
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 ${card.soft}`}>
                View
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.note}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Upcoming Homework</h3>
            <button
              onClick={() => goTo("homework")}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Manage
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No pending homework. Great job!
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{h.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[h.subject, h.className].filter(Boolean).join(" · ") || "General"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-amber-600">
                    Due {formatDate(h.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Open Tasks</h3>
            <button
              onClick={() => goTo("todo")}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Manage
            </button>
          </div>
          {openTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nothing left to do. Enjoy your day!
            </p>
          ) : (
            <ul className="space-y-2">
              {openTasks.slice(0, 4).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="truncate">{t.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
// ============================================================
// STUDENT LIST
// ============================================================

function StudentsSection({
  students,
  loading,
  error,
  onRefresh,
  onAddStudent,
  addingStudent,
  addStudentError,
}: {
  students: Student[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onAddStudent: (data: { name: string; admissionNo: string; className: string; section: string; email: string; phone: string }) => Promise<void>;
  addingStudent: boolean;
  addStudentError: string;
}) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: "", admissionNo: "", className: "", section: "A", email: "", phone: "" });
  const [studentFormError, setStudentFormError] = useState("");
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudentAccount[]>([]);
  const [registeredStudentsLoading, setRegisteredStudentsLoading] = useState(true);
  const [registeredStudentsError, setRegisteredStudentsError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const availableAccounts = registeredStudents.filter(
    (account) =>
      !students.some(
        (student) => student.email.toLowerCase() === account.email.toLowerCase()
      )
  );

  useEffect(() => {
    let active = true;

    getRegisteredStudents()
      .then((response) => {
        if (active) setRegisteredStudents(response.students);
      })
      .catch((err: unknown) => {
        if (active) {
          setRegisteredStudentsError(
            err instanceof Error ? err.message : "Could not load student login accounts."
          );
        }
      })
      .finally(() => {
        if (active) setRegisteredStudentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function selectLoginAccount(accountId: string) {
    setSelectedAccountId(accountId);
    const account = registeredStudents.find((item) => item._id === accountId);
    setStudentForm((current) => ({
      ...current,
      name: account?.name || "",
      email: account?.email || "",
      phone: account?.mobile || "",
    }));
    setStudentFormError("");
  }

  async function submitStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !studentForm.name.trim() || !studentForm.admissionNo.trim() || !studentForm.className.trim()) {
      setStudentFormError("Select a registered student account and enter the admission number and class.");
      return;
    }
    setStudentFormError("");
    try {
      await onAddStudent(studentForm);
      setRegisteredStudents((current) =>
        current.filter((account) => account._id !== selectedAccountId)
      );
      setStudentForm({ name: "", admissionNo: "", className: "", section: "A", email: "", phone: "" });
      setSelectedAccountId("");
      setShowAddForm(false);
    } catch (err) {
      setStudentFormError(err instanceof Error ? err.message : "Could not add student.");
    }
  }

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const filtered = students.filter((s) => {
    const value = `${s.name} ${s.admissionNo} ${s.className} ${s.section} ${s.email} ${s.mobile}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  return (
    <div className="animate-fade-in">
      <SectionHeading
        title="Student List"
        subtitle="View and manage students registered in SmartSchool."
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Icon name="refresh" className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            {showAddForm ? "Close Form" : "Add Student"}
          </button>
        </div>
      </SectionHeading>

      {showAddForm && (
        <form
          onSubmit={submitStudent}
          className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Add New Student</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-600">
              Student Login Account *
              <select
                className={`${inputClass} mt-1`}
                value={selectedAccountId}
                onChange={(e) => selectLoginAccount(e.target.value)}
                disabled={registeredStudentsLoading || !!registeredStudentsError}
                required
              >
                <option value="">
                  {registeredStudentsLoading
                    ? "Loading student accounts..."
                    : registeredStudentsError
                      ? "Student accounts unavailable"
                      : availableAccounts.length
                        ? "Select a registered student"
                        : registeredStudents.length
                          ? "All login accounts are already in the student list"
                          : "No student login accounts found"}
                </option>
                {availableAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Admission Number *
              <input
                className={`${inputClass} mt-1`}
                value={studentForm.admissionNo}
                onChange={(e) => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                placeholder="Example: SS1004"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Class *
              <input
                className={`${inputClass} mt-1`}
                value={studentForm.className}
                onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                placeholder="Example: 10"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Section
              <select
                className={`${inputClass} mt-1`}
                value={studentForm.section}
                onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
              >
                {["A", "B", "C", "D"].map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Email *
              <input
                type="email"
                className={`${inputClass} mt-1`}
                value={studentForm.email}
                readOnly
                placeholder="Select a login account"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Phone *
              <input
                className={`${inputClass} mt-1`}
                value={studentForm.phone}
                readOnly
                placeholder="Select a login account"
              />
            </label>
          </div>
          {registeredStudentsError && (
            <p role="alert" className="mt-3 text-sm text-rose-600">
              Could not load student login accounts: {registeredStudentsError}
            </p>
          )}
          {(studentFormError || addStudentError) && (
            <p className="mt-3 text-sm text-rose-600">{studentFormError || addStudentError}</p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={addingStudent}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addingStudent ? "Saving..." : "Save Student"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-10`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, admission number, class or email..."
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <EmptyState icon="users" text="Loading students..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="users" text={search ? "No matching students found." : "No students found. Use Add Student to register a student."} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Admission No.</th>
                  <th className="px-5 py-4">Class</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarColor(student.name)}`}>
                          {initials(student.name)}
                        </div>
                        <span className="font-semibold text-slate-700">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{student.admissionNo || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{classLabel(student) || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{student.email || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{student.mobile || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {filtered.length} of {students.length} students
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ATTENDANCE
// ============================================================

function AttendanceSection({
  students,
  setAttendance,
}: {
  students: Student[];
  setAttendance: React.Dispatch<
    React.SetStateAction<AttendanceRecords>
  >;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [status, setStatus] = useState<"Present" | "Absent">("Present");

  const [records, setRecords] = useState<
    {
      _id: string;
      student:
        | string
        | {
            _id: string;
            name: string;
            admissionNo: string;
            className: string;
            section: string;
          };
      date: string;
      status: "Present" | "Absent";
    }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  useEffect(() => {
    setSelectedDate(todayString());
  }, []);

  const loadAttendance = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError("");

    try {
      const response = await getAttendance(selectedDate);
      setRecords(response.records || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadAttendance();
    }
  }, [selectedDate]);

  const submitAttendance = async () => {
    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (!selectedDate) {
      setError("Please select a date.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await saveAttendance(
        selectedStudentId,
        selectedDate,
        status
      );

      setAttendance((old) => ({
        ...old,
        [selectedDate]: {
          ...(old[selectedDate] || {}),
          [selectedStudentId]:
            status.toLowerCase() as AttendanceStatus,
        },
      }));

      setMessage("Attendance saved successfully!");

      await loadAttendance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <SectionHeading
        title="Attendance Management"
        subtitle="Select a student and submit daily attendance."
      >
        <input
          type="date"
          className={inputClass}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </SectionHeading>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-slate-800">
          Mark Student Attendance
        </h3>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Select Student
            </label>

            <select
              className={inputClass}
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setMessage("");
                setError("");
              }}
            >
              <option value="">-- Select Student --</option>

              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.admissionNo})
                </option>
              ))}
            </select>
          </div>

          {selectedStudent && (
            <div className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">
                  Student Name
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedStudent.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Admission Number
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedStudent.admissionNo || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Class / Section
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedStudent.className || "-"} /{" "}
                  {selectedStudent.section || "-"}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-600">
              Attendance Status
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus("Present")}
                className={`flex-1 rounded-xl px-4 py-3 font-semibold ${
                  status === "Present"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                Present
              </button>

              <button
                type="button"
                onClick={() => setStatus("Absent")}
                className={`flex-1 rounded-xl px-4 py-3 font-semibold ${
                  status === "Absent"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                Absent
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={submitAttendance}
            disabled={saving || students.length === 0}
            className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Attendance"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Attendance Records
        </h3>

        {loading ? (
          <p className="text-sm text-slate-500">
            Loading attendance...
          </p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">
            No attendance records for this date.
          </p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const studentId =
                typeof record.student === "object"
                  ? record.student?._id
                  : record.student;

              const student = students.find(
                (item) => item.id === studentId
              );

              return (
                <div
                  key={record._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {student?.name ||
                        (typeof record.student === "object"
                          ? record.student?.name
                          : "Student")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {student?.admissionNo ||
                        (typeof record.student === "object"
                          ? record.student?.admissionNo
                          : "")}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-bold ${
                      record.status === "Present"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
// ============================================================
// MARKS
// ============================================================

const SUBJECT_OPTIONS = [
  "Tamil",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "Computer Science",
  "Other",
];

function MarkEntrySection({
  students,
  marks,
  loading,
  error,
  onSave,
}: {
  students: Student[];
  marks: ApiMark[];
  loading: boolean;
  error: string;
  onSave: (input: {
    studentId: string;
    examName: string;
    subject: string;
    marksObtained: number;
    totalMarks: number;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    studentId: "",
    examName: "",
    subject: "",
    otherSubject: "",
    marksObtained: "",
    totalMarks: "100",
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  async function submitMark(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setSuccess("");

    const subject = form.subject === "Other" ? form.otherSubject.trim() : form.subject;
    const obtained = Number(form.marksObtained);
    const total = Number(form.totalMarks);
    if (!form.studentId || !form.examName.trim() || !subject) {
      setActionError("Select a student and subject, and enter an exam name.");
      return;
    }
    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
      setActionError("Enter valid marks. Obtained marks cannot exceed total marks.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        studentId: form.studentId,
        examName: form.examName.trim(),
        subject,
        marksObtained: obtained,
        totalMarks: total,
      });
      setSuccess("Marks saved. The student can now view them in their portal.");
      setForm({ studentId: "", examName: "", subject: "", otherSubject: "", marksObtained: "", totalMarks: "100" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <SectionHeading title="Mark List" subtitle="Enter exam marks for a student. Saved marks appear in that student's portal." />
      <form onSubmit={submitMark} className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">
          Student *
          <select required className={`${inputClass} mt-1`} value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}>
            <option value="">Select a student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} ({student.admissionNo})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600">
          Exam name *
          <input required className={`${inputClass} mt-1`} value={form.examName} onChange={(event) => setForm({ ...form, examName: event.target.value })} placeholder="Example: Quarterly Exam" />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Subject *
          <select required className={`${inputClass} mt-1`} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
            <option value="">Select a subject</option>
            {SUBJECT_OPTIONS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>
        {form.subject === "Other" && (
          <label className="text-sm font-medium text-slate-600">
            Subject name *
            <input required className={`${inputClass} mt-1`} value={form.otherSubject} onChange={(event) => setForm({ ...form, otherSubject: event.target.value })} placeholder="Enter subject name" />
          </label>
        )}
        <label className="text-sm font-medium text-slate-600">
          Total marks *
          <input required type="number" min="1" step="any" className={`${inputClass} mt-1`} value={form.totalMarks} onChange={(event) => setForm({ ...form, totalMarks: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Marks obtained *
          <input required type="number" min="0" step="any" className={`${inputClass} mt-1`} value={form.marksObtained} onChange={(event) => setForm({ ...form, marksObtained: event.target.value })} placeholder="Enter marks" />
        </label>
        {(actionError || error) && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{actionError || error}</p>}
        {success && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{success}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving || students.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save Marks"}
          </button>
        </div>
      </form>

      <h3 className="mb-3 font-semibold text-slate-800">Recently entered marks</h3>
      {loading ? (
        <EmptyState icon="book" text="Loading marks..." />
      ) : marks.length === 0 ? (
        <EmptyState icon="book" text="No marks entered yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Exam</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Marks</th>
                <th className="px-5 py-4">Entered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks.map((mark) => {
                const student = typeof mark.student === "string" ? null : mark.student;
                return (
                  <tr key={mark._id}>
                    <td className="px-5 py-4 font-medium text-slate-700">{student?.name || "Student"}{student?.admissionNo ? ` (${student.admissionNo})` : ""}</td>
                    <td className="px-5 py-4 text-slate-600">{mark.examName}</td>
                    <td className="px-5 py-4 text-slate-600">{mark.subject}</td>
                    <td className="px-5 py-4 text-slate-600">{mark.marksObtained} / {mark.totalMarks}</td>
                    <td className="px-5 py-4 text-slate-600">{mark.createdAt ? formatDate(mark.createdAt.slice(0, 10)) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HOMEWORK
// ============================================================

function HomeworkSection({
  homework,
  setHomework,
  loading,
  error,
  onCreate,
  onDelete,
}: {
  homework: Homework[];
  setHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
  loading: boolean;
  error: string;
  onCreate: (input: {
    title: string;
    subject: string;
    className: string;
    dueDate: string;
    description: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({
    title: "",
    subject: "",
    className: "",
    dueDate: "",
    description: "",
  });

  async function addHomework(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setSaving(true);
    try {
      await onCreate({
        title: form.title.trim(),
        subject: form.subject.trim(),
        className: form.className.trim(),
        dueDate: form.dueDate,
        description: form.description.trim(),
      });
      setForm({ title: "", subject: "", className: "", dueDate: "", description: "" });
      setShowForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save homework.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHomework(id: string) {
    setActionError("");
    try {
      await onDelete(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete homework.");
    }
  }

  function toggleHomework(id: string) {
    setHomework((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "pending" ? "completed" : "pending" }
          : item
      )
    );
  }

  return (
    <div className="animate-fade-in">
      <SectionHeading title="Homework Management" subtitle="Create and track classroom homework.">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Icon name="plus" className="h-4 w-4" />
          {showForm ? "Close" : "Add Homework"}
        </button>
      </SectionHeading>

      {showForm && (
        <form onSubmit={addHomework} className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Homework title *
            <input required className={`${inputClass} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter title" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Subject *
            <input required className={`${inputClass} mt-1`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Class *
            <input required className={`${inputClass} mt-1`} value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="Class" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Due date *
            <input required type="date" className={`${inputClass} mt-1`} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-600 sm:col-span-2">
            Description
            <textarea className={`${inputClass} mt-1`} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Homework details..." />
          </label>
          {(actionError || error) && (
            <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{actionError || error}</p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save Homework"}
            </button>
          </div>
        </form>
      )}

      {error && !showForm && <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p>}
      {loading ? (
        <EmptyState icon="book" text="Loading homework..." />
      ) : homework.length === 0 ? (
        <EmptyState icon="book" text="No homework added yet. Click Add Homework to create one." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {homework.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {[item.subject, item.className].filter(Boolean).join(" · ") || "General"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {item.status}
                </span>
              </div>
              {item.description && <p className="mt-3 text-sm text-slate-500">{item.description}</p>}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</span>
                <div className="flex gap-2">
                  <button onClick={() => toggleHomework(item.id)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                    {item.status === "completed" ? "Reopen" : "Complete"}
                  </button>
                  <button onClick={() => void removeHomework(item.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsSection({
  announcements,
  loading,
  error,
  onCreate,
  onDelete,
}: {
  announcements: ApiAnnouncement[];
  loading: boolean;
  error: string;
  onCreate: (input: {
    title: string;
    message: string;
    priority: "normal" | "important";
    className: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    message: "",
    priority: "normal" as "normal" | "important",
    className: "",
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  async function submitAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    try {
      await onCreate({
        ...form,
        title: form.title.trim(),
        message: form.message.trim(),
        className: form.className.trim(),
      });
      setForm({ title: "", message: "", priority: "normal", className: "" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not post announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAnnouncement(id: string) {
    setActionError("");
    try {
      await onDelete(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete announcement.");
    }
  }

  return (
    <div className="animate-fade-in">
      <SectionHeading title="Announcements" subtitle="Post notices for the whole school or a specific class." />
      <form onSubmit={submitAnnouncement} className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">
          Title *
          <input required maxLength={150} className={`${inputClass} mt-1`} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Announcement title" />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Class (optional)
          <input className={`${inputClass} mt-1`} value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} placeholder="Leave blank for the whole school" />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Priority
          <select className={`${inputClass} mt-1`} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as "normal" | "important" })}>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600 sm:col-span-2">
          Message *
          <textarea required className={`${inputClass} mt-1`} rows={3} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Write the announcement..." />
        </label>
        {(actionError || error) && (
          <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{actionError || error}</p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p>}
      {loading ? (
        <EmptyState icon="check" text="Loading announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState icon="check" text="No announcements posted yet." />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <article key={announcement._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{announcement.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${announcement.priority === "important" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                      {announcement.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {announcement.className || "Whole school"} · {announcement.createdByName || "Staff"} · {formatDate(announcement.createdAt.slice(0, 10))}
                  </p>
                </div>
                <button type="button" onClick={() => void removeAnnouncement(announcement._id)} className="shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                  Delete
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{announcement.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimetableSection({
  timetable,
  loading,
  error,
  onRefresh,
  onSave,
}: {
  timetable: ApiTimetableDay[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onSave: (input: {
    className: string;
    section: string;
    day: string;
    periods: TimetablePeriod[];
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    className: "",
    section: "",
    day: "Monday",
  });
  const [periods, setPeriods] = useState<TimetablePeriod[]>([
    { subject: "", startTime: "", endTime: "", teacherName: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  function loadDay(day: ApiTimetableDay) {
    setForm({ className: day.className, section: day.section || "", day: day.day });
    setPeriods(
      day.periods.length
        ? day.periods.map((period) => ({ ...period }))
        : [{ subject: "", startTime: "", endTime: "", teacherName: "" }]
    );
    setActionError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitTimetable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setSavedMessage("");
    if (periods.some((period) => !period.subject.trim() || !period.startTime || !period.endTime)) {
      setActionError("Enter a subject, start time, and end time for every period.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        className: form.className.trim(),
        section: form.section.trim(),
        periods: periods.map((period) => ({
          ...period,
          subject: period.subject.trim(),
          teacherName: period.teacherName?.trim() || "",
        })),
      });
      setSavedMessage("Timetable saved to MongoDB.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save timetable.");
    } finally {
      setSaving(false);
    }
  }

  function updatePeriod(index: number, field: keyof TimetablePeriod, value: string) {
    setPeriods((current) =>
      current.map((period, periodIndex) =>
        periodIndex === index ? { ...period, [field]: value } : period
      )
    );
  }

  return (
    <div className="animate-fade-in">
      <SectionHeading title="Timetable Management" subtitle="Create or update a class schedule by day." />
      <form onSubmit={submitTimetable} className="mb-6 space-y-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-600">
            Class *
            <input required className={`${inputClass} mt-1`} value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} placeholder="Example: 10" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Section
            <input className={`${inputClass} mt-1`} value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} placeholder="Optional" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Day *
            <select className={`${inputClass} mt-1`} value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>
              {WEEK_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-800">Periods</h3>
            <button type="button" onClick={() => setPeriods((current) => [...current, { subject: "", startTime: "", endTime: "", teacherName: "" }])} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
              Add period
            </button>
          </div>
          {periods.map((period, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]">
              <label className="text-xs font-medium text-slate-600">
                Subject *
                <input required className={`${inputClass} mt-1`} value={period.subject} onChange={(event) => updatePeriod(index, "subject", event.target.value)} placeholder="Maths" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Start *
                <input required type="time" className={`${inputClass} mt-1`} value={period.startTime} onChange={(event) => updatePeriod(index, "startTime", event.target.value)} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                End *
                <input required type="time" className={`${inputClass} mt-1`} value={period.endTime} onChange={(event) => updatePeriod(index, "endTime", event.target.value)} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Teacher
                <input className={`${inputClass} mt-1`} value={period.teacherName || ""} onChange={(event) => updatePeriod(index, "teacherName", event.target.value)} placeholder="Optional" />
              </label>
              <button type="button" disabled={periods.length === 1} onClick={() => setPeriods((current) => current.filter((_, periodIndex) => periodIndex !== index))} className="self-end rounded-lg bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40">
                Remove
              </button>
            </div>
          ))}
        </div>

        {(actionError || error) && <p role="alert" className="text-sm text-rose-600">{actionError || error}</p>}
        {savedMessage && <p role="status" className="text-sm text-emerald-700">{savedMessage}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Save Timetable"}
        </button>
      </form>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Saved schedules</h3>
        <button type="button" onClick={() => void onRefresh()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Refresh
        </button>
      </div>
      {loading ? (
        <EmptyState icon="calendar" text="Loading timetable..." />
      ) : timetable.length === 0 ? (
        <EmptyState icon="calendar" text="No timetable saved yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {timetable.map((day) => (
            <article key={day._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{day.className}{day.section ? ` - ${day.section}` : ""} · {day.day}</h3>
                  <p className="text-xs text-slate-500">{day.periods.length} period{day.periods.length === 1 ? "" : "s"}</p>
                </div>
                <button type="button" onClick={() => loadDay(day)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                  Edit
                </button>
              </div>
              <ol className="space-y-2">
                {day.periods.map((period, index) => (
                  <li key={`${period.startTime}-${index}`} className="flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                    <span>{period.startTime}–{period.endTime} · {period.subject}{period.teacherName ? ` · ${period.teacherName}` : ""}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TO-DO LIST
// ============================================================

function TodoSection({
  todos,
  setTodos,
}: {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
}) {
  const [text, setText] = useState("");

  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setTodos((prev) => [{ id: makeId(), text: text.trim(), done: false }, ...prev]);
    setText("");
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="animate-fade-in">
      <SectionHeading title="To-do List" subtitle="Keep track of your daily teaching tasks." />
      <form onSubmit={addTodo} className="mb-5 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
        <input
          className={inputClass}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter a task..."
        />
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Add Task
        </button>
      </form>

      {todos.length === 0 ? (
        <EmptyState icon="check" text="No tasks yet. Add your first task above." />
      ) : (
        <div className="space-y-3">
          {todos.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <input type="checkbox" checked={item.done} onChange={() => toggleTodo(item.id)} className="h-5 w-5 accent-indigo-600" />
              <span className={`flex-1 text-sm ${item.done ? "text-slate-400 line-through" : "font-medium text-slate-700"}`}>
                {item.text}
              </span>
              <button onClick={() => deleteTodo(item.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TEACHER DASHBOARD
// ============================================================

export default function TeacherDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("Teacher");
  const [section, setSection] = useState<Section>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");

  const [attendance, setAttendance] = useStoredState<AttendanceRecords>("smartschool_teacher_attendance", {});
  const [homework, setHomework] = useStoredState<Homework[]>("smartschool_teacher_homework", []);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState("");
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [marks, setMarks] = useState<ApiMark[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksError, setMarksError] = useState("");
  const [timetable, setTimetable] = useState<ApiTimetableDay[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState("");
  const [todos, setTodos] = useStoredState<Todo[]>("smartschool_teacher_todos", []);

  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    setTodayKey(todayString());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("smartschool_token");
    const savedUser = localStorage.getItem("smartschool_user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      const role = String(user.role || "").toLowerCase();

      if (role !== "teacher") {
        if (role === "admin") router.replace("/admin");
        else if (role === "student") router.replace("/student");
        else router.replace("/login");
        return;
      }

      setName(user.name || user.fullName || user.username || "Teacher");
      setChecking(false);
    } catch {
      localStorage.removeItem("smartschool_token");
      localStorage.removeItem("smartschool_user");
      router.replace("/login");
    }
  }, [router]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError("");

    try {
      const response = await getStudents();
      const list = extractList(response).map(toStudent);

      const unique = new Map<string, Student>();
      list.forEach((student) => {
        if (student.id && !unique.has(student.id)) {
          unique.set(student.id, student);
        }
      });

      setStudents(Array.from(unique.values()));
    } catch (err) {
      setStudentsError(err instanceof Error ? err.message : "Could not load students.");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadHomework = useCallback(async () => {
    setHomeworkLoading(true);
    setHomeworkError("");
    try {
      const response = await getAllHomework();
      setHomework(response.homework.map(toTeacherHomework));
    } catch (err) {
      setHomeworkError(err instanceof Error ? err.message : "Could not load homework.");
    } finally {
      setHomeworkLoading(false);
    }
  }, [setHomework]);

  const handleCreateHomework = useCallback(async (input: {
    title: string;
    subject: string;
    className: string;
    dueDate: string;
    description: string;
  }) => {
    const response = await createHomeworkRequest(input);
    const savedHomework = response.homework;
    if (!savedHomework) {
      throw new Error("The server did not return the saved homework.");
    }
    setHomework((current) => [
      toTeacherHomework(savedHomework),
      ...current,
    ]);
  }, [setHomework]);

  const handleDeleteHomework = useCallback(async (id: string) => {
    await deleteHomeworkRequest(id);
    setHomework((current) => current.filter((item) => item.id !== id));
  }, [setHomework]);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError("");
    try {
      const response = await getAllAnnouncements();
      setAnnouncements(response.announcements);
    } catch (err) {
      setAnnouncementsError(err instanceof Error ? err.message : "Could not load announcements.");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const handleCreateAnnouncement = useCallback(async (input: {
    title: string;
    message: string;
    priority: "normal" | "important";
    className: string;
  }) => {
    const response = await postAnnouncement(input);
    const savedAnnouncement = response.announcement;
    if (!savedAnnouncement) {
      throw new Error("The server did not return the saved announcement.");
    }
    setAnnouncements((current) => [savedAnnouncement, ...current]);
  }, []);

  const handleDeleteAnnouncement = useCallback(async (id: string) => {
    await deleteAnnouncement(id);
    setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
  }, []);

  const loadMarks = useCallback(async () => {
    setMarksLoading(true);
    setMarksError("");
    try {
      const response = await getMarks();
      setMarks(response.marks);
    } catch (err) {
      setMarksError(err instanceof Error ? err.message : "Could not load marks.");
    } finally {
      setMarksLoading(false);
    }
  }, []);

  const handleSaveMark = useCallback(async (input: {
    studentId: string;
    examName: string;
    subject: string;
    marksObtained: number;
    totalMarks: number;
  }) => {
    const response = await addMark(input);
    if (!response.mark) {
      throw new Error("The server did not return the saved marks.");
    }
    await loadMarks();
  }, [loadMarks]);

  const loadTimetable = useCallback(async () => {
    setTimetableLoading(true);
    setTimetableError("");
    try {
      const response = await getAllTimetable();
      setTimetable(response.timetable);
    } catch (err) {
      setTimetableError(err instanceof Error ? err.message : "Could not load timetable.");
    } finally {
      setTimetableLoading(false);
    }
  }, []);

  const handleSaveTimetable = useCallback(async (input: {
    className: string;
    section: string;
    day: string;
    periods: TimetablePeriod[];
  }) => {
    const response = await saveTimetableDay(input);
    const savedTimetable = response.timetable;
    if (!savedTimetable) {
      throw new Error("The server did not return the saved timetable.");
    }
    setTimetable((current) => [
      savedTimetable,
      ...current.filter((day) => day._id !== savedTimetable._id),
    ]);
  }, []);

  const handleAddStudent = useCallback(async (data: {
    name: string;
    admissionNo: string;
    className: string;
    section: string;
    email: string;
    phone: string;
  }) => {
    setAddingStudent(true);
    setAddStudentError("");

    try {
      const token = localStorage.getItem("smartschool_token");
      if (!token) throw new Error("Your login session is missing. Please login again.");

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

      const response = await fetch(`${apiBase}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || `Could not add student (${response.status}).`);
      }

      await loadStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add student.";
      setAddStudentError(message);
      throw new Error(message);
    } finally {
      setAddingStudent(false);
    }
  }, [loadStudents]);

  useEffect(() => {
    if (!checking) loadStudents();
  }, [checking, loadStudents]);

  function handleLogout() {
    localStorage.removeItem("smartschool_token");
    localStorage.removeItem("smartschool_user");
    router.replace("/login");
  }

  function goTo(next: Section) {
    setSection(next);
    setSidebarOpen(false);
    if (next === "marks") void loadMarks();
    if (next === "homework") void loadHomework();
    if (next === "timetable") void loadTimetable();
    if (next === "announcements") void loadAnnouncements();
    window.scrollTo({ top: 0 });
  }

  const todayRecord = todayKey ? attendance[todayKey] || {} : {};
  const studentIds = new Set(students.map((s) => s.id));

  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;

  Object.entries(todayRecord).forEach(([id, status]) => {
    if (!studentIds.has(id)) return;
    if (status === "present") presentToday += 1;
    if (status === "absent") absentToday += 1;
    if (status === "late") lateToday += 1;
  });

  const attendanceMarked = presentToday + absentToday + lateToday > 0;

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading dashboard...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar-bg fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between px-6 pb-4 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
              <Icon name="cap" className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight">SmartSchool</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-300">Teacher Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative mt-4 flex-1 space-y-1.5 overflow-y-auto px-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Menu</p>
          {MENU.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  active ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10" : "text-slate-300 hover:translate-x-1 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${active ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30" : "bg-white/5 text-slate-300 group-hover:bg-white/10"}`}>
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1">{item.label}</span>
                {active && <span className="h-2 w-2 rounded-full bg-emerald-300" />}
              </button>
            );
          })}
        </nav>

        <div className="relative space-y-3 px-4 pb-6 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold">
              {initials(name) || "T"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-slate-400">Teacher</p>
            </div>
          </div>

          <StudentDropdown students={students} onSelect={(student) => {
            // Handle student selection - you can navigate to student details or perform actions
            console.log("Selected student:", student.name, student.admissionNo);
            // Example: goTo("students"); or show student details
          }} />
          
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200 ring-1 ring-rose-400/20 transition hover:bg-rose-500 hover:text-white">
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/70 bg-[#f4f6fb]/85 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm ring-1 ring-slate-200 lg:hidden" aria-label="Open menu">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">SmartSchool / Teacher</p>
            <h1 className="truncate text-lg font-bold text-slate-800">{PAGE_TITLES[section]}</h1>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {section === "home" && (
              <HomeSection
                name={name}
                totalStudents={students.length}
                studentsLoading={studentsLoading && students.length === 0}
                presentToday={presentToday}
                absentToday={absentToday}
                lateToday={lateToday}
                attendanceMarked={attendanceMarked}
                homework={homework}
                todos={todos}
                goTo={goTo}
              />
            )}

            {section === "students" && (
              <StudentsSection
                students={students}
                loading={studentsLoading}
                error={studentsError}
                onRefresh={loadStudents}
                onAddStudent={handleAddStudent}
                addingStudent={addingStudent}
                addStudentError={addStudentError}
              />
            )}

            {section === "attendance" && (
             <AttendanceSection
              students={students}
              setAttendance={setAttendance}
/>
            )}

            {section === "marks" && (
              <MarkEntrySection
                students={students}
                marks={marks}
                loading={marksLoading}
                error={marksError}
                onSave={handleSaveMark}
              />
            )}

            {section === "homework" && (
              <HomeworkSection
                homework={homework}
                setHomework={setHomework}
                loading={homeworkLoading}
                error={homeworkError}
                onCreate={handleCreateHomework}
                onDelete={handleDeleteHomework}
              />
            )}

            {section === "timetable" && (
              <TimetableSection
                timetable={timetable}
                loading={timetableLoading}
                error={timetableError}
                onRefresh={loadTimetable}
                onSave={handleSaveTimetable}
              />
            )}

            {section === "announcements" && (
              <AnnouncementsSection
                announcements={announcements}
                loading={announcementsLoading}
                error={announcementsError}
                onCreate={handleCreateAnnouncement}
                onDelete={handleDeleteAnnouncement}
              />
            )}

            {section === "todo" && (
              <TodoSection todos={todos} setTodos={setTodos} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}