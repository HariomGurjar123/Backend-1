import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import dotenv from "dotenv"

dotenv.config();
// Initialize the app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Initialize session middleware
app.use(
  session({
    secret: "your-secret-key", // Replace with your secret key
    resave: false, // Don't save the session if it wasn't modified
    saveUninitialized: false, // Don't create a session until something is stored
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session()); // Enable Passport to handle sessions

// Default route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

import userRouter from "./src/Routes/userRouter.js";
app.use("/user", userRouter);

import courseRouter from "./src/Routes/courseRouter.js";
app.use("/course", courseRouter);

import feedbackRouter from "./src/Routes/feedbackRouter.js";
app.use("/feedback", feedbackRouter);

import cartRouter from "./src/Routes/courseCartRouter.js";
app.use("/cart", cartRouter);

import categoryRouter from "./src/Routes/categoryRouter.js";
app.use("/category", categoryRouter);

import paymentRouter from "./src/Routes/paymentRouter.js";
app.use("/payment", paymentRouter);

import dashboardRouter from "./src/Routes/dashboardRouter.js";
app.use("/dashboard", dashboardRouter);

import googleAuthRouter from "./src/Routes/passportRouter.js";
app.use("/users", googleAuthRouter);

import blogRouter from "./src/Routes/blogRoute.js";
app.use("/blog", blogRouter);

export { app };
