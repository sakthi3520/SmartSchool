const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

markSchema.index(
  { student: 1, examName: 1, subject: 1 },
  { unique: true }
);

markSchema.pre("validate", function () {
  if (this.marksObtained > this.totalMarks) {
    this.invalidate(
      "marksObtained",
      "Marks obtained cannot exceed total marks."
    );
  }
});

module.exports = mongoose.model("Mark", markSchema);
