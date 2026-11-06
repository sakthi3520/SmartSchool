
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      age,
      email,
      mobile,
      address,
      password,
      confirmPassword,
      role,
    } = req.body;

    if (
      !name?.trim() ||
      !age ||
      !email?.trim() ||
      !mobile?.trim() ||
      !address?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin registration requires approval.",
      });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Please select Teacher or Student role.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (
      confirmPassword !== undefined &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (Number(age) < 18 || Number(age) > 100) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 18 and 100.",
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      age: Number(age),
      email: normalizedEmail,
      mobile: mobile.trim(),
      address: address.trim(),
      password: hashedPassword,
      role: role,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please login.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

// GET STUDENT NAMES - LOGIN DROPDOWN
router.get("/student-names", async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name")
      .sort({ name: 1 });

    return res.json({
      success: true,
      students: students.map((student) => student.name),
    });
  } catch (error) {
    console.error("Student names error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load student names.",
    });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { name, password, selectedRole } = req.body;

    if (!name?.trim() || !password || !selectedRole) {
      return res.status(400).json({
        success: false,
        message: "Name, password and role are required.",
      });
    }

    if (!["admin", "teacher", "student"].includes(selectedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid login role.",
      });
    }

    const user = await User.findOne({
      name: name.trim(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid name or password.",
      });
    }

    if (user.role !== selectedRole) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as ${user.role}. Please select the correct role.`,
      });
    }

    return res.json({
      success: true,
      message: "Login successful.",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});


// GET STUDENT NAMES FOR THE LOGIN SELECTOR
// router.get("/student-names", async (req, res) => {
//   try {
//     const students = await User.find({ role: "student" })
//       .select("name -_id")
//       .sort({ name: 1 })
//       .lean();

//     return res.json({
//       success: true,
//       students: students.map(({ name }) => name),
//     });
//   } catch (error) {
//     console.error("Student names error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Unable to load student names.",
//     });
//   }
// });



// GET REGISTERED STUDENTS - TEACHER ONLY
router.get(
  "/registered-students",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const students = await User.find({ role: "student" })
        .select("name email mobile")
        .sort({ name: 1 });

      return res.json({
        success: true,
        count: students.length,
        students,
      });
    } catch (error) {
      console.error("Registered students error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to load registered students.",
      });
    }
  }
);





module.exports = router;
