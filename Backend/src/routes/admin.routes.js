import express from "express";
import { createUser, createEmployeeProfile, resetPassword } from "../controllers/admin.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// ✅ Protect all routes: Admin only
router.use(authMiddleware);
router.use(roleMiddleware("ADMIN"));

// Create Employee or HR
router.post("/create-user", createUser);

// Create Employee Profile
router.post("/create-profile", createEmployeeProfile);

// Reset Password
router.post("/reset-password", resetPassword);

export default router;
