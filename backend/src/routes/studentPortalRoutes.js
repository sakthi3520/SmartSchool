// Student Portal API  ->  mounted at /api/student-portal
// Every route here is student-only. The student is identified from the JWT (never from the URL/body).

const express = require("express");
const { protect, authorize, attachOwnStudent, ciExact } = require("../middleware/portalAuth");

const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmission");
const Announcement = require("../models/Announcement");
const Timetable = require("../models/Timetable");

const router = express.Router();

router.use(protect, authorize("student"), attachOwnStudent);

// Helper: stop early when the account has no matching student record yet
function requireStudentRecord(req, res) {
  if (!req.studentRecord) {
    res.status(404).json({
      success: false,
      code: "NO_STUDENT_RECORD",
      message:
        "Your student record was not found. Please ask your teacher to add you using the same email you registered with.",
    });
    return false;
  }
  return true;
}

// Class / section filter used by homework, timetable and announcements
function classFilter(student) {
  return {
    className: ciExact(student.className),
    section: { $in: ["", ciExact(student.section || "")] },
  };
}

// ---------- PROFILE (read only) ----------
router.get("/me", (req, res) => {
  const s = req.studentRecord;
  res.json({
    success: true,
    linked: Boolean(s),
    profile: {
      name: s?.name || req.user.name,
      admissionNo: s?.admissionNo || "",
      className: s?.className || "",
      section: s?.section || "",
      email: s?.email || req.user.email,
      phone: s?.phone || req.user.mobile || "",
      avatar: s?.avatar || s?.photo || "",
    },
  });
});

// ---------- ATTENDANCE (read only) ----------
router.get("/attendance", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;
    const records = await Attendance.find({ student: req.studentRecord._id })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, count: records.length, records });
  } catch (error) {
    console.error("Portal attendance error:", error.message);
    res.status(500).json({ success: false, message: "Could not load attendance." });
  }
});

// ---------- MARKS (read only) ----------
router.get("/marks", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;
    const marks = await Mark.find({ student: req.studentRecord._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, count: marks.length, marks });
  } catch (error) {
    console.error("Portal marks error:", error.message);
    res.status(500).json({ success: false, message: "Could not load marks." });
  }
});

// ---------- HOMEWORK ----------
router.get("/homework", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;

    const homework = await Homework.find(classFilter(req.studentRecord)).sort({ dueDate: 1 }).lean();
    const submissions = await HomeworkSubmission.find({
      student: req.studentRecord._id,
      homework: { $in: homework.map((h) => h._id) },
    }).lean();

    const submittedMap = new Map(submissions.map((s) => [String(s.homework), s]));
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const items = homework.map((h) => {
      const sub = submittedMap.get(String(h._id));
      let status = "Pending";
      if (sub) status = "Submitted";
      else if (new Date(h.dueDate) < startOfToday) status = "Overdue";
      return { ...h, status, submittedAt: sub ? sub.submittedAt : null, note: sub ? sub.note : "" };
    });

    res.json({ success: true, count: items.length, homework: items });
  } catch (error) {
    console.error("Portal homework error:", error.message);
    res.status(500).json({ success: false, message: "Could not load homework." });
  }
});

// Student marks THEIR OWN homework as submitted (no file upload: the backend has no upload storage)
router.post("/homework/:id/submit", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;

    const homework = await Homework.findOne({ _id: req.params.id, ...classFilter(req.studentRecord) });
    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }

    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 500) : "";

    await HomeworkSubmission.findOneAndUpdate(
      { homework: homework._id, student: req.studentRecord._id },
      { $set: { submittedAt: new Date(), note } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Homework marked as submitted." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }
    console.error("Portal submit error:", error.message);
    res.status(500).json({ success: false, message: "Could not submit homework." });
  }
});

// Undo a submission (student's own only)
router.delete("/homework/:id/submit", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;
    await HomeworkSubmission.deleteOne({
      homework: req.params.id,
      student: req.studentRecord._id,
    });
    res.json({ success: true, message: "Submission removed." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }
    res.status(500).json({ success: false, message: "Could not update homework." });
  }
});

// ---------- TIMETABLE ----------
router.get("/timetable", async (req, res) => {
  try {
    if (!requireStudentRecord(req, res)) return;
    const days = await Timetable.find(classFilter(req.studentRecord)).lean();
    res.json({ success: true, count: days.length, timetable: days });
  } catch (error) {
    console.error("Portal timetable error:", error.message);
    res.status(500).json({ success: false, message: "Could not load timetable." });
  }
});

// ---------- ANNOUNCEMENTS (whole school + own class) ----------
router.get("/announcements", async (req, res) => {
  try {
    const own = req.studentRecord;
    const audience = [{ className: "" }];
    if (own && own.className) audience.push({ className: ciExact(own.className) });

    const announcements = await Announcement.find({ $or: audience })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    console.error("Portal announcements error:", error.message);
    res.status(500).json({ success: false, message: "Could not load announcements." });
  }
});

// ---------- AI STUDY ASSISTANT ----------
// The AI key lives ONLY in backend/.env  ->  ANTHROPIC_API_KEY=...   (optional: AI_MODEL=...)
const aiUsage = new Map(); // userId -> [timestamps]  (simple in-memory rate limit)
const AI_LIMIT = 20;
const AI_WINDOW_MS = 10 * 60 * 1000;

router.post("/assistant", async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "The AI Study Assistant is not set up yet. Please ask your admin.",
      });
    }

    const key = String(req.user._id);
    const now = Date.now();
    const recent = (aiUsage.get(key) || []).filter((t) => now - t < AI_WINDOW_MS);
    if (recent.length >= AI_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "You have asked a lot of questions. Please take a short break and try again.",
      });
    }
    recent.push(now);
    aiUsage.set(key, recent);

    const incoming = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = incoming
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ success: false, message: "Please type a question." });
    }

    const own = req.studentRecord;
    const system = [
      "You are the SmartSchool Study Assistant, a friendly tutor for school students.",
      own ? `The student is in class ${own.className}${own.section ? " " + own.section : ""}.` : "",
      "Explain concepts in simple, clear language with short examples.",
      "When asked for a practice quiz, create 5 questions (mix of MCQ and short answer) and give the answers at the END after a line saying 'Answers'.",
      "If the student asks for homework help, guide them with hints, steps and similar examples. Do NOT simply give the final answer to their homework; ask them to try the next step themselves.",
      "Stay on school subjects and study skills. Politely decline unrelated or unsafe requests.",
      "Keep answers concise and encouraging.",
    ]
      .filter(Boolean)
      .join(" ");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "claude-sonnet-5-5",
          max_tokens: 900,
          system,
          messages,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.error("AI provider error status:", response.status);
      return res.status(502).json({
        success: false,
        message: "The assistant is busy right now. Please try again in a moment.",
      });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    res.json({ success: true, reply: reply || "Sorry, I could not think of an answer. Please try again." });
  } catch (error) {
    console.error("Portal assistant error:", error.message);
    res.status(500).json({ success: false, message: "The assistant could not answer right now." });
  }
});

module.exports = router;