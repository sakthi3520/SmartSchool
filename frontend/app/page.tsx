"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudents, getTeachers } from "@/lib/api";

type Student = {
  _id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  email: string;
  phone: string;
};

type Teacher = {
  _id: string;
  name: string;
  employeeId: string;
  subject: string;
  email: string;
  phone: string;
  qualification: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentData, teacherData] = await Promise.all([
          getStudents(),
          getTeachers(),
        ]);
        setStudents(studentData.students ?? []);
        setTeachers(teacherData.teachers ?? []);
      } catch {
        // ignore error, show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-slate-800 sm:p-8">
      {/* ===== Left: Login / Register panel ===== */}
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 px-8 py-10 text-white shadow-2xl shadow-indigo-200/50 sm:px-12 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <span className="text-3xl">🎓</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                SmartSchool
              </h1>
              <p className="text-sm font-medium uppercase tracking-widest text-emerald-200">
                School Management System
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-lg leading-relaxed text-indigo-100">
            Meet the smartest way to run your school. Manage students,
            teachers, attendance and marks — all in one secure place.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/login"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 font-bold text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">🔐</span> Login
            </a>
            <a
              href="/register"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-6 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">📝</span> Register
            </a>
          </div>

          <p className="mt-6 text-center text-xs text-indigo-200">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-semibold underline underline-offset-2 decoration-dotted"
            >
              Log in
            </a>
          </p>

          <div className="mt-8 rounded-2xl bg-white/10 p-5 backdrop-blur sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-3xl">🎓</span>
                <span className="mt-1 text-sm font-semibold">Students</span>
                <span className="text-lg font-bold">{students.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl">👩‍🏫</span>
                <span className="mt-1 text-sm font-semibold">Teachers</span>
                <span className="text-lg font-bold">{teachers.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl">📋</span>
                <span className="mt-1 text-sm font-semibold">Records</span>
                <span className="text-lg font-bold">
                  {students.length + teachers.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: subtle background decoration */}
      <div className="pointer-events-none fixed right-0 top-0 h-screen w-1/2 overflow-hidden">
        <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-24 top-40 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>
      
    </main>

  );
}

