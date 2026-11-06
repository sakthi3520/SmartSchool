
"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Student = {
  _id: string;
  name: string;
  admissionNo: string;
  className?: string;
  section?: string;
};

type MarkRecord = {
  _id: string;
  student: Student | string;
  examName: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
};

type MarkForm = {
  studentId: string;
  examName: string;
  subject: string;
  marksObtained: string;
  totalMarks: string;
};

const emptyForm: MarkForm = {
  studentId: "",
  examName: "",
  subject: "",
  marksObtained: "",
  totalMarks: "100",
};

export default function MarksPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [form, setForm] = useState<MarkForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

   try {
  const token = localStorage.getItem("smartschool_token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const [studentResponse, markResponse] = await Promise.all([
    fetch(`${API}/students`, { headers }),
    fetch(`${API}/marks`, { headers }),
  ]);

      if (!studentResponse.ok || !markResponse.ok) {
        throw new Error("Failed to load students or marks.");
      }

      const studentData = await studentResponse.json();
      const markData = await markResponse.json();

      setStudents(
        Array.isArray(studentData)
          ? studentData
          : studentData.students || studentData.data || []
      );

      setMarks(markData.marks || markData.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(
    field: keyof MarkForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const obtained = Number(form.marksObtained);
    const total = Number(form.totalMarks);

    if (!form.studentId) {
      setError("Please select a student.");
      return;
    }

    if (obtained < 0 || total <= 0 || obtained > total) {
      setError("Enter valid marks. Obtained marks cannot exceed total marks.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `${API}/marks/${editingId}`
        : `${API}/marks`;

      const token = localStorage.getItem("smartschool_token");

const response = await fetch(url, {
  method: editingId ? "PUT" : "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
        body: JSON.stringify({
          studentId: form.studentId,
          examName: form.examName.trim(),
          subject: form.subject.trim(),
          marksObtained: obtained,
          totalMarks: total,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to save marks."
        );
      }

      setMessage(
        editingId
          ? "Marks updated successfully!"
          : "Marks saved successfully!"
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record: MarkRecord) {
    const studentId =
      typeof record.student === "string"
        ? record.student
        : record.student._id;

    setForm({
      studentId,
      examName: record.examName,
      subject: record.subject,
      marksObtained: String(record.marksObtained),
      totalMarks: String(record.totalMarks),
    });

    setEditingId(record._id);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete these marks?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("smartschool_token");

const response = await fetch(`${API}/marks/${id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to delete marks."
        );
      }

      setMessage("Marks deleted successfully!");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete marks."
      );
    }
  }

  function getStudentName(record: MarkRecord) {
    if (typeof record.student === "string") {
      return record.student;
    }

    return record.student?.name || "Unknown student";
  }

  function getPercentage(record: MarkRecord) {
    if (!record.totalMarks) return "0.00";

    return (
      (record.marksObtained / record.totalMarks) *
      100
    ).toFixed(2);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              SmartSchool
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Marks & Exams
            </h1>

            <p className="mt-2 text-slate-500">
              Manage student exam marks and percentages.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/attendance"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Attendance
            </a>

            <a
              href="/"
              className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
            >
              Dashboard
            </a>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Students
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {students.length}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Marks Records
            </p>

            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {marks.length}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Subjects Recorded
            </p>

            <h2 className="mt-2 text-3xl font-bold text-purple-600">
              {new Set(marks.map((mark) => mark.subject)).size}
            </h2>
          </div>

        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-6 text-xl font-bold text-slate-900">
            {editingId ? "Edit Student Marks" : "Add Student Marks"}
          </h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl bg-green-50 p-4 text-green-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Student
              </label>

              <select
                required
                value={form.studentId}
                onChange={(event) =>
                  updateForm("studentId", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="">Select Student</option>

                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.admissionNo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Exam Name
              </label>

              <input
                required
                value={form.examName}
                onChange={(event) =>
                  updateForm("examName", event.target.value)
                }
                placeholder="Example: Quarterly Exam"
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Subject
              </label>

              <input
                required
                value={form.subject}
                onChange={(event) =>
                  updateForm("subject", event.target.value)
                }
                placeholder="Example: Mathematics"
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Total Marks
              </label>

              <input
                required
                type="number"
                min="1"
                value={form.totalMarks}
                onChange={(event) =>
                  updateForm("totalMarks", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Marks Obtained
              </label>

              <input
                required
                type="number"
                min="0"
                value={form.marksObtained}
                onChange={(event) =>
                  updateForm("marksObtained", event.target.value)
                }
                placeholder="Enter marks"
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end gap-3">

              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Marks"
                    : "Save Marks"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}

            </div>

          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Exam Marks Records
            </h2>

            <button
              onClick={loadData}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading marks...
            </p>
          ) : marks.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No marks records found. Add student marks above.
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px] border-collapse text-left">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Student
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Exam
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Subject
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Marks
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Percentage
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {marks.map((record) => (
                    <tr
                      key={record._id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-4 font-medium text-slate-900">
                        {getStudentName(record)}
                      </td>

                      <td className="p-4 text-slate-600">
                        {record.examName}
                      </td>

                      <td className="p-4 text-slate-600">
                        {record.subject}
                      </td>

                      <td className="p-4 font-semibold text-slate-900">
                        {record.marksObtained} / {record.totalMarks}
                      </td>

                      <td className="p-4 font-semibold text-blue-600">
                        {getPercentage(record)}%
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">

                          <button
                            onClick={() => handleEdit(record)}
                            className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(record._id)}
                            className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}
