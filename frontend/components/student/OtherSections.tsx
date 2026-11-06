"use client";

import { useState } from "react";
import type { Announcement, AttendanceRecord, Mark, StudentProfile, TimetableDay } from "../../lib/api";
import { Avatar } from "./Avatar";
import { Badge, Bar, Card, EmptyState, Ring, SectionTitle } from "./ui";
import { formatDate, groupByExam, percentOf, summarizeAttendance, todayName, WEEK_DAYS } from "./studentUtils";

// ---------------- TIMETABLE ----------------
export function TimetableSection({ timetable }: { timetable: TimetableDay[] }) {
  const today = todayName();
  const [day, setDay] = useState(WEEK_DAYS.includes(today) ? today : "Monday");
  const periods = timetable.filter((t) => t.day === day).flatMap((t) => t.periods);
  const sorted = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      <SectionTitle title="My Timetable" subtitle="Your daily class schedule." />
      {timetable.length === 0 ? (
        <EmptyState icon="🗓️" title="Timetable not available yet" text="Your teacher or admin has not added the timetable for your class." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {WEEK_DAYS.map((d) => (
              <button key={d} onClick={() => setDay(d)} className={`rounded-full px-4 py-2 text-sm font-semibold ${d === day ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {d.slice(0, 3)}{d === today ? " •" : ""}
              </button>
            ))}
          </div>
          {sorted.length === 0 ? (
            <EmptyState icon="🌴" title={`No classes on ${day}`} />
          ) : (
            <div className="space-y-3">
              {sorted.map((p, i) => (
                <Card key={`${p.startTime}-${i}`} className="flex items-center gap-4">
                  <div className="w-28 shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700">
                    {p.startTime} – {p.endTime}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{p.subject}</p>
                    {p.teacherName && <p className="text-sm text-slate-500">👩‍🏫 {p.teacherName}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------- ANNOUNCEMENTS ----------------
export function AnnouncementList({ announcements, limit }: { announcements: Announcement[]; limit?: number }) {
  const list = limit ? announcements.slice(0, limit) : announcements;
  if (list.length === 0) {
    return <EmptyState icon="📢" title="No announcements" text="Important notices from your teachers and admin will appear here." />;
  }
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <Card key={a._id} className={a.priority === "important" ? "border-amber-300 bg-amber-50/40" : ""}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-slate-800">{a.title}</h3>
            {a.priority === "important" && <Badge tone="amber">Important</Badge>}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
          <p className="mt-2 text-xs text-slate-400">
            {a.createdByName ? `${a.createdByName}${a.createdByRole ? ` (${a.createdByRole})` : ""} · ` : ""}
            {formatDate(a.createdAt)}
          </p>
        </Card>
      ))}
    </div>
  );
}

export function AnnouncementsSection({ announcements }: { announcements: Announcement[] }) {
  return (
    <>
      <SectionTitle title="Announcements" subtitle="Important news from teachers and admin." />
      <AnnouncementList announcements={announcements} />
    </>
  );
}

// ---------------- STUDY PROGRESS ----------------
export function ProgressSection({ attendance, marks }: { attendance: AttendanceRecord[]; marks: Mark[] }) {
  const att = summarizeAttendance(attendance);
  const exams = groupByExam(marks);

  // Average % per subject across all exams
  const subjectMap = new Map<string, { obtained: number; total: number }>();
  marks.forEach((m) => {
    const s = subjectMap.get(m.subject) || { obtained: 0, total: 0 };
    s.obtained += m.marksObtained;
    s.total += m.totalMarks;
    subjectMap.set(m.subject, s);
  });
  const subjects = Array.from(subjectMap.entries())
    .map(([subject, v]) => ({ subject, percent: percentOf(v.obtained, v.total) }))
    .sort((a, b) => a.percent - b.percent);
  const needsWork = subjects.filter((s) => s.percent < 60);

  if (attendance.length === 0 && marks.length === 0) {
    return (
      <>
        <SectionTitle title="Study Progress" />
        <EmptyState icon="📈" title="No progress data yet" text="Your attendance and marks will build your progress report." />
      </>
    );
  }

  return (
    <>
      <SectionTitle title="Study Progress" subtitle="How you are doing in attendance and exams." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-2">
          <Ring percent={att.percent} label="Attendance" />
          <p className="text-sm text-slate-500">{att.present} of {att.total} days present</p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-bold text-slate-800">Exam trend</h3>
          {exams.length === 0 ? (
            <p className="text-sm text-slate-500">No exam marks yet.</p>
          ) : (
            <div className="flex h-44 items-end gap-3">
              {exams.map((e) => (
                <div key={e.name} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-600">{e.percent}%</span>
                  <div className="flex w-full flex-1 items-end rounded-lg bg-slate-50">
                    <div className="w-full rounded-lg bg-blue-500" style={{ height: `${Math.max(4, e.percent)}%` }} />
                  </div>
                  <span className="w-full truncate text-center text-xs text-slate-500" title={e.name}>{e.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold text-slate-800">Subject averages</h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500">No subject marks yet.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{s.subject}</span><b>{s.percent}%</b></div>
                  <Bar percent={s.percent} color={s.percent >= 75 ? "bg-emerald-500" : s.percent >= 60 ? "bg-blue-500" : "bg-amber-500"} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-bold text-slate-800">Where to improve</h3>
          {needsWork.length === 0 && att.percent >= 75 ? (
            <p className="text-sm text-emerald-700">🎉 Great work! No subjects need urgent attention.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {needsWork.map((s) => (
                <li key={s.subject} className="rounded-lg bg-amber-50 p-3">
                  📌 <b>{s.subject}</b>: average {s.percent}%. Spend extra time here and ask your teacher for help.
                </li>
              ))}
              {attendance.length > 0 && att.percent < 75 && (
                <li className="rounded-lg bg-red-50 p-3">🗓️ Your attendance is {att.percent}%. Try to stay above 75%.</li>
              )}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

// ---------------- PROFILE (read only) ----------------
export function ProfileSection({ profile }: { profile: StudentProfile }) {
  const fields: { label: string; value: string }[] = [
    { label: "Student name", value: profile.name },
    { label: "Admission number", value: profile.admissionNo },
    { label: "Class", value: profile.className },
    { label: "Section", value: profile.section },
    { label: "Email", value: profile.email },
    { label: "Phone number", value: profile.phone },
  ];
  return (
    <>
      <SectionTitle title="My Profile" subtitle="View only. To change any detail, please contact your teacher or admin." />
      <Card>
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:gap-5">
          <Avatar name={profile.name} src={profile.avatar} size={80} />
          <div className="text-center sm:text-left">
            <p className="text-xl font-bold text-slate-800">{profile.name}</p>
            <p className="text-sm text-slate-500">Class {profile.className || "-"} {profile.section}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{f.label}</dt>
              <dd className="mt-1 rounded-xl bg-slate-50 px-4 py-3 text-slate-700">{f.value || "-"}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}