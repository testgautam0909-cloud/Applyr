import { Router } from 'express';
import {
    evaluateResume,
    buildResume,
    buildCoverLetter,
    getBaseResume,
    updateBaseResume,
    extractFromHtml,
} from '../controllers/ai.controller.js';

const router = Router();

router.post('/evaluate', evaluateResume);
router.post('/build', buildResume);
router.post('/cover-letter', buildCoverLetter);
router.post('/extract', extractFromHtml);

// Base resume CRUD
router.get('/base', getBaseResume);
router.patch('/base', updateBaseResume);

export default router;