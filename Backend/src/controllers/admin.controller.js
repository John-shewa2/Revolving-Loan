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

// 2️⃣ Create Employee Profile (admin-only - Manual)
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

// 4️⃣ Bulk Seed Employees (Strict Mode: Name, Email, Salary, Years + Optional Password)
export const seedEmployees = async (req, res) => {
  try {
    const { employees } = req.body; 

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: "Please provide an array of employees." });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const emp of employees) {
      try {
        // Validation: Ensure strictly required seed fields are present
        if (!emp.email || !emp.fullName || !emp.grossSalary || !emp.employmentYear || !emp.retirementYear) {
           results.failed++;
           results.errors.push(`Missing data for ${emp.email || 'unknown user'}. Required: email, fullName, grossSalary, employmentYear, retirementYear.`);
           continue;
        }

        // 1. Check if user exists
        const existingUser = await User.findOne({ email: emp.email });
        if (existingUser) {
          results.failed++;
          results.errors.push(`Email ${emp.email} already exists.`);
          continue;
        }

        // 2. Create User
        // [UPDATED] Use provided password or fallback to default
        const password = emp.password || "Password@123"; 
        
        const newUser = await User.create({
          email: emp.email,
          password: password,
          role: "EMPLOYEE"
        });

        // 3. Create Profile with ONLY the seeded data
        await EmployeeProfile.create({
          userId: newUser._id,
          fullName: emp.fullName,
          grossSalary: emp.grossSalary,
          employmentYear: emp.employmentYear,
          retirementYear: emp.retirementYear
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Failed to seed ${emp.email}: ${err.message}`);
      }
    }

    res.json({ message: "Bulk seeding completed", results });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5️⃣ Get All Users (For Admin Dashboard List)
export const getAllUsers = async (req, res) => {
  try {
    // Return users without passwords, sorted by latest
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};