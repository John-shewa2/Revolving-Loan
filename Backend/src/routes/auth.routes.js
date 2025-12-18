import express from 'express';

const router = express.Router();

router.get("/test", (req, res) => {
    res.json('Auth route is working');
});

export default router;