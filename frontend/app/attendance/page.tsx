
"use client";

import { useEffect, useState } from "react";
import { getAttendance, getStudents, saveAttendance, type AttendanceStatus, type AttendanceRecord } from "@/lib/api";

type Student = {
  _id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
};

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [date, setDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStudents() {
    try {
      const data = await getStudents();
      setStudents(data.students ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load students."
      );
    }
  }

  async function loadAttendance(selectedDate: string) {
    setLoading(true);
    setError("");
    setMessage("");
    setStatuses({});

    try {
      const data = await getAttendance(selectedDate);

      const savedStatuses: Record<string, AttendanceStatus> = {};

      (data.records as AttendanceRecord[]).forEach((record) => {
        const studentId =
          typeof record.student === "string"
            ? record.student
            : record.student?._id;

        if (studentId) {
          savedStatuses[studentId] = record.status;
        }
      });

      setStatuses(savedStatuses);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadAttendance(date);
  }, [date]);

  async function handleSaveAttendance(studentId: string) {
    const status = statuses[studentId];

    if (!status) {
      setError("Please select Present or Absent first.");
      return;
    }

    setSavingId(studentId);
    setError("");
    setMessage("");

    try {
      await saveAttendance(studentId, date, status);
      setMessage("Attendance saved successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save attendance."
      );
    } finally {
      setSavingId("");
    }
  }

  const presentCount = Object.values(statuses).filter(
    (status) => status === "Present"
  ).length;

  const absentCount = Object.values(statuses).filter(
    (status) => status === "Absent"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              SMARTSCHOOL / ATTENDANCE
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Attendance Management 📋
            </h1>
            <p className="mt-2 text-slate-500">
              Mark and manage daily student attendance.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Back to Dashboard
          </a>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Students</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {students.length}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Present</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {presentCount}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Absent</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {absentCount}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Daily Attendance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a date and mark each student.
              </p>
            </div>

            <label className="text-sm font-medium">
              Attendance Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 block rounded-xl border p-3"
              />
            </label>
          </div>

          {message && (
            <div className="mb-4 rounded-xl bg-green-50 p-4 text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading attendance...
            </p>
          ) : students.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No students found. Add students from the main dashboard first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Admission No.</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Attendance Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student._id} className="border-b">
                      <td className="p-3 font-medium">
                        {student.admissionNo}
                      </td>

                      <td className="p-3">{student.name}</td>

                      <td className="p-3">
                        {student.className} - {student.section}
                      </td>

                      <td className="p-3">
                        <select
                          value={statuses[student._id] ?? ""}
                          onChange={(e) =>
                            setStatuses((previous) => ({
                              ...previous,
                              [student._id]: e.target.value as AttendanceStatus,
                            }))
                          }
                          className="rounded-lg border bg-white p-2"
                        >
                          <option value="">Select status</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() => handleSaveAttendance(student._id)}
                          disabled={
                            !statuses[student._id] ||
                            savingId === student._id
                          }
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingId === student._id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm text-slate-500">
            Select a status and press Save for each student. Saved attendance
            can be loaded again by selecting the same date.
          </p>
        </section>
      </div>
    </main>
  );
}
