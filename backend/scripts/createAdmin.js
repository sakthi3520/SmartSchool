require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function createAdmin() {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/smart_school";

    await mongoose.connect(MONGODB_URI);
    const email = "admin@smartschool.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@12345", 12);

    await User.create({
      name: "SmartSchool Admin",
      age: 25,
      email,
      mobile: "9876543210",
      address: "SmartSchool",
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin account created successfully!");
  } catch (error) {
    console.error("Admin creation error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
