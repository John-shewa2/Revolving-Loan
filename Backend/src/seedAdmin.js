import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "./models/User.js";

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email: "admin@company.com" });
  if (exists) {
    console.log("Admin already exists");
    process.exit();
  }

  await User.create({
    email: "admin@company.com",
    password: "Admin123",
    role: "ADMIN",
  });

  console.log("Admin user created");
  process.exit();
};

createAdmin();
