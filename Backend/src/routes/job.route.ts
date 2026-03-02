import express from 'express';
import { getJobs, createJob, updateJob, deleteJob, createJobFromAI } from '../controllers/job.controller.js';

const router = express.Router();

router.get('/', getJobs);
router.post('/', createJob);
router.post('/from-ai', createJobFromAI);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
