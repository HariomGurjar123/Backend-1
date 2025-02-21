import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../Controller/courseController.js";
import { authorizeRoles, auth } from "../Middlewear/auth.js";
import upload from "../Middlewear/multer.js";

const router = express.Router();

router.post(
  "/create",
  upload.fields([
    { name: "introVideo", maxCount: 1 },
    { name: "introThumbnail", maxCount: 1 },
    { name: "pdfUrl", maxCount: 50 },
    { name: "videos", maxCount: 10 },
    { name: "thumbnails", maxCount: 10 }
  ]),
  createCourse
);


router.get("/getAll", getCourses);
router.get("/getById/:id", getCourseById);
router.put(
  "/update/:id",
  auth,
  authorizeRoles("admin"),
  upload.fields([{ name: "pdf" }, { name: "videos" }, { name: "thumbnail" }]),
  updateCourse
);
router.delete("/delete/:id", auth, authorizeRoles("admin"), deleteCourse);

export default router;
