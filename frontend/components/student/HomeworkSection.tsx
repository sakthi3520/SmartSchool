"use client";

import { useState } from "react";
import { submitMyHomework, undoMyHomework, type Homework } from "../../lib/api";
import { Badge, Card, EmptyState, SectionTitle } from "./ui";
import { daysUntil, formatDate } from "./studentUtils";

type Filter = "All" | "Pending" | "Submitted" | "Overdue";

export function dueLabel(dueDate: string): { text: string; tone: "red" | "amber" | "slate" } {
  const d = daysUntil(dueDate);
  if (d < 0) return { text: `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`, tone: "red" };
  if (d === 0) return { text: "Due today", tone: "red" };
  if (d === 1) return { text: "Due tomorrow", tone: "amber" };
  if (d <= 3) return { text: `Due in ${d} days`, tone: "amber" };
  return { text: `Due in ${d} days`, tone: "slate" };
}

export default function HomeworkSection({ homework, onChanged }: { homework: Homework[]; onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const filters: Filter[] = ["All", "Pending", "Submitted", "Overdue"];
  const visible = homework.filter((h) => filter === "All" || h.status === filter);

  async function toggle(h: Homework) {
    setBusyId(h._id);
    setMessage("");
    try {
      if (h.status === "Submitted") await undoMyHomework(h._id);
      else await submitMyHomework(h._id);
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update homework.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <SectionTitle title="My Homework" subtitle="Homework assigned by your teachers." />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = f === "All" ? homework.length : homework.filter((h) => h.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === f ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {message && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      {homework.length === 0 ? (
        <EmptyState icon="📚" title="No homework assigned" text="New homework from your teachers will appear here." />
      ) : visible.length === 0 ? (
        <EmptyState icon="🎉" title={`No ${filter.toLowerCase()} homework`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((h) => {
            const due = dueLabel(h.dueDate);
            const status = h.status || "Pending";
            const soon = status === "Pending" && (due.tone === "amber" || due.tone === "red");
            return (
              <Card key={h._id} className={soon ? "border-amber-300 ring-1 ring-amber-200" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{h.subject}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-800">{h.title}</h3>
                  </div>
                  <Badge tone={status === "Submitted" ? "green" : status === "Overdue" ? "red" : "amber"}>{status}</Badge>
                </div>

                {h.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{h.description}</p>}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>Assigned: {formatDate(h.assignedDate)}</span>
                  <span>Due: <b>{formatDate(h.dueDate)}</b></span>
                  {h.createdByName && <span>By: {h.createdByName}</span>}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {status === "Submitted" ? (
                    <span className="text-sm text-emerald-600">✓ Submitted{h.submittedAt ? ` on ${formatDate(h.submittedAt)}` : ""}</span>
                  ) : (
                    <Badge tone={due.tone}>{due.text}</Badge>
                  )}
                  <button
                    disabled={busyId === h._id}
                    onClick={() => toggle(h)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${status === "Submitted" ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {busyId === h._id ? "Saving..." : status === "Submitted" ? "Undo" : "Mark as submitted"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}