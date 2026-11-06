"use client";

import type { AttendanceRecord } from "../../lib/api";
import { formatDate, summarizeAttendance } from "./studentUtils";
import { Badge, Card, EmptyState, SectionTitle, StatCard } from "./ui";

export default function AttendanceSection({ records }: { records: AttendanceRecord[] }) {
  const summary = summarizeAttendance(records);
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <SectionTitle title="My Attendance" subtitle="Review your attendance record." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="📅" label="Total Days" value={String(summary.total)} />
        <StatCard icon="✅" label="Present" value={String(summary.present)} tone="green" />
        <StatCard
          icon="📊"
          label="Attendance"
          value={`${summary.percent}%`}
          hint={`${summary.absent} ${summary.absent === 1 ? "day" : "days"} absent`}
          tone={summary.percent >= 75 ? "green" : "amber"}
        />
      </div>

      {sortedRecords.length === 0 ? (
        <EmptyState icon="📋" title="No attendance records yet" />
      ) : (
        <Card>
          <h3 className="mb-4 font-bold text-slate-800">Attendance history</h3>
          <div className="divide-y divide-slate-100">
            {sortedRecords.map((record) => (
              <div key={record._id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-slate-700">{formatDate(record.date)}</span>
                <Badge tone={record.status === "Present" ? "green" : "red"}>{record.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
