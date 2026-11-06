// const express = require("express");
// const cors = require("cors");

// const authRoutes = require("./routes/authRoutes");
// const studentRoutes = require("./routes/studentRoutes");
// const teacherRoutes = require("./routes/teacherRoutes");
// const attendanceRoutes = require("./routes/attendanceRoutes");
// const markRoutes = require("./routes/markRoutes");

// const app = express();

// app.use(cors({ origin: "http://localhost:3000" }));
// app.use(express.json());

// app.use("/api/auth", authRoutes);
// app.use("/api/students", studentRoutes);
// app.use("/api/teachers", teacherRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/marks", markRoutes);

// // Home
// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "SmartSchool Backend is running!",
//   });
// });

// // Health check
// app.get("/api/health", (req, res) => {
//   res.json({
//     success: true,
//     message: "SmartSchool API is working",
//   });
// });

// app.get("/api/test", (req, res) => {
//   res.json({
//     success: true,
//     message: "Correct backend server is running!",
//   });
// });

// module.exports = app;
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const markRoutes = require("./routes/markRoutes");
const studentPortalRoutes = require("./routes/studentPortalRoutes");
const contentRoutes = require("./routes/contentRoutes");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", markRoutes);

// Student portal (student-only, identified from JWT)
app.use("/api/student-portal", studentPortalRoutes);

// Teacher/Admin content: /api/homework, /api/announcements, /api/timetable
app.use("/api", contentRoutes);

// Home
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SmartSchool Backend is running!",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SmartSchool API is working",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Correct backend server is running!",
  });
});

// Unknown API routes -> JSON 404 (instead of Express's HTML page)
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Any unexpected error -> JSON 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Internal server error.",
  });
});

module.exports = app;