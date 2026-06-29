import { Router } from 'express';
import { listAttendance, markAttendance, attendanceSummary } from '../controllers/hr.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/summary', attendanceSummary);
router.get('/', listAttendance);
router.post('/', markAttendance);

export default router;
