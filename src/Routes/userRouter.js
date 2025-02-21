import express from "express";
import passport from "passport";

import {
  signUpUser,
  verifyOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
  getAllUsers,
  getUser,
} from "../Controller/userController.js";
import { auth, authorizeRoles } from "../Middlewear/auth.js";

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/login", loginUser);
router.post("/forgotPass", forgotPassword);
router.post("/resetPass", resetPassword);
router.post("/logoutPass", logoutUser);
router.post("/get-user/:id", getUser);
router.post("/getAll",auth, authorizeRoles("admin"), getAllUsers);
router.post("/otpVerify", verifyOtp);


export default router;



