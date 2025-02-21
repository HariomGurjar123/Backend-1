import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    actualPrice: { type: Number, required: true },
    discountPrice: { type: Number, required: true },
    duration: { type: String, required: true },
    language: { type: String, required: true },
    category: { type: String, required: true },
    introThumbnail: { type: String, required: false },
    introVideo: { type: String, required: false },
    chapters: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        pdfUrl: { type: String, required: false },
        videos: [
          {
            videoUrl: { type: String, required: false },
            title: { type: String, required: true },
            thumbnail: { type: String, required:  false},
            duration: { type: String, required: true },
          }
        ],
      }
    ],
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;