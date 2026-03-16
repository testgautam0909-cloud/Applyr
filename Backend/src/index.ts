import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from "./DB/index.js";

import jobRoutes from "./routes/job.route.js";
import aiRoutes from "./routes/ai.route.js";
import queueRoutes from "./routes/queue.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.use("/api/jobs", jobRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/queue", queueRoutes);

app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server is running on port ${PORT}`);
});