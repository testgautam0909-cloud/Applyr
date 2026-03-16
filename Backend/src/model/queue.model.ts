import mongoose from "mongoose";

const queueSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  executionURL: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

const Queue = mongoose.model("Queue", queueSchema);

export default Queue;
