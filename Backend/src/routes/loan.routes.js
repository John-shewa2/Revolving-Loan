import express from "express";
import {
  submitLoanRequest,
  getMyLoanRequests,
  getAllLoanRequests,
  reviewLoanRequest
} from "../controllers/loan.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.post("/submit", authMiddleware, roleMiddleware("EMPLOYEE"), submitLoanRequest);
router.get("/my-loans", authMiddleware, roleMiddleware("EMPLOYEE"), getMyLoanRequests);

// HR routes
router.get("/all", authMiddleware, roleMiddleware("HR"), getAllLoanRequests);
router.post("/review", authMiddleware, roleMiddleware("HR"), reviewLoanRequest);

export default router;
