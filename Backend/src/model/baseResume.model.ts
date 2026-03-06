import mongoose, { Document } from 'mongoose';
import type { IBaseResume } from '../interface/resume.interface.js';

export interface IBaseResumeDocument extends IBaseResume, Document { }

const ProfileSchema = new mongoose.Schema({
    network: String,
    username: String,
    url: String,
}, { _id: false });

const LocationSchema = new mongoose.Schema({
    address: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    region: { type: String, default: '' },
}, { _id: false });

const BasicsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    label: { type: String, default: '' },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    summary: { type: String, default: '' },
    location: { type: LocationSchema, default: {} },
    profiles: { type: [ProfileSchema], default: [] },
    totalExperience: { type: String, default: '' },
}, { _id: false });

const WorkSchema = new mongoose.Schema({
    name: String,
    position: String,
    startDate: String,
    endDate: String,
    summary: String,
    highlights: [String],
    keywords: [String],
    url: String,
    roles: [String],
    entity: String,
    type: String,
}, { _id: false });

const EducationSchema = new mongoose.Schema({
    institution: String,
    area: String,
    studyType: String,
    startDate: String,
    endDate: String,
    gpa: String,
    courses: [String],
}, { _id: false });

const SkillSchema = new mongoose.Schema({
    name: String,
    level: String,
    keywords: [String],
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
    name: String,
    description: String,
    highlights: [String],
    keywords: [String],
    startDate: String,
    endDate: String,
    url: String,
    roles: [String],
    entity: String,
    type: String,
}, { _id: false });

const AwardSchema = new mongoose.Schema({
    title: String,
    date: String,
    awarder: String,
    summary: String,
}, { _id: false });

const CertificateSchema = new mongoose.Schema({
    name: String,
    date: String,
    issuer: String,
    url: String,
}, { _id: false });

const MetaSchema = new mongoose.Schema({
    version: { type: String, default: '1.0.0' },
}, { _id: false });

const BaseResumeSchema = new mongoose.Schema({
    basics: { type: BasicsSchema, required: true },
    work: { type: [WorkSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    skills: { type: [SkillSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    awards: { type: [AwardSchema], default: [] },
    certificates: { type: [CertificateSchema], default: [] },
    meta: { type: MetaSchema, default: {} },
}, { timestamps: true });

export default mongoose.model<IBaseResumeDocument>('BaseResume', BaseResumeSchema);
