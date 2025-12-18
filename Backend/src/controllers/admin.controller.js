import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import bcrypt from "bcryptjs";

// 1️⃣ Create a new user (Employee or HR)
export const createUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ email, password, role });
    res.status(201).json({ message: "User created", user: { id: user._id, email, role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Create Employee Profile (admin-only)
export const createEmployeeProfile = async (req, res) => {
  try {
    const { userId, fullName, yearOfBirth, jobLevel, department, grossSalary, address, employmentYear, retirementYear, guarantor } = req.body;

    if (!userId || !fullName || !employmentYear || !retirementYear) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const exists = await EmployeeProfile.findOne({ userId });
    if (exists) return res.status(400).json({ message: "Profile already exists" });

    const profile = await EmployeeProfile.create({
      userId,
      fullName,
      yearOfBirth,
      jobLevel,
      department,
      grossSalary,
      address,
      employmentYear,
      retirementYear,
      guarantor
    });

    res.status(201).json({ message: "Employee profile created", profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3️⃣ Reset user password (admin-only)
export const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ message: "userId and newPassword required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
