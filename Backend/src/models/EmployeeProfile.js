import mongoose from "mongoose";

const employeeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  yearOfBirth: Number,
  jobLevel: String,
  department: String,
  grossSalary: Number,
  address: {
    subCity: String,
    woreda: String,
    houseNumber: String,
    phoneNumber: String
  },
  employmentYear: { type: Number, required: true },
  retirementYear: { type: Number, required: true },
  guarantor: {
    fullName: String,
    address: {
      subCity: String,
      woreda: String,
      houseNumber: String,
      phoneNumber: String
    }
  }
}, { timestamps: true });

export default mongoose.model("EmployeeProfile", employeeProfileSchema);
