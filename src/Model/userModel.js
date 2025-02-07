import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    number: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    enrollmentNumber: { type: String, unique: true },
    paymentStatus: { type: Boolean, default: false }, 
    userType: { type: String, enum: ["normal", "enrolled"], default: "normal" },
    token: { type: String },
    sessionActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
