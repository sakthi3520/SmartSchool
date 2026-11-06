const mongoose = require("mongoose");
const Student = require("../models/Student");

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get students error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
};

// Add student
exports.addStudent = async (req, res) => {
  try {
    const { name, admissionNo, className, section, email, phone } = req.body;

    if (
      !name?.trim() ||
      !admissionNo?.trim() ||
      !className?.trim() ||
      !email?.trim() ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }
    const normalizedAdmissionNo = admissionNo.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await Student.findOne({
      $or: [
        { admissionNo: normalizedAdmissionNo },
        { email: normalizedEmail },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Admission number or email already exists.",
      });
    }

    const student = await Student.create({
      name: name.trim(),
      admissionNo: normalizedAdmissionNo,
      className: className.trim(),
      section: section?.trim() || "A",
      email: normalizedEmail,
      phone: phone.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Student added successfully!",
      student,
    });
  } catch (error) {
    console.error("Add student error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add student.",
    });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, admissionNo, className, section, email, phone } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    if (
      !name?.trim() ||
      !admissionNo?.trim() ||
      !className?.trim() ||
      !email?.trim() ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    const normalizedAdmissionNo = admissionNo.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await Student.findOne({
      _id: { $ne: id },
      $or: [
        { admissionNo: normalizedAdmissionNo },
        { email: normalizedEmail },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Admission number or email already exists.",
      });
    }

    const student = await Student.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        admissionNo: normalizedAdmissionNo,
        className: className.trim(),
        section: section?.trim() || "A",
        email: normalizedEmail,
        phone: phone.trim(),
      },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully!",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update student.",
    });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully!",
    });
  } catch (error) {
    console.error("Delete student error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete student.",
    });
  }
};
