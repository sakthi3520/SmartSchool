const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    homework: { type: mongoose.Schema.Types.ObjectId, ref: "Homework", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    submittedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

// One submission per student per homework
submissionSchema.index({ homework: 1, student: 1 }, { unique: true });

module.exports =
  mongoose.models.HomeworkSubmission ||
  mongoose.model("HomeworkSubmission", submissionSchema);