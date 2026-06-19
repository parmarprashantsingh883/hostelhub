import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.listNotifications);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);

export default router;
