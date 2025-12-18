import express from 'express';

const router = express.Router();

router.get("/test", (req, res) => {
    res.json("Admin route is working");
});

export default router;