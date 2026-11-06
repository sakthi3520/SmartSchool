const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    className: { type: String, required: true, trim: true },
    section: { type: String, trim: true, default: "" }, // empty = all sections of the class
    assignedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);