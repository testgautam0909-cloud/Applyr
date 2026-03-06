import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluation extends Document {
    jobId: string;
    hard_skills_match: number;
    soft_skills_match: number;
    experience_match: number;
    education_match: number;
    web_presence_score: number;
    overall_score: number;
    missing_keywords: string[];
    improvement_suggestions: string[];
    notes: string[];
    web_presence: {
        has_linkedin: boolean;
        has_website: boolean;
        suggestions: string[];
    };
    summary: any;
    skills: any;
    work: any[];
    projects: any[];
    education: any;
    createdAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>({
    jobId: { type: String, required: true, index: true },
    hard_skills_match: { type: Number, default: 0 },
    soft_skills_match: { type: Number, default: 0 },
    experience_match: { type: Number, default: 0 },
    education_match: { type: Number, default: 0 },
    web_presence_score: { type: Number, default: 0 },
    overall_score: { type: Number, default: 0 },
    missing_keywords: { type: [String], default: [] },
    improvement_suggestions: { type: [String], default: [] },
    notes: { type: [String], default: [] },
    web_presence: { type: Schema.Types.Mixed, default: {} },

    summary: { type: Schema.Types.Mixed, default: {} },
    skills: { type: Schema.Types.Mixed, default: {} },
    work: { type: Schema.Types.Mixed, default: [] },
    projects: { type: Schema.Types.Mixed, default: [] },
    education: { type: Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
    collection: 'evaluations',
});

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);
