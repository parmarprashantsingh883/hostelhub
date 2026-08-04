import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);
router.get('/', authorize('admin', 'staff'), globalSearch);

export default router;
