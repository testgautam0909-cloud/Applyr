import express from 'express';
import { extractFromHtml, extractFromUrl } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/extract', extractFromHtml);
router.post('/extract-url', extractFromUrl);

export default router;
