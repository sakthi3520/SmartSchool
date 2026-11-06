const mongoose = require("mongoose");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

// Get attendance for a selected date
exports.getAttendance = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a date in YYYY-MM-DD format.",
      });
    }

    const records = await Attendance.find({ date })
      .populate("student", "name admissionNo className section")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Get attendance error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
    });
  }
};

// Mark or update one student's attendance
exports.saveAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid student.",
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date.",
      });
    }

    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present or Absent.",
      });
    }

    const studentExists = await Student.exists({ _id: studentId });

    if (!studentExists) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      { $set: { status } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Attendance saved successfully!",
      record,
    });
  } catch (error) {
    console.error("Save attendance error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save attendance.",
    });
  }
};
