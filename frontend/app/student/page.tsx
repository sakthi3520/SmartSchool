
// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";

// export default function StudentDashboard() {
//   const router = useRouter();
//   const [name, setName] = useState("");
//   const [checking, setChecking] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem("smartschool_token");
//     const savedUser = localStorage.getItem("smartschool_user");

//     if (!token || !savedUser) {
//       router.replace("/login");
//       return;
//     }

//     try {
//       const user = JSON.parse(savedUser);

//       if (user.role !== "student") {
//         if (user.role === "admin") {
//           router.replace("/admin");
//         } else if (user.role === "teacher") {
//           router.replace("/teacher");
//         } else {
//           router.replace("/login");
//         }
//         return;
//       }

//       setName(user.name || "Student");
//       setChecking(false);
//     } catch {
//       localStorage.removeItem("smartschool_token");
//       localStorage.removeItem("smartschool_user");
//       router.replace("/login");
//     }
//   }, [router]);

//   function handleLogout() {
//     localStorage.removeItem("smartschool_token");
//     localStorage.removeItem("smartschool_user");
//     router.replace("/login");
//   }

//   if (checking) {
//     return <main className="p-10">Loading dashboard...</main>;
//   }

//   return (
//     <main className="min-h-screen bg-slate-50 p-6 md:p-10">
//       <div className="mx-auto max-w-5xl">
//         <header className="flex flex-wrap items-center justify-between gap-4">
//           <div>
//             <p className="font-semibold text-blue-600">
//               SMARTSCHOOL / STUDENT
//             </p>
//             <h1 className="mt-2 text-3xl font-bold text-slate-800">
//               Student Dashboard 🎓
//             </h1>
//             <p className="mt-2 text-slate-500">
//               Welcome, {name}!
//             </p>
//           </div>

//           <button
//             onClick={handleLogout}
//             className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 hover:bg-red-100"
//           >
//             Logout
//           </button>
//         </header>

//         <section className="mt-8 grid gap-5 sm:grid-cols-2">
//           <a
//             href="/attendance"
//             className="rounded-2xl border border-blue-100 bg-blue-50 p-6 hover:shadow-md"
//           >
//             <span className="text-3xl">📋</span>
//             <h2 className="mt-4 text-xl font-bold text-blue-800">
//               Attendance
//             </h2>
//             <p className="mt-2 text-slate-600">
//               Open the attendance page.
//             </p>
//           </a>

//           <a
//             href="/marks"
//             className="rounded-2xl border border-violet-100 bg-violet-50 p-6 hover:shadow-md"
//           >
//             <span className="text-3xl">📝</span>
//             <h2 className="mt-4 text-xl font-bold text-violet-800">
//               Marks & Exams
//             </h2>
//             <p className="mt-2 text-slate-600">
//               Open the marks and exams page.
//             </p>
//           </a>
//         </section>
//       </div>
//     </main>
//   );
// }


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyAnnouncements,
  getMyAttendance,
  getMyHomework,
  getMyMarks,
  getMyProfile,
  getMyTimetable,
  type Announcement,
  type AttendanceRecord,
  type Homework,
  type Mark,
  type StudentProfile,
  type TimetableDay,
} from "../../lib/api";
import { Avatar } from "../../components/student/Avatar";
import AttendanceSection from "../../components/student/AttendanceSection";
import MarksSection from "../../components/student/MarksSection";
import HomeworkSection, { dueLabel } from "../../components/student/HomeworkSection";
import AssistantSection from "../../components/student/AssistantSection";
import {
  AnnouncementList,
  AnnouncementsSection,
  ProfileSection,
  ProgressSection,
  TimetableSection,
} from "../../components/student/OtherSections";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, StatCard } from "../../components/student/ui";
import {
  dateKey,
  daysUntil,
  formatDate,
  formatLongToday,
  groupByExam,
  summarizeAttendance,
  todayName,
} from "../../components/student/studentUtils";

type View = "home" | "attendance" | "marks" | "homework" | "timetable" | "announcements" | "progress" | "assistant" | "profile";

