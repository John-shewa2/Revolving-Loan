import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";
import EmployeeProfile from "./models/EmployeeProfile.js";

const seedData = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB...");

  // 1. Create HR User
  const hrEmail = "hr@company.com";
  let hrUser = await User.findOne({ email: hrEmail });
  if (!hrUser) {
    hrUser = await User.create({
      email: hrEmail,
      password: "Password123",
      role: "HR",
    });
    console.log("HR User Created: hr@company.com / Password123");
  }

  // 2. Create Employee User
  const empEmail = "emp@company.com";
  let empUser = await User.findOne({ email: empEmail });
  if (!empUser) {
    empUser = await User.create({
      email: empEmail,
      password: "Password123",
      role: "EMPLOYEE",
    });
    console.log("Employee User Created: emp@company.com / Password123");
  }

  // 3. Create Employee Profile (Required for Loans)
  const profileExists = await EmployeeProfile.findOne({ userId: empUser._id });
  if (!profileExists) {
    await EmployeeProfile.create({
      userId: empUser._id,
      fullName: "John Doe",
      yearOfBirth: 1990,
      jobLevel: "Senior",
      department: "IT",
      grossSalary: 15000,
      address: {
        subCity: "Bole",
        woreda: "03",
        houseNumber: "123",
        phoneNumber: "0911223344",
      },
      employmentYear: 2015,
      retirementYear: 2050, // Must be > 3 years from now
      guarantor: {
        fullName: "Jane Doe",
        address: { subCity: "Arada", woreda: "01", houseNumber: "99", phoneNumber: "0922334455" },
      },
    });
    console.log("Employee Profile Created for John Doe");
  }

  console.log("Seeding complete!");
  process.exit();
};

seedData();