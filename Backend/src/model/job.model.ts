import mongoose, { Schema } from 'mongoose';
import type { IJob } from '../interface/job.interface.js';


const JobSchema: Schema = new Schema({
    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    techStack: [{ type: String }],
    experience: { type: String },
    status: { type: String, required: true },
    appliedDate: { type: String },
    reminderDate: { type: String },
    resumeUrl: { type: String },
    coverLetterUrl: { type: String },
    sourcePlatform: { type: String },
    jobDescription: { type: String },
    postURL: { type: String },
    poc: [{
        name: { type: String },
        email: { type: String },
        mobile: { type: String },
        designation: { type: String }
    }]
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret: any) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

export default mongoose.model<IJob>('Job', JobSchema);