const MENU: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Dashboard", icon: "🏠" },
  { id: "attendance", label: "My Attendance", icon: "📋" },
  { id: "marks", label: "My Mark List", icon: "📝" },
  { id: "homework", label: "My Homework", icon: "📚" },
  { id: "timetable", label: "Timetable", icon: "🗓️" },
  { id: "announcements", label: "Announcements", icon: "📢" },
  { id: "progress", label: "Study Progress", icon: "📈" },
  { id: "assistant", label: "AI Study Assistant", icon: "🤖" },
  { id: "profile", label: "My Profile", icon: "👤" },
];

interface Remote<T> {
  data: T;
  error: string;
}

interface Notice {
  id: string;
  icon: string;
  text: string;
  tone: "blue" | "green" | "red" | "amber";
}

export default function StudentDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noRecord, setNoRecord] = useState("");

  const [profile, setProfile] = useState<Remote<StudentProfile | null>>({ data: null, error: "" });
  const [attendance, setAttendance] = useState<Remote<AttendanceRecord[]>>({ data: [], error: "" });
  const [marks, setMarks] = useState<Remote<Mark[]>>({ data: [], error: "" });
  const [homework, setHomework] = useState<Remote<Homework[]>>({ data: [], error: "" });
  const [timetable, setTimetable] = useState<Remote<TimetableDay[]>>({ data: [], error: "" });
  const [announcements, setAnnouncements] = useState<Remote<Announcement[]>>({ data: [], error: "" });

  const logout = useCallback(() => {
    localStorage.removeItem("smartschool_token");
    localStorage.removeItem("smartschool_user");
    router.replace("/login");
  }, [router]);

  // 1. Same login check as before: only a logged-in student may see this page
  useEffect(() => {
    const token = localStorage.getItem("smartschool_token");
    const savedUser = localStorage.getItem("smartschool_user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      if (user.role !== "student") {
        if (user.role === "admin") router.replace("/admin");
        else if (user.role === "teacher") router.replace("/teacher");
        else router.replace("/login");
        return;
      }

      setName(user.name || "Student");
      setChecking(false);
    } catch {
      localStorage.removeItem("smartschool_token");
      localStorage.removeItem("smartschool_user");
      router.replace("/login");
    }
  }, [router]);

  // 2. Load this student's own data. The backend finds the student from the JWT token.
  const loadAll = useCallback(async () => {
    setLoading(true);
    setNoRecord("");

    const results = await Promise.allSettled([
      getMyProfile(),
      getMyAttendance(),
      getMyMarks(),
      getMyHomework(),
      getMyTimetable(),
      getMyAnnouncements(),
    ]);

    const msg = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : "Could not load data.");

    // Expired / invalid token -> back to login
    const expired = results.find((r) => r.status === "rejected" && /session expired|login again/i.test(msg(r)));
    if (expired) {
      logout();
      return;
    }

    const [p, a, m, h, t, n] = results;

    if (p.status === "fulfilled") {
      setProfile({ data: p.value.profile, error: "" });
      if (!p.value.linked) {
        setNoRecord("Your student record has not been added yet. Please ask your teacher to add you using the same email you registered with.");
      }
    } else setProfile({ data: null, error: msg(p) });

    // "No student record" is shown once as a banner, so hide the repeated errors for the other sections
    const quiet = (r: PromiseRejectedResult) => (/student record was not found/i.test(msg(r)) ? "" : msg(r));

    if (a.status === "fulfilled") setAttendance({ data: a.value.records, error: "" });
    else setAttendance({ data: [], error: quiet(a) });

    if (m.status === "fulfilled") setMarks({ data: m.value.marks, error: "" });
    else setMarks({ data: [], error: quiet(m) });

    if (h.status === "fulfilled") setHomework({ data: h.value.homework, error: "" });
    else setHomework({ data: [], error: quiet(h) });

    if (t.status === "fulfilled") setTimetable({ data: t.value.timetable, error: "" });
    else setTimetable({ data: [], error: quiet(t) });

    if (n.status === "fulfilled") setAnnouncements({ data: n.value.announcements, error: "" });
    else setAnnouncements({ data: [], error: msg(n) });

    setLoading(false);
  }, [logout]);

  useEffect(() => {
    if (!checking) loadAll();
  }, [checking, loadAll]);

  // Quietly refresh after a homework change (no full-page spinner)
  const refreshHomework = useCallback(async () => {
    try {
      const res = await getMyHomework();
      setHomework({ data: res.homework, error: "" });
    } catch (err) {
      setHomework((prev) => ({ ...prev, error: err instanceof Error ? err.message : "Could not refresh homework." }));
    }
  }, []);

  const attSummary = useMemo(() => summarizeAttendance(attendance.data), [attendance.data]);
  const exams = useMemo(() => groupByExam(marks.data), [marks.data]);
  const latestExam = exams.length ? exams[exams.length - 1] : null;
  const pendingHomework = homework.data.filter((h) => h.status === "Pending" || h.status === "Overdue");
  const upcoming = homework.data
    .filter((h) => h.status === "Pending")
    .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
    .slice(0, 4);

  // Notifications are built from the student's real data (no fake items)
  const notices = useMemo<Notice[]>(() => {
    const list: Notice[] = [];

    const latestAtt = [...attendance.data].sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))[0];
    if (latestAtt) {
      list.push(
        latestAtt.status === "Absent"
          ? { id: "att", icon: "❌", text: `You were marked Absent on ${formatDate(latestAtt.date)}.`, tone: "red" }
          : { id: "att", icon: "✅", text: `Attendance updated: Present on ${formatDate(latestAtt.date)}.`, tone: "green" }
      );
    }

    if (latestExam) {
      list.push({ id: "marks", icon: "📝", text: `Marks published for ${latestExam.name}: ${latestExam.percent}%.`, tone: "blue" });
    }

    homework.data.forEach((h) => {
      if (h.status === "Overdue") {
        list.push({ id: `o${h._id}`, icon: "⏰", text: `"${h.title}" (${h.subject}) is overdue.`, tone: "red" });
      } else if (h.status === "Pending" && daysUntil(h.dueDate) <= 2) {
        list.push({ id: `d${h._id}`, icon: "⏳", text: `"${h.title}" (${h.subject}): ${dueLabel(h.dueDate).text.toLowerCase()}.`, tone: "amber" });
      } else if (h.status === "Pending" && daysUntil(h.assignedDate) >= -7) {
        list.push({ id: `n${h._id}`, icon: "📚", text: `New homework assigned: "${h.title}" (${h.subject}).`, tone: "blue" });
      }
    });

    return list;
  }, [attendance.data, latestExam, homework.data]);

  const todaysPeriods = timetable.data
    .filter((t) => t.day === todayName())
    .flatMap((t) => t.periods)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (checking) {
    return <main className="p-10">Loading dashboard...</main>;
  }

  const displayName = profile.data?.name || name;

  // Wrap a section so it shows loading / error states consistently
  function guard(err: string, body: React.ReactNode) {
    if (loading) return <LoadingBlock />;
    if (err) return <ErrorBlock message={err} onRetry={loadAll} />;
    return body;
  }

  const toneBg: Record<Notice["tone"], string> = {
    blue: "bg-blue-50",
    green: "bg-emerald-50",
    red: "bg-red-50",
    amber: "bg-amber-50",
  };

  function renderHome() {
    return (
      <>
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-white shadow-md sm:p-8">
          <p className="text-sm text-blue-100">📅 {formatLongToday()}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome Back, {displayName}! 👋</h1>
          <p className="mt-1 text-blue-100">
            {profile.data?.className ? `Class ${profile.data.className} ${profile.data.section}`.trim() : "SmartSchool Student Portal"}
          </p>
        </div>

        {noRecord && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{noRecord}</p>}

        {loading ? (
          <div className="mt-6"><LoadingBlock label="Loading your dashboard..." /></div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="📋" label="Attendance" value={attSummary.total ? `${attSummary.percent}%` : "-"} hint={attSummary.total ? `${attSummary.present} of ${attSummary.total} days` : "No records yet"} tone={attSummary.percent >= 75 || !attSummary.total ? "green" : "amber"} />
              <StatCard icon="📝" label="Latest exam" value={latestExam ? `${latestExam.percent}%` : "-"} hint={latestExam ? latestExam.name : "No marks yet"} tone="violet" />
              <StatCard icon="📚" label="Homework to do" value={String(pendingHomework.length)} hint={pendingHomework.length ? "Pending or overdue" : "All caught up"} tone={pendingHomework.length ? "amber" : "green"} />
              <StatCard icon="📢" label="Announcements" value={String(announcements.data.length)} hint="From teachers & admin" tone="blue" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h3 className="mb-3 font-bold text-slate-800">🔔 Notifications</h3>
                {notices.length === 0 ? (
                  <p className="text-sm text-slate-500">You have no notifications right now.</p>
                ) : (
                  <ul className="space-y-2">
                    {notices.slice(0, 8).map((n) => (
                      <li key={n.id} className={`flex items-start gap-3 rounded-xl p-3 text-sm text-slate-700 ${toneBg[n.tone]}`}>
                        <span>{n.icon}</span>
                        <span>{n.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h3 className="mb-3 font-bold text-slate-800">⏳ Upcoming deadlines</h3>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">No pending homework. 🎉</p>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.map((h) => {
                      const due = dueLabel(h.dueDate);
                      return (
                        <li key={h._id} className="text-sm">
                          <p className="font-semibold text-slate-700">{h.title}</p>
                          <p className="flex items-center gap-2 text-xs text-slate-500">{h.subject} <Badge tone={due.tone}>{due.text}</Badge></p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button onClick={() => setView("homework")} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">View all homework →</button>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 font-bold text-slate-800">📢 Latest announcements</h3>
                {announcements.error ? <ErrorBlock message={announcements.error} onRetry={loadAll} /> : <AnnouncementList announcements={announcements.data} limit={3} />}
              </div>
              <div>
                <h3 className="mb-3 font-bold text-slate-800">🗓️ Today&apos;s classes ({todayName()})</h3>
                {todaysPeriods.length === 0 ? (
                  <EmptyState icon="🗓️" title="No classes found for today" />
                ) : (
                  <div className="space-y-2">
                    {todaysPeriods.map((p, i) => (
                      <Card key={`${p.startTime}-${i}`} className="flex items-center gap-3 !p-3">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{p.startTime}–{p.endTime}</span>
                        <span className="font-semibold text-slate-700">{p.subject}</span>
                        {p.teacherName && <span className="text-xs text-slate-400">{p.teacherName}</span>}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  function renderView() {
    switch (view) {
      case "home":
        return renderHome();
      case "attendance":
        return guard(attendance.error, <AttendanceSection records={attendance.data} />);
      case "marks":
        return guard(marks.error, <MarksSection marks={marks.data} profile={profile.data} />);
      case "homework":
        return guard(homework.error, <HomeworkSection homework={homework.data} onChanged={refreshHomework} />);
      case "timetable":
        return guard(timetable.error, <TimetableSection timetable={timetable.data} />);
      case "announcements":
        return guard(announcements.error, <AnnouncementsSection announcements={announcements.data} />);
      case "progress":
        return guard(attendance.error || marks.error, <ProgressSection attendance={attendance.data} marks={marks.data} />);
      case "assistant":
        return <AssistantSection />;
      case "profile":
        return guard(
          profile.error,
          profile.data ? <ProfileSection profile={profile.data} /> : <EmptyState icon="👤" title="Profile not available" />
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-100 bg-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-6 py-6">
          <p className="text-xl font-extrabold text-blue-600">🎓 SmartSchool</p>
          <p className="text-xs font-semibold tracking-wider text-slate-400">STUDENT PORTAL</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${view === item.id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={logout} className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100">
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-lg lg:hidden" aria-label="Open menu">☰</button>
            <p className="hidden text-sm text-slate-500 sm:block">📅 {formatLongToday()}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView("home")} className="relative rounded-full p-2 text-xl hover:bg-slate-100" aria-label="Notifications">
              🔔
              {notices.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notices.length > 9 ? "9+" : notices.length}
                </span>
              )}
            </button>
            <button onClick={() => setView("profile")} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100">
              <Avatar name={displayName} src={profile.data?.avatar} size={36} />
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-slate-700 sm:block">{displayName}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{renderView()}</main>
      </div>
    </div>
  );
}