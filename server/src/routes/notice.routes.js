import { Router } from 'express';
import * as ctrl from '../controllers/notice.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.listNotices);
router.get('/:id', ctrl.getNotice);
router.post('/', authorize('admin'), ctrl.createNotice);
router.put('/:id', authorize('admin'), ctrl.updateNotice);
router.delete('/:id', authorize('admin'), ctrl.deleteNotice);

export default router;
