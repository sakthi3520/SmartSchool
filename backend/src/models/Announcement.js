const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["normal", "important"], default: "normal" },
    className: { type: String, trim: true, default: "" }, // empty = whole school
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
    createdByRole: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);