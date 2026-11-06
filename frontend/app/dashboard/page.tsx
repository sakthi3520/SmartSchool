"use client";

import { useEffect, useState } from "react";
import {
  getStudents,
  addStudent,
  deleteStudent,
  updateStudent,
} from "@/lib/api";

type Student = {
  _id: string;
  name: string;
  admissionNo: string;
  className: string;
  section?: string;
  email: string;
  phone: string;
};

type StudentForm = {
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  email: string;
  phone: string;
};

const emptyForm: StudentForm = {
  name: "",
  admissionNo: "",
  className: "",
  section: "A",
  email: "",
  phone: "",
};

const initialStats = [
  {
    title: "Total Students",
   value: "LIVE_STUDENT_COUNT",
    icon: "🎓",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Total Teachers",
    value: "64",
    icon: "👩‍🏫",
    color: "bg-purple-100 text-purple-700",
  },
  {
    title: "Today's Attendance",
    value: "94.5%",
    icon: "📋",
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Total Classes",
    value: "32",
    icon: "🏫",
    color: "bg-orange-100 text-orange-700",
  },
];

const activities = [
  {
    name: "Arun Kumar",
    detail: "Grade 10 - Attendance marked",
    time: "09:05 AM",
    icon: "✅",
  },
  {
    name: "Priya Sharma",
    detail: "Grade 8 - New student record",
    time: "09:20 AM",
    icon: "👩‍🎓",
  },
  {
    name: "Rahul Teacher",
    detail: "Mathematics - Marks updated",
    time: "10:15 AM",
    icon: "📝",
  },
  {
    name: "School Office",
    detail: "Annual day notice published",
    time: "11:00 AM",
    icon: "📢",
  },
];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
 
  const menu = [
    { name: "Overview", icon: "🏠" },
    { name: "Students", icon: "🎓" },
    { name: "Teachers", icon: "👩‍🏫" },
    { name: "Attendance", icon: "📋" },
    { name: "Classes", icon: "🏫" },
    { name: "Examinations", icon: "📝" },
    { name: "Notices", icon: "📢" },
  ];

  // Load students from the backend when Students page is opened.
  useEffect(() => {
    

    async function loadStudents() {
      setLoading(true);
      setError("");

      try {
        const data = await getStudents();
        setStudents(data.students ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch students"
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, []);

  function handleInputChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // Save a new student through the API.
  async function handleAddStudent(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const data = await addStudent({
        name: form.name.trim(),
        admissionNo: form.admissionNo.trim().toUpperCase(),
        className: form.className.trim(),
        section: form.section,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      });

      if (data.student) {
        setStudents((current) => [
          data.student as Student,
          ...current,
        ]);
      }

      setForm(emptyForm);
      setSuccess(data.message || "Student added successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add student"
      );
    } finally {
      setSaving(false);
    }
  }
  // Update an existing student in MongoDB.
async function handleUpdateStudent(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (!editingId) return;

  setError("");
  setSuccess("");
  setSaving(true);

  try {
    const data = await updateStudent(editingId, {
      name: form.name.trim(),
      admissionNo: form.admissionNo.trim().toUpperCase(),
      className: form.className.trim(),
      section: form.section,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    });

    setStudents((current) =>
      current.map((student) =>
        student._id === editingId ? data.student! : student
      )
    );

    setForm(emptyForm);
    setEditingId("");
    setSuccess(data.message || "Student updated successfully!");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to update student"
    );
  } finally {
    setSaving(false);
  }
}

function startEditing(student: Student) {
  setEditingId(student._id);
  setError("");
  setSuccess("");

  setForm({
    name: student.name,
    admissionNo: student.admissionNo,
    className: student.className,
    section: student.section || "A",
    email: student.email,
    phone: student.phone,
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

  // Delete a student from MongoDB.
  async function handleDeleteStudent(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(id);

    try {
      const data = await deleteStudent(id);

      setStudents((current) =>
        current.filter((student) => student._id !== id)
      );

      setSuccess(data.message || "Student deleted successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete student"
      );
    } finally {
      setDeletingId("");
    }
  }
const totalClasses = new Set(
  students.map((student) => student.className)
).size;
  // const filteredStudents = students.filter((student) => {
  //   const query = search.toLowerCase();

  //   return (
  //     student.name.toLowerCase().includes(query) ||
  //     student.admissionNo.toLowerCase().includes(query) ||
  //     student.email.toLowerCase().includes(query) ||
  //     student.className.toLowerCase().includes(query)
  //   );
  // });

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      student.name.toLowerCase().includes(query) ||
      student.admissionNo.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.className.toLowerCase().includes(query);

    const matchesClass =
      classFilter === "All" || student.className === classFilter;

    return matchesSearch && matchesClass;
  });


  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      {/* Sidebar */}
      <aside className="bg-slate-900 p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <h1 className="mb-8 text-2xl font-bold">
          🎓 SmartSchool
        </h1>

        <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">
          Main Menu
        </p>

        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {menu.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActive(item.name);
                setSearch("");
                setError("");
                setSuccess("");
              }}
              className={`rounded-xl px-4 py-3 text-left text-sm transition ${
                active === item.name
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.icon} &nbsp; {item.name}
            </button>
          ))}
        </nav>

        <div className="mt-10 rounded-xl bg-slate-800 p-4">
          <p className="font-semibold">Admin Portal</p>
          <p className="mt-1 text-xs text-slate-400">
            School management
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              SmartSchool / {active}
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              {active === "Overview"
                ? "Admin Dashboard"
                : active}
            </h2>

            <p className="mt-2 text-slate-500">
              Welcome back, Admin! Here&apos;s your school summary.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
            <span className="text-2xl">👨‍💼</span>
            <div>
              <p className="font-semibold">Administrator</p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
          </div>
        </header>

        {/* Overview */}
        {active === "Overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
             {initialStats.map((stat) => (
          <div
             key={stat.title}
             className="rounded-2xl bg-white p-5 shadow-sm"
  >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
            {stat.title}
          </p>

         <span
          className={`rounded-xl p-3 text-xl ${stat.color}`}
      >
          {stat.icon}
        </span>
       </div>

          <p className="mt-4 text-3xl font-bold">
            {stat.title === "Total Students"
            ? students.length.toLocaleString("en-IN")
            : stat.title === "Total Classes"
            ? totalClasses
            : stat.value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {stat.title === "Total Students"
            ? "Students in database"
            : "Demo statistics"}
         </p>
       </div>
      ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    Recent Activities
                  </h3>
                  <span className="text-sm text-blue-600">
                    Today
                  </span>
                </div>

                <div className="space-y-5">
                  {activities.map((item) => (
                    <div
                      key={item.name + item.time}
                      className="flex items-center gap-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">
                        {item.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.detail}
                        </p>
                      </div>

                      <span className="text-xs text-slate-400">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">Quick Actions</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your school
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    ["➕", "Add Student", "Students"],
                    ["👩‍🏫", "Manage Teachers", "Teachers"],
                    ["📋", "View Attendance", "Attendance"],
                    ["📢", "Publish Notice", "Notices"],
                  ].map(([icon, label, page]) => (
                    <button
                      key={label}
                      onClick={() => setActive(page)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50"
                    >
                      <span>{icon}</span>
                      <span className="text-sm font-medium">
                        {label}
                      </span>
                      <span className="ml-auto text-slate-400">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Students: Add form and database table */}
        {active === "Students" && (
          <div className="space-y-6">
            {/* Add Student Form */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">
                 {editingId ? "✏️ Edit Student" : "➕ Add New Student"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Enter student details. The record will be saved in MongoDB.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700"
                >
                  {success}
                </div>
              )}

              <form
                onSubmit={editingId ? handleUpdateStudent : handleAddStudent}
                className="mt-5 grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Student Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admissionNo"
                    className="mb-1 block text-sm font-medium"
                  >
                    Admission Number *
                  </label>
                  <input
                    id="admissionNo"
                    name="admissionNo"
                    value={form.admissionNo}
                    onChange={handleInputChange}
                    placeholder="Example: SS1002"
                    required
                    className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="className"
                    className="mb-1 block text-sm font-medium"
                  >
                    Class *
                  </label>
                  <select
                    id="className"
                    name="className"
                    value={form.className}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select class</option>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(
                      (className) => (
                        <option key={className} value={className}>
                          Class {className}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="section"
                    className="mb-1 block text-sm font-medium"
                  >
                    Section
                  </label>
                  <select
                    id="section"
                    name="section"
                    value={form.section}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    {["A", "B", "C", "D"].map((section) => (
                      <option key={section} value={section}>
                        Section {section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium"
                  >
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="student@example.com"
                    required
                    className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium"
                  >
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    required
                    className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                   {saving
                   ? "Saving..."
                   : editingId
                    ? "Update Student"
                    : "Add Student"}
                  </button>
                  {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                    setEditingId("");
                    setForm(emptyForm);
                    setError("");
                    setSuccess("");
          }}
                    className="ml-3 rounded-xl border border-slate-300 px-6 py-3"
  >
                   Cancel
                  </button>
                )}
                </div>
              </form>
            </section>

            {/* Student list */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">
                    Student Records
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Students saved in the database: {students.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActive("Students")}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Refresh List
                </button>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, admission number, class or email..."
                className="mt-5 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />
              
               <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3"
>
              <option value="All">All Classes</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(
                (className) => (
                <option key={className} value={className}>
                Class {className}
             </option>
    )
  )}
</select>
 

              {loading && (
                <p className="mt-5 text-slate-500">
                  Loading students...
                </p>
              )}

              {!loading && !error && students.length === 0 && (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-500">
                  No students found. Use the form above to add the first student.
                </p>
              )}

              {!loading && students.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Admission No.</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Section</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr
                          key={student._id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-3 font-medium">
                            {student.name}
                          </td>
                          <td className="p-3">
                            {student.admissionNo}
                          </td>
                          <td className="p-3">
                            {student.className}
                          </td>
                          <td className="p-3">
                            {student.section || "A"}
                          </td>
                          <td className="p-3">{student.email}</td>
                          <td className="p-3">{student.phone}</td>
                          <td className="p-3">
                            
                        <button
                           type="button"
                           onClick={() => startEditing(student)}
                           className="mr-2 rounded-lg bg-blue-100 px-3 py-2 text-blue-700 hover:bg-blue-200"
>
                         Edit
                        </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteStudent(student._id)
                              }
                              disabled={deletingId === student._id}
                              className="rounded-lg bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200 disabled:opacity-60"
                            >
                              {deletingId === student._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredStudents.length === 0 && (
                    <p className="mt-4 text-slate-500">
                      No students match your search.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Other sections */}
        {active !== "Overview" && active !== "Students" && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">
              {active} Management
            </h3>
            <p className="mt-2 text-slate-500">
              This section is ready for the next development step.
            </p>
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
          SmartSchool Management System © 2026
        </footer>
      </main>
    </div>
  );
}