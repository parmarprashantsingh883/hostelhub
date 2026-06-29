import { Router } from 'express';
import { listPayroll, runPayroll } from '../controllers/hr.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/', listPayroll);
router.post('/run', runPayroll);

export default router;
