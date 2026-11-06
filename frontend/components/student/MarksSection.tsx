"use client";

import { useMemo, useState } from "react";
import type { Mark, StudentProfile } from "../../lib/api";
import { Badge, Bar, Card, EmptyState, SectionTitle, StatCard } from "./ui";
import { gradeFor, groupByExam, isPass, percentOf, PASS_PERCENT } from "./studentUtils";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function MarksSection({ marks, profile }: { marks: Mark[]; profile: StudentProfile | null }) {
  const exams = useMemo(() => groupByExam(marks), [marks]);
  const [selected, setSelected] = useState<string>("");

  if (exams.length === 0) {
    return (
      <>
        <SectionTitle title="My Mark List" subtitle="View only. Your teacher publishes your marks." />
        <EmptyState icon="📝" title="No marks published yet" text="Your exam marks will appear here after your teacher adds them." />
      </>
    );
  }

  // Default to the latest exam
  const currentName = exams.some((e) => e.name === selected) ? selected : exams[exams.length - 1].name;
  const currentIndex = exams.findIndex((e) => e.name === currentName);
  const current = exams[currentIndex];
  const previous = currentIndex > 0 ? exams[currentIndex - 1] : null;
  const grade = gradeFor(current.percent);
  const passed = isPass(current.percent);

  function rowsFor(list: Mark[]) {
    return list.map((m) => {
      const percent = percentOf(m.marksObtained, m.totalMarks);
      return { ...m, percent, grade: gradeFor(percent), pass: isPass(percent) };
    });
  }
  const rows = rowsFor(current.marks);

  function downloadCsv() {
    const lines = [
      ["Exam", "Subject", "Maximum", "Obtained", "Percentage", "Grade", "Result"],
      ...rows.map((r) => [current.name, r.subject, r.totalMarks, r.marksObtained, r.percent, r.grade, r.pass ? "Pass" : "Fail"]),
      ["Total", "", current.total, current.obtained, current.percent, grade, passed ? "Pass" : "Fail"],
    ];
    const csv = lines.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mark-report-${current.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      alert("Please allow pop-ups to print your mark report.");
      return;
    }
    const body = rows
      .map((r) => `<tr><td>${esc(r.subject)}</td><td>${r.totalMarks}</td><td>${r.marksObtained}</td><td>${r.percent}%</td><td>${r.grade}</td><td>${r.pass ? "Pass" : "Fail"}</td></tr>`)
      .join("");
    win.document.write(`<!doctype html><html><head><title>Mark Report</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}th{background:#f1f5f9}.meta{color:#64748b;margin:4px 0}tfoot td{font-weight:bold}</style></head><body>
<h1>SmartSchool - Mark Report</h1>
<p class="meta">Student: <b>${esc(profile?.name || "")}</b> &nbsp; Admission No: ${esc(profile?.admissionNo || "-")} &nbsp; Class: ${esc(profile?.className || "-")} ${esc(profile?.section || "")}</p>
<p class="meta">Exam: <b>${esc(current.name)}</b></p>
<table><thead><tr><th>Subject</th><th>Maximum</th><th>Obtained</th><th>Percentage</th><th>Grade</th><th>Result</th></tr></thead><tbody>${body}</tbody>
<tfoot><tr><td>Total</td><td>${current.total}</td><td>${current.obtained}</td><td>${current.percent}%</td><td>${grade}</td><td>${passed ? "Pass" : "Fail"}</td></tr></tfoot></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  }

  const prevMap = new Map((previous?.marks || []).map((m) => [m.subject, percentOf(m.marksObtained, m.totalMarks)]));
  const delta = previous ? Math.round((current.percent - previous.percent) * 10) / 10 : 0;

  return (
    <>
      <SectionTitle title="My Mark List" subtitle="View only. Your teacher publishes your marks." />

      <div className="mb-5 flex flex-wrap gap-2">
        {exams.map((e) => (
          <button
            key={e.name}
            onClick={() => setSelected(e.name)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${e.name === currentName ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🧮" label="Total marks" value={`${current.obtained} / ${current.total}`} tone="blue" />
        <StatCard icon="📊" label="Percentage" value={`${current.percent}%`} tone="violet" />
        <StatCard icon="🏅" label="Grade" value={grade} tone="amber" />
        <StatCard icon={passed ? "✅" : "⚠️"} label="Result" value={passed ? "Pass" : "Fail"} tone={passed ? "green" : "red"} hint={`Pass mark: ${PASS_PERCENT}%`} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800">{current.name}: subject-wise marks</h3>
          <div className="flex gap-2">
            <button onClick={downloadCsv} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">⬇ Download</button>
            <button onClick={printReport} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">🖨 Print report</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 font-medium">Subject</th>
                <th className="py-2 font-medium">Exam</th>
                <th className="py-2 font-medium">Maximum</th>
                <th className="py-2 font-medium">Obtained</th>
                <th className="py-2 font-medium">%</th>
                <th className="py-2 font-medium">Grade</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-slate-50">
                  <td className="py-2.5 font-medium text-slate-700">{r.subject}</td>
                  <td className="py-2.5 text-slate-500">{r.examName}</td>
                  <td className="py-2.5">{r.totalMarks}</td>
                  <td className="py-2.5 font-semibold">{r.marksObtained}</td>
                  <td className="py-2.5">{r.percent}%</td>
                  <td className="py-2.5 font-semibold">{r.grade}</td>
                  <td className="py-2.5"><Badge tone={r.pass ? "green" : "red"}>{r.pass ? "Pass" : "Fail"}</Badge></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold text-slate-800">
                <td className="py-2.5">Total</td>
                <td />
                <td className="py-2.5">{current.total}</td>
                <td className="py-2.5">{current.obtained}</td>
                <td className="py-2.5">{current.percent}%</td>
                <td className="py-2.5">{grade}</td>
                <td className="py-2.5"><Badge tone={passed ? "green" : "red"}>{passed ? "Pass" : "Fail"}</Badge></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold text-slate-800">Subject-wise performance</h3>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r._id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{r.subject}</span>
                  <b className="text-slate-700">{r.percent}%</b>
                </div>
                <Bar percent={r.percent} color={r.percent >= 75 ? "bg-emerald-500" : r.pass ? "bg-blue-500" : "bg-red-500"} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 font-bold text-slate-800">Compared with previous exam</h3>
          {!previous ? (
            <p className="mt-2 text-sm text-slate-500">This is your first exam, so there is nothing to compare yet.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">
                {previous.name} ({previous.percent}%) → {current.name} ({current.percent}%){" "}
                <b className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</b>
              </p>
              <div className="space-y-3">
                {rows.map((r) => {
                  const before = prevMap.get(r.subject);
                  return (
                    <div key={r._id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-600">{r.subject}</span>
                        <span className="text-slate-500">
                          {before === undefined ? "new" : `${before}%`} → <b className="text-slate-700">{r.percent}%</b>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {before !== undefined && <Bar percent={before} color="bg-slate-300" />}
                        <Bar percent={r.percent} color="bg-blue-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-slate-300" /> Previous</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Current</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}