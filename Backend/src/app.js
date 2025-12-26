import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import loanRoutes from './routes/loan.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

// ✅ FIX: Configure CORS to allow credentials from your specific frontend origin
app.use(cors({
    origin: "http://localhost:5173", // Exact URL of your frontend
    credentials: true                // Allow cookies/authorization headers
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.send('Employee Loan Management API is running');
});

export default app;