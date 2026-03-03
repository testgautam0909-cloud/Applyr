import express from 'express';
import { extractFromHtml, extractFromUrl, buildResumeData } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/extract', extractFromHtml);
router.post('/extract-url', extractFromUrl);
router.post('/build-resume-data', buildResumeData);

export default router;
