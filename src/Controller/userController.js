import nodemailer from "nodemailer";
import User from "../Model/userModel.js";
import asynchandler from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/apiError.js";
import { ApiResponse } from "../Utils/apiResponse.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const sendEmail = async (mailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail(mailOptions);
};

const sendRegistrationEmail = async (email, username, enrollmentNumber) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to the Company!",
    text: `Dear ${username},\n\nWelcome to the company! Your enrollment number is ${enrollmentNumber}.
    \n\nPlease keep this number safe as it will be required for future references.\n\nBest Regards,\nCompany Team`,
  };
  await sendEmail(mailOptions);
};

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. Please use this to complete your verification.`,
  };
  await sendEmail(mailOptions);
};

const otpStore = new Map();

const generateOTP = () => ({
  otp: Math.floor(100000 + Math.random() * 900000).toString(),
  expiresAt: Date.now() + 5 * 60 * 1000,
});

// =================== Sign Up Function =====================
const signUpUser = asynchandler(async (req, res) => {
  const { username, email, number, password, role } = req.body;

  // const allowedRoles = ["user", "admin"];
  // if (!allowedRoles.includes(role)) {
  //   throw new ApiError(400, "Invalid role provided");
  // }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const otpDetails = generateOTP();
  const hashedPassword = await bcrypt.hash(password, 10);

  otpStore.set(email, {
    username,
    email,
    number,
    password: hashedPassword,
    role,
    otp: otpDetails.otp,
    expiresAt: otpDetails.expiresAt,
  });

  await sendOtpEmail(email, otpDetails.otp);

  res
    .status(201)
    .json(new ApiResponse(201, null, "OTP sent to email for verification"));
});

// ============= Verify OTP Function =============
const verifyOtp = asynchandler(async (req, res) => {
  const { email, otp, paymentStatus } = req.body; // Expect payment status from request

  const userData = otpStore.get(email);

  if (!userData) {
    throw new ApiError(400, "OTP expired or invalid email");
  }

  if (userData.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (Date.now() > userData.expiresAt) {
    otpStore.delete(email);
    throw new ApiError(400, "OTP has expired");
  }

  // Generate enrollment number if payment is completed
  let enrollmentNumber = null;
  let userType = "normal";

  if (paymentStatus) {
    enrollmentNumber = `ENROLL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    userType = "enrolled";
  }

  const newUser = new User({
    username: userData.username,
    email: userData.email,
    number: userData.number,
    password: userData.password,
    role: userData.role,
    enrollmentNumber,
    paymentStatus, 
    userType, 
  });

  await newUser.save();
  otpStore.delete(email);

  // Send registration email only if payment is completed
  if (paymentStatus) {
    await sendRegistrationEmail(email, userData.username, enrollmentNumber);
  }

  const token = jwt.sign(
    { id: newUser._id, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: "5d" }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: newUser, token },
        "User registered successfully"
      )
    );
});


// =============== Login Function ================
const loginUser = asynchandler(async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Invalid login credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Invalid login credentials");
  }

  if (user.role !== role) {
    throw new ApiError(403, "Access denied: Role mismatch");
  }

  const token = jwt.sign(
    { _id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "5d",
    }
  );

  user.token = token;
  user.sessionActive = true;
  await user.save();

  user.password = undefined;

  res
    .status(200)
    .json(new ApiResponse(200, { user, token }, "Login successful"));
});

// ============= Forgot Password Function ==============
const forgotPassword = asynchandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User with this email does not exist");
  }

  const otpDetails = generateOTP();
  otpStore.set(email, { otp: otpDetails.otp, expiresAt: otpDetails.expiresAt });

  await sendOtpEmail(email, otpDetails.otp);

  res.status(200).json(new ApiResponse(200, null, "OTP sent to email"));
});

// ============== Reset Password Function ==============
const resetPassword = asynchandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const otpData = otpStore.get(email);
  if (!otpData || otpData.otp !== otp) {
    throw new ApiError(400, "Invalid OTP or OTP has expired");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  otpStore.delete(email);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});

// =============== Logout Function ================
const logoutUser = asynchandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  user.token = "";
  user.sessionActive = false;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

// ============== Get All Users Function ===================
const getAllUsers = asynchandler(async (req, res) => {
  const users = await User.find({ role: { $ne: "admin" } }).sort({
    createdAt: -1,
  })
  .populate("courses")

  res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const getUser = asynchandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
  .populate("courses")
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

export {
  signUpUser,
  verifyOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
  getAllUsers,
  getUser
};
