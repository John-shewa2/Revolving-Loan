import express from "express";
import {
  submitLoanRequest,
  getMyLoanRequests,
  getAllLoanRequests,
  recommendLoan,
  finalizeLoan,
  getLoanContract,
  getMyNotifications,
  markNotificationAsRead,
  getMyProfile // [Check 1] Ensure this is imported
} from "../controllers/loan.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// --- Employee Routes ---
// [Check 2] This route MUST be present to fix the 404
router.get("/profile", authMiddleware, roleMiddleware("EMPLOYEE"), getMyProfile);

router.post("/submit", authMiddleware, roleMiddleware("EMPLOYEE"), submitLoanRequest);
router.get("/my-loans", authMiddleware, roleMiddleware("EMPLOYEE"), getMyLoanRequests);
router.get("/notifications", authMiddleware, getMyNotifications);
router.put("/notifications/:notificationId/read", authMiddleware, markNotificationAsRead);

// --- Shared HR Routes ---
router.get("/all", authMiddleware, roleMiddleware("HR_OFFICER", "HR_MANAGER"), getAllLoanRequests);

// --- HR Officer Route ---
router.post("/recommend", authMiddleware, roleMiddleware("HR_OFFICER"), recommendLoan);

// --- HR Manager Route ---
router.post("/finalize", authMiddleware, roleMiddleware("HR_MANAGER"), finalizeLoan);

// --- Contract Route ---
router.get("/:loanId/contract", authMiddleware, getLoanContract);

export default router;