// Teacher / Admin content management  ->  mounted at /api
//   /api/homework       create, update, delete, list
//   /api/announcements  create, update, delete, list
//   /api/timetable      save a day's periods, delete, list
// Students are blocked here; they read this content through /api/student-portal.

const express = require("express");
const { protect, authorize, ciExact } = require("../middleware/portalAuth");

const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmission");
const Announcement = require("../models/Announcement");
const Timetable = require("../models/Timetable");

const router = express.Router();
const staff = [protect, authorize("teacher", "admin")];

function fail(res, error, fallback) {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: Object.values(error.errors)[0].message });
  }
  if (error.name === "CastError") {
    return res.status(404).json({ success: false, message: "Record not found." });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "That record already exists." });
  }
  console.error(fallback, error.message);
  return res.status(500).json({ success: false, message: fallback });
}

function pick(body, fields) {
  const out = {};
  fields.forEach((f) => {
    if (body[f] !== undefined) out[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
  });
  return out;
}

// ---------- HOMEWORK ----------
const HOMEWORK_FIELDS = ["title", "subject", "description", "className", "section", "dueDate"];

router.get("/homework", ...staff, async (req, res) => {
  try {
    const filter = {};
    if (req.query.className) filter.className = ciExact(req.query.className);
    const homework = await Homework.find(filter).sort({ dueDate: -1 }).lean();
    res.json({ success: true, count: homework.length, homework });
  } catch (error) {
    fail(res, error, "Could not load homework.");
  }
});

router.post("/homework", ...staff, async (req, res) => {
  try {
    const data = pick(req.body, HOMEWORK_FIELDS);
    if (!data.title || !data.subject || !data.className || !data.dueDate) {
      return res.status(400).json({
        success: false,
        message: "Title, subject, class and due date are required.",
      });
    }
    if (Number.isNaN(new Date(data.dueDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date." });
    }
    const homework = await Homework.create({
      ...data,
      createdBy: req.user._id,
      createdByName: req.user.name,
    });
    res.status(201).json({ success: true, message: "Homework created.", homework });
  } catch (error) {
    fail(res, error, "Could not create homework.");
  }
});

router.put("/homework/:id", ...staff, async (req, res) => {
  try {
    const data = pick(req.body, HOMEWORK_FIELDS);
    const homework = await Homework.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!homework) return res.status(404).json({ success: false, message: "Homework not found." });
    res.json({ success: true, message: "Homework updated.", homework });
  } catch (error) {
    fail(res, error, "Could not update homework.");
  }
});

router.delete("/homework/:id", ...staff, async (req, res) => {
  try {
    const homework = await Homework.findByIdAndDelete(req.params.id);
    if (!homework) return res.status(404).json({ success: false, message: "Homework not found." });
    await HomeworkSubmission.deleteMany({ homework: homework._id });
    res.json({ success: true, message: "Homework deleted." });
  } catch (error) {
    fail(res, error, "Could not delete homework.");
  }
});

// ---------- ANNOUNCEMENTS ----------
const ANNOUNCEMENT_FIELDS = ["title", "message", "priority", "className"];

router.get("/announcements", ...staff, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    fail(res, error, "Could not load announcements.");
  }
});

router.post("/announcements", ...staff, async (req, res) => {
  try {
    const data = pick(req.body, ANNOUNCEMENT_FIELDS);
    if (!data.title || !data.message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }
    const announcement = await Announcement.create({
      ...data,
      createdBy: req.user._id,
      createdByName: req.user.name,
      createdByRole: req.user.role,
    });
    res.status(201).json({ success: true, message: "Announcement posted.", announcement });
  } catch (error) {
    fail(res, error, "Could not post announcement.");
  }
});

router.put("/announcements/:id", ...staff, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      pick(req.body, ANNOUNCEMENT_FIELDS),
      { new: true, runValidators: true }
    );
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found." });
    res.json({ success: true, message: "Announcement updated.", announcement });
  } catch (error) {
    fail(res, error, "Could not update announcement.");
  }
});

router.delete("/announcements/:id", ...staff, async (req, res) => {
  try {
    const removed = await Announcement.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: "Announcement not found." });
    res.json({ success: true, message: "Announcement deleted." });
  } catch (error) {
    fail(res, error, "Could not delete announcement.");
  }
});

// ---------- TIMETABLE ----------
router.get("/timetable", ...staff, async (req, res) => {
  try {
    const filter = {};
    if (req.query.className) filter.className = ciExact(req.query.className);
    const timetable = await Timetable.find(filter).lean();
    res.json({ success: true, count: timetable.length, timetable });
  } catch (error) {
    fail(res, error, "Could not load timetable.");
  }
});

// Save (create or replace) one day's periods for a class/section
async function saveTimetable(req, res) {
  try {
    const { className, section = "", day, periods } = req.body;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (
      typeof className !== "string" ||
      !className.trim() ||
      typeof section !== "string" ||
      !days.includes(day) ||
      !Array.isArray(periods)
    ) {
      return res.status(400).json({ success: false, message: "Class, day and periods are required." });
    }
    const timetable = await Timetable.findOneAndUpdate(
      { className: className.trim(), section: section.trim(), day },
      { $set: { periods } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: "Timetable saved.", timetable });
  } catch (error) {
    fail(res, error, "Could not save timetable.");
  }
}

router.put("/timetable", ...staff, saveTimetable);
router.post("/timetable", ...staff, saveTimetable);

router.delete("/timetable/:id", ...staff, async (req, res) => {
  try {
    const removed = await Timetable.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: "Timetable not found." });
    res.json({ success: true, message: "Timetable deleted." });
  } catch (error) {
    fail(res, error, "Could not delete timetable.");
  }
});

module.exports = router;