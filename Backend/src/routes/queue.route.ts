import { Router } from "express";
import { addJobToQueue, deleteJobInQueue, getFirstPendingJob, getQueue, updateJobInQueue } from "../controllers/queue.controller.js";

const router = Router();

router.post('/', addJobToQueue);
router.put('/:id', updateJobInQueue);
router.get('/', getQueue);
router.get('/first-pending', getFirstPendingJob);
router.delete('/:id', deleteJobInQueue);

export default router;