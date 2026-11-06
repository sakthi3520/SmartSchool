const mongoose = require("mongoose");

const periodSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true }, // "09:00"
    endTime: { type: String, required: true, trim: true }, // "09:45"
    teacherName: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, trim: true, default: "" }, // empty = all sections
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    periods: { type: [periodSchema], default: [] },
  },
  { timestamps: true }
);

timetableSchema.index({ className: 1, section: 1, day: 1 }, { unique: true });

module.exports =
  mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);