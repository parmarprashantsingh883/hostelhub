import { Router } from 'express';
import * as ctrl from '../controllers/recyclebin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/', ctrl.listTrash);
router.delete('/', ctrl.emptyTrash);
router.post('/:id/restore', ctrl.restoreTrash);
router.delete('/:id', ctrl.purgeTrash);

export default router;
