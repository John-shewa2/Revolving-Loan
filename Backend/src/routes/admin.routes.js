import express from "express";
import { 
  createUser, 
  createEmployeeProfile, 
  resetPassword, 
  seedEmployees,
  getAllUsers // [NEW] Import
} from "../controllers/admin.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN"));

router.post("/create-user", createUser);
router.post("/create-profile", createEmployeeProfile);
router.post("/reset-password", resetPassword);
router.post("/seed-employees", seedEmployees);

// [NEW] Get all users
router.get("/users", getAllUsers);

export default router;