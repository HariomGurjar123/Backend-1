import Course from "../Model/courseModel.js";
import { ApiError } from "../Utils/apiError.js";
import { ApiResponse } from "../Utils/apiResponse.js";
import uploadOnCloudinary from "../Utils/cloudinary.js";
import asynchandler from "../Utils/asyncHandler.js";
import Category from "../Model/categoryModel.js";


// ============== Create a new course ===============
const createCourse = asynchandler(async (req, res) => {
  try {
    const { actualPrice, discountPrice, duration, language, category, chaptersData } = req.body;

    if (!actualPrice || !discountPrice || !duration || !language || !category || !chaptersData) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    console.log(req.files); // ✅ Debug Log

    const parsedChapters = JSON.parse(chaptersData || "[]");
    const chapters = [];

    const videos = req.files["videos"] || [];
    const thumbnails = req.files["thumbnails"] || [];
    const pdfs = req.files?.["pdfUrl"] || []; // ✅ Ensure pdfs is always an array

    let videoIndex = 0;
    let thumbnailIndex = 0;
    let pdfIndex = 0;

    for (let i = 0; i < parsedChapters.length; i++) {
      const chapter = parsedChapters[i];
      const chapterVideos = [];

      // **Videos Assign कर रहे हैं**
      if (chapter.videos?.length > 0) {
        for (let j = 0; j < chapter.videos.length; j++) {
          let videoUrl = "";
          let thumbnailUrl = "";

          if (videoIndex < videos.length) {
            const videoFile = videos[videoIndex];
            if (videoFile?.path) {
              try {
                const videoUpload = await uploadOnCloudinary(videoFile.path, "videos");
                videoUrl = videoUpload?.secure_url || "";
              } catch (error) {
                console.error("Video Upload Error:", error);
              }
            }
            videoIndex++;
          }

          // **Thumbnail Handling Fix**
          if (thumbnailIndex < thumbnails.length) {
            const thumbnailFile = thumbnails[thumbnailIndex];
            if (thumbnailFile?.path) {
              try {
                const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path, "thumbnails");
                thumbnailUrl = thumbnailUpload?.secure_url || "";
              } catch (error) {
                console.error("Thumbnail Upload Error:", error);
              }
            }
            thumbnailIndex++;
          }

          chapterVideos.push({
            videoUrl,
            title: chapter.videos[j]?.title || "Untitled Video",
            duration: chapter.videos[j]?.duration || "0:00",
            thumbnail: thumbnailUrl,
          });
        }
      }

      // **हर Chapter के लिए सिर्फ एक PDF अपलोड करें**

      let pdfUrl = ""; // Default blank
      if (pdfIndex < pdfs.length) {
        const pdfFile = pdfs[pdfIndex];
        console.log(`Processing PDF for Chapter ${i + 1}:`, pdfFile?.path);
    
        if (pdfFile?.path) {
          try {
            const pdfUpload = await uploadOnCloudinary(pdfFile.path, "pdfs");
            pdfUrl = pdfUpload?.secure_url || "";
            console.log(`Uploaded PDF for Chapter ${i + 1}:`, pdfUrl);
          } catch (error) {
            console.error(`PDF Upload Error for Chapter ${i + 1}:`, error);
          }
        }
        pdfIndex++; // ✅ Next chapter ke liye next PDF use hogi
      }
    
      console.log(`Chapter ${i + 1} PDF URL:`, pdfUrl);

      chapters.push({
        title: chapter?.title || "Untitled Chapter",
        description: chapter?.description || "",
        pdfUrl, // ✅ सिर्फ एक PDF URL store होगा
        videos: chapterVideos,
      });
    }

    // **Intro Video Upload कर रहे हैं**
    let introVideoUrl = "";
    if (req.files["introVideo"]?.[0]?.path) {
      try {
        const introVideoUpload = await uploadOnCloudinary(req.files["introVideo"][0].path, "videos");
        introVideoUrl = introVideoUpload?.secure_url || "";
      } catch (error) {
        console.error("Intro Video Upload Error:", error);
      }
    }

    // **Intro Thumbnail Upload कर रहे हैं**
    let introThumbnailUrl = "";
    if (req.files["introThumbnail"]?.[0]?.path) {
      try {
        const introThumbnailUpload = await uploadOnCloudinary(req.files["introThumbnail"][0].path, "thumbnails");
        introThumbnailUrl = introThumbnailUpload?.secure_url || "";
      } catch (error) {
        console.error("Intro Thumbnail Upload Error:", error);
      }
    }

    // **Course Create कर रहे हैं**
    const newCourse = new Course({
      actualPrice,
      discountPrice,
      duration,
      language,
      category,
      introVideo: introVideoUrl,
      introThumbnail: introThumbnailUrl,
      chapters,
    });

    await newCourse.save();
    return res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ================ Get all courses ==================
const getCourses = asynchandler(async (req, res, next) => {
  const courses = await Course.find().populate("category"); 
  res
    .status(200)
    .json(new ApiResponse(200, courses, "Courses retrieved successfully"));
});

// ================ Get course by ID =================
const getCourseById = asynchandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate("category"); // Populate category if needed
  if (!course) {
    return next(new ApiError(404, "Course not found"));
  }
  res
    .status(200)
    .json(new ApiResponse(200, course, "Course retrieved successfully"));
});

// ============== Update course details ==================
const updateCourse = asynchandler(async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return next(new ApiError(400, err.message));
    }

    const { actualPrice, discountPrice, duration, language, category, chaptersData  } = req.body;

    try {

      // Update the course
      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        {
          actualPrice,
          discountPrice,
          duration,
          language,
          category,
          chapters: JSON.parse(chaptersData),
        },
        { new: true }
      );

      if (!updatedCourse) {
        return next(new ApiError(404, "Course not found"));
      }

      res
        .status(200)
        .json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
    } catch (error) {
      next(new ApiError(500, "Error updating course: " + error.message));
    }
  });
});

// =============== Delete course =================
const deleteCourse = asynchandler(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.id);

  if (!course) {
    return next(new ApiError(404, "Course not found"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Course deleted successfully"));
});

export { createCourse, getCourses, getCourseById, updateCourse, deleteCourse };