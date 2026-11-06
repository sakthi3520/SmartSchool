const mongoose = require("mongoose");
const Student = require("../models/Student");
const Mark = require("../models/Mark");

// Get all marks, optionally filter by student
exports.getMarks = async (req, res) => {
  try {
    const { studentId } = req.query;
    const filter = {};

    if (studentId) {
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      filter.student = studentId;
    }

    const marks = await Mark.find(filter)
      .populate("student", "name admissionNo className section")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: marks.length,
      marks,
    });
  } catch (error) {
    console.error("Get marks error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch marks.",
    });
  }
};

// Add exam marks
exports.addMark = async (req, res) => {
  try {
    const { studentId, examName, subject, marksObtained, totalMarks } =
      req.body;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid student.",
      });
    }

    if (
      typeof examName !== "string" ||
      !examName.trim() ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Exam name and subject are required.",
      });
    }

    const obtained = Number(marksObtained);
    const total = Number(totalMarks);

    if (
      marksObtained === "" ||
      marksObtained === null ||
      marksObtained === undefined ||
      totalMarks === "" ||
      totalMarks === null ||
      totalMarks === undefined ||
      !Number.isFinite(obtained) ||
      !Number.isFinite(total) ||
      total <= 0 ||
      obtained < 0 ||
      obtained > total
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid marks. Obtained marks cannot exceed total marks.",
      });
    }

    const studentExists = await Student.exists({ _id: studentId });

    if (!studentExists) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const mark = await Mark.create({
      student: studentId,
      examName: examName.trim(),
      subject: subject.trim(),
      marksObtained: obtained,
      totalMarks: total,
    });

    res.status(201).json({
      success: true,
      message: "Marks saved successfully!",
      mark,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Marks for this subject and exam already exist for this student.",
      });
    }

    console.error("Add marks error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save marks.",
    });
  }
};

// Update exam marks
exports.updateMark = async (req, res) => {
  try {
    const { id } = req.params;
    const { examName, subject, marksObtained, totalMarks } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mark record ID.",
      });
    }

    if (
      typeof examName !== "string" ||
      !examName.trim() ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Exam name and subject are required.",
      });
    }

    const obtained = Number(marksObtained);
    const total = Number(totalMarks);

    if (
      marksObtained === "" ||
      marksObtained === null ||
      marksObtained === undefined ||
      totalMarks === "" ||
      totalMarks === null ||
      totalMarks === undefined ||
      !Number.isFinite(obtained) ||
      !Number.isFinite(total) ||
      total <= 0 ||
      obtained < 0 ||
      obtained > total
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid marks. Obtained marks cannot exceed total marks.",
      });
    }

    const mark = await Mark.findByIdAndUpdate(
      id,
      {
        examName: examName.trim(),
        subject: subject.trim(),
        marksObtained: obtained,
        totalMarks: total,
      },
      { new: true, runValidators: true }
    );

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: "Mark record not found.",
      });
    }

    res.json({
      success: true,
      message: "Marks updated successfully!",
      mark,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This subject and exam record already exists for the student.",
      });
    }

    console.error("Update marks error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update marks.",
    });
  }
};

// Delete exam marks
exports.deleteMark = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mark record ID.",
      });
    }

    const mark = await Mark.findByIdAndDelete(id);

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: "Mark record not found.",
      });
    }

    res.json({
      success: true,
      message: "Marks deleted successfully!",
    });
  } catch (error) {
    console.error("Delete marks error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete marks.",
    });
  }
};
