const express = require("express");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");
const studentController = require("../controllers/studentController");

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("admin", "teacher"), studentController.getStudents);
router.post("/", authenticateToken, authorizeRoles("admin", "teacher"), studentController.addStudent);
router.put("/:id", authenticateToken, authorizeRoles("admin", "teacher"), studentController.updateStudent);
router.delete("/:id", authenticateToken, authorizeRoles("admin"), studentController.deleteStudent);

module.exports = router;
