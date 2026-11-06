const mongoose = require("mongoose");

async function connectDB() {
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/smart_school";

  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected successfully!");
}

module.exports = connectDB;
