const express = require("express");
const markController = require("../controllers/markController");
const { protect, authorize, limitStudentToOwnRows } = require("../middleware/portalAuth");

const router = express.Router();

// Must be logged in for every marks route
router.use(protect);

// Reading: teachers/admins see everything, students only receive their own rows
router.get("/", limitStudentToOwnRows("marks"), markController.getMarks);

// Writing: teachers and admins only (students get 403)
router.post("/", authorize("teacher", "admin"), markController.addMark);
router.put("/:id", authorize("teacher", "admin"), markController.updateMark);
router.delete("/:id", authorize("teacher", "admin"), markController.deleteMark);

module.exports = router;