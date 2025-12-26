import mongoose from "mongoose";

const loanRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeProfile", required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: { type: Number },
    status: { 
      type: String, 
      enum: ["PENDING", "REVIEWED", "APPROVED", "REJECTED"], 
      default: "PENDING" 
    },
    submittedAt: { type: Date, default: Date.now },
    
    // Workflow tracking
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,

    // Generated PDF path
    contractPath: { type: String },

    // [NEW] Queue Number (Auto-incremented)
    queueNumber: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model("LoanRequest", loanRequestSchema);