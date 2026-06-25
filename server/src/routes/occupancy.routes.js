import { Router } from 'express';
import { getOccupancy } from '../controllers/occupancy.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), getOccupancy);

export default router;
