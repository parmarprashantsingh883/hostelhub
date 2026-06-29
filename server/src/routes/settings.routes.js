import { Router } from 'express';
import { getSettingsCtrl, updateSettingsCtrl } from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin'), getSettingsCtrl);
router.put('/', authorize('admin'), updateSettingsCtrl);

export default router;
