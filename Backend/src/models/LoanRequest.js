import mongoose from "mongoose";

const loanRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeProfile", required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: { type: Number }, // HR-approved amount (can be partial)
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("LoanRequest", loanRequestSchema);
