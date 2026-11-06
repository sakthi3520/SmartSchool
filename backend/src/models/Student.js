const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    admissionNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      enum: ["A", "B", "C", "D"],
      default: "A",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
