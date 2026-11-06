const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Get teachers error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers.",
    });
  }
};

// Add teacher
exports.addTeacher = async (req, res) => {
  try {
    const {
      name,
      employeeId,
      subject,
      email,
      phone,
      qualification,
    } = req.body;

    if (
      !name?.trim() ||
      !employeeId?.trim() ||
      !subject?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !qualification?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all teacher fields.",
      });
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await Teacher.findOne({
      $or: [
        { employeeId: normalizedEmployeeId },
        { email: normalizedEmail },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists.",
      });
    }

    const teacher = await Teacher.create({
      name: name.trim(),
      employeeId: normalizedEmployeeId,
      subject: subject.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      qualification: qualification.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Teacher added successfully!",
      teacher,
    });
  } catch (error) {
    console.error("Add teacher error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add teacher.",
    });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      employeeId,
      subject,
      email,
      phone,
      qualification,
    } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    if (
      !name?.trim() ||
      !employeeId?.trim() ||
      !subject?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !qualification?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all teacher fields.",
      });
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await Teacher.findOne({
      _id: { $ne: id },
      $or: [
        { employeeId: normalizedEmployeeId },
        { email: normalizedEmail },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists.",
      });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        employeeId: normalizedEmployeeId,
        subject: subject.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        qualification: qualification.trim(),
      },
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    res.json({
      success: true,
      message: "Teacher updated successfully!",
      teacher,
    });
  } catch (error) {
    console.error("Update teacher error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update teacher.",
    });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    const teacher = await Teacher.findByIdAndDelete(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    res.json({
      success: true,
      message: "Teacher deleted successfully!",
    });
  } catch (error) {
    console.error("Delete teacher error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete teacher.",
    });
  }
};
