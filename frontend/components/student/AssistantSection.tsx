"use client";

import { useEffect, useRef, useState } from "react";
import { askStudyAssistant, type ChatMessage } from "../../lib/api";
import { Card, SectionTitle } from "./ui";

const QUICK_PROMPTS = [
  { label: "💡 Explain a concept", text: "Explain this in simple words with an example: " },
  { label: "📝 Practice quiz", text: "Create a 5 question practice quiz on: " },
  { label: "🧩 Help with homework", text: "I am stuck on my homework. Please guide me with hints, not the answer: " },
];

export default function AssistantSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await askStudyAssistant(next);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionTitle title="AI Study Assistant" subtitle="Ask subject questions, get simple explanations and practice quizzes. For homework, it gives hints, not answers." />

      <Card className="flex h-[65vh] min-h-[420px] flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              <div className="text-4xl">🤖</div>
              <p className="mt-3 font-semibold text-slate-700">Hi! What would you like to learn today?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q.label} onClick={() => setInput(q.text)} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && <div className="text-sm text-slate-400">Thinking...</div>}
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Type your question..."
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
          />
          <button onClick={send} disabled={loading || !input.trim()} className="self-end rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            Send
          </button>
        </div>
      </Card>
    </>
  );
}