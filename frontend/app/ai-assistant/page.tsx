"use client";

import { useState } from "react";

export default function AIAssistantPage() {
  const [message, setMessage] = useState("");

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="mb-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Dashboard
        </a>

        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
            SmartSchool Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            AI Assistant 🤖
          </h1>
          <p className="mt-2 text-slate-500">
            Your smart helper for school management and student learning.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-indigo-50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white">
              🤖
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                SmartSchool AI
              </h2>
              <p className="text-sm text-slate-500">
                AI connection will be added in the next stage.
              </p>
            </div>
          </div>

          <div className="mb-6 min-h-64 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="max-w-lg rounded-2xl rounded-tl-none bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-800">
                Hello! 👋 Welcome to SmartSchool AI.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                I will help with student performance, attendance,
                marks analysis and school-related questions.
              </p>
            </div>
            <p className="mt-5 text-center text-xs text-slate-400">
              Your conversation will appear here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask SmartSchool AI something..."
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              disabled={!message.trim()}
              className="rounded-xl bg-indigo-600 px-7 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                alert("AI connection will be implemented in the next stage.");
              }}
            >
              Send ↑
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            AI responses are not connected yet. Backend integration comes next.
          </p>
        </section>
      </div>
    </main>
  );
}