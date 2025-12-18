import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import loanRoutes from './routes/loan.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loans', loanRoutes);

app.get('/', (req, res) => {
    res.send('Employee Loan Managemetn API is running');
});

export default app;