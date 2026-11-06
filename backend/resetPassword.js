const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./src/models/User");

async function resetPassword() {
  try {
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/smart_school";

    await mongoose.connect(uri);

    const email = "arun1001@example.com";
    const newPassword = "Arun@12345";

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    if (!user) {
      console.log("Student account not found.");
    } else {
      console.log("Password updated successfully!");
      console.log("Email:", user.email);
      console.log("Role:", user.role);
    }
  } catch (error) {
    console.log(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();