import LoanRequest from "../models/LoanRequest.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Notification from "../models/Notification.js";

// Employee submits loan request
export const submitLoanRequest = async (req, res) => {
  try {
    const { amount } = req.body;
    const employeeProfile = await EmployeeProfile.findOne({ userId: req.user.id });

    if (!employeeProfile)
      return res.status(404).json({ message: "Employee profile not found" });

    const currentYear = new Date().getFullYear();
    const remainingYears = employeeProfile.retirementYear - currentYear;
    if (remainingYears < 3) {
      return res
        .status(400)
        .json({ message: "Employee must have at least 3 years remaining until retirement" });
    }

    const maxLoan = employeeProfile.grossSalary * 6;

    // Calculate total approved loans
    const approvedLoans = await LoanRequest.find({
      employee: employeeProfile._id,
      status: "APPROVED"
    });
    const totalApproved = approvedLoans.reduce((sum, loan) => sum + loan.approvedAmount, 0);

    const remainingEligible = maxLoan - totalApproved;

    if (remainingEligible <= 0) {
      return res.status(400).json({ message: "No remaining eligible loan amount available" });
    }

    if (amount > remainingEligible) {
      return res.status(400).json({
        message: `Requested amount exceeds remaining eligible limit. Maximum you can request: ${remainingEligible}`
      });
    }

    const loanRequest = await LoanRequest.create({
      employee: employeeProfile._id,
      requestedAmount: amount
    });

    // Notify HR about new loan request (optional: can be done later)
    // await Notification.create({
    //   user: hrUserId,
    //   message: `New loan request submitted by ${employeeProfile.name}`,
    // });

    res.status(201).json({
      message: "Loan request submitted. HR will review and approve based on eligible limit.",
      loanRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Employee views own loan requests
export const getMyLoanRequests = async (req, res) => {
  try {
    const employeeProfile = await EmployeeProfile.findOne({ userId: req.user.id });
    if (!employeeProfile)
      return res.status(404).json({ message: "Employee profile not found" });

    const loans = await LoanRequest.find({ employee: employeeProfile._id }).sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// HR views all loan requests
export const getAllLoanRequests = async (req, res) => {
  try {
    const loans = await LoanRequest.find().populate("employee").sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// HR approves or rejects loan request
export const reviewLoanRequest = async (req, res) => {
  try {
    const { loanId, status, approvedAmount } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const loan = await LoanRequest.findById(loanId).populate("employee");
    if (!loan) return res.status(404).json({ message: "Loan request not found" });

    const maxLoan = loan.employee.grossSalary * 6;
    const approvedLoans = await LoanRequest.find({
      employee: loan.employee._id,
      status: "APPROVED"
    });
    const totalApproved = approvedLoans.reduce((sum, l) => sum + l.approvedAmount, 0);
    const remainingEligible = maxLoan - totalApproved;

    if (status === "APPROVED") {
      if (approvedAmount == null)
        return res.status(400).json({ message: "approvedAmount is required when approving a loan" });

      if (approvedAmount > remainingEligible)
        return res.status(400).json({
          message: `approvedAmount cannot exceed remaining eligible limit: ${remainingEligible}`
        });

      loan.approvedAmount = approvedAmount;
    } else {
      loan.approvedAmount = 0;
    }

    loan.status = status;
    loan.reviewedBy = req.user.id;
    loan.reviewedAt = new Date();
    await loan.save();

    // In-app notification to employee
    await Notification.create({
      user: loan.employee.userId,
      message:
        status === "APPROVED"
          ? `Your loan request of ${loan.requestedAmount} has been approved. Approved amount: ${loan.approvedAmount}`
          : `Your loan request of ${loan.requestedAmount} has been rejected.`
    });

    res.json({ message: `Loan request ${status.toLowerCase()}`, loan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Employee fetches notifications
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Employee marks a notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    if (!notification.user.equals(req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    notification.read = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
