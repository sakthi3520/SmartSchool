const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const { protect, authorize, limitStudentToOwnRows } = require("../middleware/portalAuth");

const router = express.Router();

// Must be logged in for every attendance route
router.use(protect);

// Reading: teachers/admins see everything, students only receive their own rows
router.get("/", limitStudentToOwnRows("records"), attendanceController.getAttendance);

// Writing: teachers and admins only (students get 403)
router.post("/", authorize("teacher", "admin"), attendanceController.saveAttendance);

module.exports = router;