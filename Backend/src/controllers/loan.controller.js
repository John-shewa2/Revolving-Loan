import LoanRequest from "../models/LoanRequest.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import User from "../models/User.js";
import Notification from "../models/Notifications.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Current Profile
export const getMyProfile = async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOne({ userId: req.user.id }).populate('userId', 'email');
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    res.json({
      ...profile.toObject(),
      email: profile.userId.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitLoanRequest = async (req, res) => {
  try {
    const { amount, profileUpdate } = req.body; 
    const userId = req.user.id;

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

    const employeeProfile = await EmployeeProfile.findOne({ userId: userId });
    if (!employeeProfile) return res.status(404).json({ message: "Employee profile not found" });

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

    const lastLoan = await LoanRequest.findOne().sort({ queueNumber: -1 });
    const nextQueueNumber = (lastLoan?.queueNumber || 0) + 1;

    const loanRequest = await LoanRequest.create({
      employee: employeeProfile._id,
      requestedAmount: amount,
      queueNumber: nextQueueNumber
    });

    res.status(201).json({ message: "Loan request submitted.", loanRequest });
  } catch (error) {
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

// --- REVISED: Integrated Amharic Contract & HR Notification ---
export const finalizeLoan = async (req, res) => {
  try {
    const { loanId, status, approvedAmount } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const loan = await LoanRequest.findById(loanId).populate("employee");
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.status !== "REVIEWED") return res.status(400).json({ message: "Loan must be REVIEWED first." });

    // Validation for approved amount
    if (status === "APPROVED") {
      const maxLoan = loan.employee.grossSalary * 6;
      const approvedLoans = await LoanRequest.find({ employee: loan.employee._id, status: "APPROVED" });
      const totalApproved = approvedLoans.reduce((sum, l) => sum + l.approvedAmount, 0);
      const remainingEligible = maxLoan - totalApproved;

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
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(path.join(contractsDir, filename));
      doc.pipe(stream);
      
      // Register Unicode font for Amharic support
      const fontPath = path.join(__dirname, "../../fonts/AbyssinicaSIL.ttf");
      doc.font(fontPath);

      const currentDate = new Date().toLocaleDateString('en-GB');
      const monthlyInstallment = (loan.approvedAmount / 36).toFixed(2);
      const hrManager = await User.findById(req.user.id);
      const hrManagerName = hrManager?.email.split('@')[0] || "HR Manager";

      // --- Contract Header ---
      doc.fontSize(16).text("የኢትዮዽያ ልማት ባንክ", { align: "center" }).moveDown(0.2);
      doc.fontSize(14).text("የሠራተኛ ቅድመ ደመወዝ ክፍያ (Salary Advance)", { align: "center" }).moveDown();

      // --- Intro ---
      doc.fontSize(11).text(`ይህ ውል ዛሬ እ.ኤ.አ ${currentDate} በአንድ ወገን “ባንክ” ተብሎ በሚጠራው የኢትዮጵያ ልማት ባንክ እና በሌላ ወገን “ሠራተኛው/ዋ” ተብለው በሚጠሩት አቶ/ወ/ሮ/ወ/ሪት ${loan.employee.fullName} መካከል ቀጥሎ በተዘረዘረው መሰረት ስምምነት ተደርጓል፡፡`, { align: "justify" }).moveDown();

      // --- Article 1 ---
      doc.fontSize(12).text("አንቀፅ 1", { underline: true }).moveDown(0.2);
      doc.text("የቅድመ ደመወዝ ክፍያ ወሰን").moveDown(0.2);
      const accNum = loan.employee.address?.houseNumber || "________"; 
      doc.fontSize(11).text(`ባንኩ ለሠራተኛው/ዋ ወለድ የማይታሰብበት በሂሳብ ቁጥር ${accNum} የቅድሚያ ደመወዙን ወስደው የሚገለገሉበትን ሁኔታ በማመቻቸት ብር ${loan.approvedAmount.toLocaleString()} እንዲወስድ ፈቅዷል፡፡`, { align: "justify" });
      doc.text("ሠራተኛው/ዋ የሚፈቀድለት የቅድመ ደመወዝ የገንዘብ መጠን የሚወሰነው በባንኩ መመሪያ መሰረት በባንኩ ውስጥ በሰራበት ዓመት ተባዝቶ ይሆናል፡፡").moveDown(0.2);
      doc.text("ሠራተኛው/ዋ የተፈቀደለትን የቅድመ ደመወዝ በቁጠባ ሂሳብ ገንዘብ ማውጫ ቫውቸር መጠቀም ይችላል፡፡").moveDown();

      // --- Article 2 ---
      doc.fontSize(12).text("አንቀፅ 2", { underline: true }).moveDown(0.2);
      doc.text("የቅድመ ደመወዝ ክፍያ መጠቀሚያ ጊዜ").moveDown(0.2);
      doc.fontSize(11).text("የሠራተኛው/ዋ የቅድመ ደመወዝ ክፍያ መጠቀሚያ ጊዜ ለ 3 ዓመት የሚያገለግል ሲሆን ሠራተኛው እንዲራዘምለት ሲጠይቅ ባንኩ የመክፈያ ጊዜዉን ሊያራዝምለት ይችላል፡፡", { align: "justify" });
      doc.text("የሠራተኛው/ዋ ደመወዝ የጨመረ እንደሆነ እና ሠራተኛውም ከጠየቀ ከላይ በንዑስ አንቀጽ 2.1 የተገለፀው እንደተጠበቀ ሆኖ በዚሁ በአዲሱ ደመወዝ መጠን ቅድሚያ የሚወስደው የደመወዝ ጣሪያ ሊሻሻል ይችላል፡፡").moveDown(0.2);
      doc.text("ሠራተኛው/ዋ ጡረታ ለመውጣት 3 ዓመት የቀረው ከሆነ በቀሪው የጡረታ መውጫ ጊዜ ታሳቢ ተደርጎ የቅድሚያ ደመወዝ ክፍያ ከወርሃዊ ደመወዙ ከ1/2 ባልበለጠ መጠን ጡረታ ከመውጣቱ በፊት ከፍሎ እንዲጨርስ ታሳቢ ተደርጎ ውሉ ይታደስለታል፡፡").moveDown();

      // --- Article 3 ---
      doc.fontSize(12).text("አንቀፅ 3", { underline: true }).moveDown(0.2);
      doc.text("የቅድመ ደመወዝ ክፍያው መመለሻ ጊዜ").moveDown(0.2);
      doc.fontSize(11).text(`ሠራተኛው/ዋ የወሰዱት የቅድመ ደመወዝ ክፍያ ገንዘብ እ.ኤ.አ ከመስከረም ወር 2025 ጀምሮ በየወሩ ብር ${monthlyInstallment} ከሠራተኛው/ዋ የወር ደመወዝ እየተቀነሰ ገቢ እየሆነ በ36 ወር ተከፍሎ እንዲያልቅ ሁለቱም ወገኖች ተስማምተዋል፡፡`, { align: "justify" });
      doc.text("ሠራተኛው/ዋ ጡረታ ከመውጣቱ በፊት የወሰደውን የቅድመ ደመወዝ ክፍያ ከፍሎ መጨረስ ይኖርበታል፡፡").moveDown();

      // --- Article 4-7 ---
      doc.fontSize(12).text("አንቀፅ 4", { underline: true }).moveDown(0.2);
      doc.fontSize(11).text("ይህ ውል ሠራተኛው/ዋ በሞትሲለይ ወይም ከባንኩ ጋር ያለው የሥራ ውል ሲቋረጥ ሊቋረጥ ይችላል፡፡ ሠራተኛው/ዋ ከባንኩ ጋር ያለው የሥራ ውል ሲቋረጥ ባልተከፈለው ቀሪ ገንዘብ ላይ የሥራ ውሉ በተቋረጠበት ዘመን ባንኩ ቅድሚያ በማይሰጣቸው ብድሮች /non priority loans/ ላይ በሚያስበው በወቅቱ የወለድ መጠን መሠረት ወለድ የሚታሰብ መሆኑን ሁለቱም ወገኖች ተስማምተዋል፡፡").moveDown();
      
      doc.fontSize(12).text("አንቀፅ 5", { underline: true }).moveDown(0.2);
      doc.fontSize(11).text("ሠራተኛው/ዋ በዚህ ውል ላይ የተገለጸውን ማንኛውንም ግዴታ ሳያከብር ቢቀር ባንኩ በውሉ ላይ የተጠቀሰውን የአከፋፈል ሁኔታና ጊዜ ሳይጠቀምበት የወሰደውን የቅድመ ደመወዝ ክፍያ ገንዘቡን አጠቃሎ በአንድ ጊዜ እንዲከፍል ማድረግ ይችላል፡፡").moveDown();

      doc.fontSize(12).text("አንቀፅ 6", { underline: true }).moveDown(0.2);
      doc.fontSize(11).text("ሠራተኛው/ዋ ከባንኩ ጋር ያለው የሥራ ውል ቢቋረጥ፣ ሠራተኛው ከባንኩ የሚያገኛቸው ክፍያዎች ቢኖሩ ለሠራተኛው ሳይከፍል ወጪ አድርጎ ለዕዳው ማቻቻያ ሊያውለው ይችላል፡፡").moveDown();

      doc.fontSize(12).text("አንቀፅ 7", { underline: true }).moveDown(0.2);
      doc.fontSize(11).text("እኛ ፊርማችን ከዚህ በታች የተመለከተው በዚህ ውል የባንኩ ሰራተኛ እና ባንኩ የሆንን የዚህን ውል ይዘቶችና ሁኔታዎችን አንብበን እና ተረድተን እንደውሉም ለመፈፀም ተስማምተናል፡፡ እንደ ውሉ ሳንፈፅም ብንቀር በውጤቶቹም ለመገደድ ግዴታ ገብተናል፡፡ ስምምነታችንን ለማረጋገጥ ከፍ ሲል በተጠቀሰውን ቀንና ዓመተ ምህረት ይህን ውል በምስክሮች ፊት ፈርመናል፡፡").moveDown();

      // --- Article 8: Address & Signatures ---
      doc.fontSize(12).text("አንቀፅ 8", { underline: true }).moveDown(0.2);
      doc.fontSize(11).text("የቅድሚያ ደመወዝ ገንዘብ የወሰደው/ችው ሠራተኛ ከዚህ በታች በተመለከተው አድራሻው ማናቸውም መልዕክት ሊደርሰው እንደሚችል እና በዚሁ አድራሻ የተላከ ማናቸውም መልዕክት በሕግ ፊት ዋጋ ያለው መሆኑን አረጋግጧል፡፡").moveDown(0.5);
      doc.text(`ስም: ${loan.employee.fullName}`);
      doc.text(`ክ/ከተማ: ${loan.employee.address?.subCity || "________"}`);
      doc.text(`የቤት.ቁ: ${loan.employee.address?.houseNumber || "________"}`);
      doc.text(`ስልክ ቁ: ${loan.employee.address?.phoneNumber || "________"}`).moveDown();

      doc.text("የኢትዮጵያ ልማት ባንክ", 50, doc.y, { continued: true });
      doc.text("የቅድሚያ ደመወዝ የጠየቀው ሠራተኛ ስምና ፊርማ", { align: "right" });
      doc.moveDown(0.5);
      doc.text("---------------------------------------", 50, doc.y, { continued: true });
      doc.text("-----------------------------------------", { align: "right" });
      doc.moveDown(0.5);
      doc.text(hrManagerName, 50, doc.y);
      doc.text("የሰው ኃ/አመራር ዳይሬክቶሬት", 50, doc.y);
      doc.text("ዳይሬክተር", 50, doc.y);
      
      doc.moveDown(2);
      doc.text("የእማኞች ስም እና ፊርማ", { align: "center" });
      doc.text("1. ____________________________", { align: "center" });
      doc.text("2. ____________________________", { align: "center" });

      doc.end();
      await new Promise((resolve) => stream.on("finish", resolve));
      loan.contractPath = filename;
    }

    await loan.save();

    // NOTIFY HR OFFICER (reviewedBy) instead of employee
    if (loan.reviewedBy) {
      await Notification.create({ 
        user: loan.reviewedBy, 
        message: `Contract generated for Loan #${loan.queueNumber} (${loan.employee.fullName}).` 
      });
    }

    // Keep borrower notification for status update
    await Notification.create({ 
      user: loan.employee.userId, 
      message: `Your Loan #${loan.queueNumber} was ${status}. Please contact HR for the contract.` 
    });

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