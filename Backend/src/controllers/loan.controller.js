import LoanRequest from "../models/LoanRequest.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Notification from "../models/Notifications.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [UPDATED] Get Current Profile
export const getMyProfile = async (req, res) => {
  try {
    // Populate userId to get the email
    const profile = await EmployeeProfile.findOne({ userId: req.user.id }).populate('userId', 'email');
    
    if (!profile) {
      // If no profile exists, return 404 (Frontend handles this)
      return res.status(404).json({ message: "Profile not found" });
    }

    // Return flattened profile data
    res.json({
      ...profile.toObject(),
      email: profile.userId.email
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: error.message });
  }
};

export const submitLoanRequest = async (req, res) => {
  try {
    const { amount, profileUpdate } = req.body; 
    const userId = req.user.id;

    // 1. Update Profile if data provided
    if (profileUpdate) {
      const updateFields = {
        fullName: profileUpdate.fullName,
        yearOfBirth: profileUpdate.yearOfBirth,
        jobLevel: profileUpdate.jobLevel,
        department: profileUpdate.department,
        grossSalary: Number(profileUpdate.grossSalary),
        employmentYear: Number(profileUpdate.employmentYear),
        retirementYear: Number(profileUpdate.retirementYear),
      };

      if (profileUpdate.address) updateFields.address = profileUpdate.address;
      if (profileUpdate.guarantor) updateFields.guarantor = profileUpdate.guarantor;

      await EmployeeProfile.findOneAndUpdate(
        { userId: userId },
        { $set: updateFields },
        { new: true, upsert: true }
      );
    }

    // 2. Fetch Profile for Validation
    const employeeProfile = await EmployeeProfile.findOne({ userId: userId });
    if (!employeeProfile) return res.status(404).json({ message: "Employee profile not found" });

    // 3. Validations
    const currentYear = new Date().getFullYear();
    if ((employeeProfile.retirementYear - currentYear) < 3) {
      return res.status(400).json({ message: "Must have >3 years until retirement." });
    }

    const maxLoan = employeeProfile.grossSalary * 6;
    const approvedLoans = await LoanRequest.find({ employee: employeeProfile._id, status: "APPROVED" });
    const totalApproved = approvedLoans.reduce((sum, l) => sum + l.approvedAmount, 0);
    const remainingEligible = maxLoan - totalApproved;

    if (amount > remainingEligible) {
      return res.status(400).json({ message: `Amount exceeds limit. Max eligible: ${remainingEligible}` });
    }

    // 4. Create Request
    const lastLoan = await LoanRequest.findOne().sort({ queueNumber: -1 });
    const nextQueueNumber = (lastLoan?.queueNumber || 0) + 1;

    const loanRequest = await LoanRequest.create({
      employee: employeeProfile._id,
      requestedAmount: amount,
      queueNumber: nextQueueNumber
    });

    res.status(201).json({ message: "Loan request submitted.", loanRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getMyLoanRequests = async (req, res) => {
  try {
    const employeeProfile = await EmployeeProfile.findOne({ userId: req.user.id });
    if (!employeeProfile) return res.json([]); 
    const loans = await LoanRequest.find({ employee: employeeProfile._id }).sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAllLoanRequests = async (req, res) => {
  try {
    const loans = await LoanRequest.find().populate("employee").sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const recommendLoan = async (req, res) => {
  try {
    const { loanId } = req.body;
    const loan = await LoanRequest.findById(loanId).populate("employee");
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.status !== "PENDING") return res.status(400).json({ message: "Loan must be PENDING." });

    loan.status = "REVIEWED";
    loan.reviewedBy = req.user.id;
    loan.reviewedAt = new Date();
    await loan.save();

    await Notification.create({ user: loan.employee.userId, message: `Loan #${loan.queueNumber} reviewed by HR.` });
    res.json({ message: "Loan reviewed", loan });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const finalizeLoan = async (req, res) => {
  try {
    const { loanId, status, approvedAmount } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const loan = await LoanRequest.findById(loanId).populate("employee");
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.status !== "REVIEWED") return res.status(400).json({ message: "Loan must be REVIEWED first." });

    const maxLoan = loan.employee.grossSalary * 6;
    const approvedLoans = await LoanRequest.find({ employee: loan.employee._id, status: "APPROVED" });
    const totalApproved = approvedLoans.reduce((sum, l) => sum + l.approvedAmount, 0);
    const remainingEligible = maxLoan - totalApproved;

    if (status === "APPROVED") {
      if (!approvedAmount) return res.status(400).json({ message: "approvedAmount required" });
      if (approvedAmount > remainingEligible) return res.status(400).json({ message: `Amount exceeds limit: ${remainingEligible}` });
      loan.approvedAmount = approvedAmount;
    } else {
      loan.approvedAmount = 0;
    }

    loan.status = status;
    loan.approvedBy = req.user.id;
    loan.approvedAt = new Date();

    if (status === "APPROVED") {
      const contractsDir = path.join(__dirname, "../../contracts");
      if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

      const filename = `contract-${loan._id}.pdf`;
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(path.join(contractsDir, filename));
      doc.pipe(stream);
      
      doc.fontSize(20).text("LOAN AGREEMENT", { align: "center" }).moveDown();
      doc.fontSize(12).text(`Date: ${new Date().toDateString()}`);
      doc.text(`Employee: ${loan.employee.fullName}`);
      doc.text(`Amount: ${loan.approvedAmount} ETB`);
      doc.end();

      await new Promise((resolve) => stream.on("finish", resolve));
      loan.contractPath = filename;
    }

    await loan.save();
    await Notification.create({ user: loan.employee.userId, message: `Loan #${loan.queueNumber} was ${status}.` });
    res.json({ message: `Loan ${status}`, loan });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getLoanContract = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await LoanRequest.findById(loanId);
    if (!loan?.contractPath) return res.status(404).json({ message: "Contract not found" });

    const filePath = path.join(__dirname, "../../contracts", loan.contractPath);
    if (fs.existsSync(filePath)) res.download(filePath);
    else res.status(404).json({ message: "File missing" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.json({ message: "Marked as read" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};