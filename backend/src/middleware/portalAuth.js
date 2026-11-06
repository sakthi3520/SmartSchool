// Role-based access helpers for the Student Portal.
// Identity always comes from the verified JWT -> User in MongoDB. Nothing the client sends
// (ids, names, admission numbers) is ever trusted to decide whose data is returned.

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Case-insensitive exact match (used for class / section / email comparisons)
function ciExact(value) {
  return new RegExp(`^${escapeRegex(String(value || "").trim())}$`, "i");
}

// 1. Verify the JWT and load the real user (role comes from the database, not the token)
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
}

// 2. Allow only the listed roles, e.g. authorize("teacher", "admin")
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to do this.",
      });
    }
    next();
  };
}

// 3. Find the Student record that belongs to the logged-in student account.
// The link is the email address: User.email (registration) === Student.email (student record).
async function findOwnStudent(user) {
  if (!user || !user.email) return null;
  return Student.findOne({ email: ciExact(user.email) });
}

// 4. Attach req.studentRecord for student accounts (null when no record is linked yet)
async function attachOwnStudent(req, res, next) {
  try {
    req.studentRecord = await findOwnStudent(req.user);
    next();
  } catch (error) {
    console.error("attachOwnStudent error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load student record." });
  }
}

// 5. For the EXISTING /api/marks and /api/attendance routes:
// students may read, but the response is filtered so they only ever receive their own rows,
// even if the controller returns everyone's data. Teachers/admins are not affected.
function limitStudentToOwnRows(listKey) {
  return async (req, res, next) => {
    if (req.user.role !== "student") return next();

    try {
      const own = await findOwnStudent(req.user);
      const ownId = own ? String(own._id) : null;
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        if (body && Array.isArray(body[listKey])) {
          const rows = body[listKey].filter((row) => {
            const ref = row && row.student;
            const id = ref && ref._id ? String(ref._id) : String(ref);
            return ownId && id === ownId;
          });
          return originalJson({ ...body, [listKey]: rows, count: rows.length });
        }
        return originalJson(body);
      };

      if (ownId) req.query.studentId = ownId; // also narrows the DB query when the controller supports it
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not verify student." });
    }
  };
}

module.exports = {
  protect,
  authorize,
  ciExact,
  findOwnStudent,
  attachOwnStudent,
  limitStudentToOwnRows,
};