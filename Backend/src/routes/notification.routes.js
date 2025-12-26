import express from "express";
import { getMyNotifications, markAsRead, markAllRead } from "../controllers/notification.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyNotifications);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllRead);

export default router;