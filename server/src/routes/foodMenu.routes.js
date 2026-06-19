import { Router } from 'express';
import * as ctrl from '../controllers/foodMenu.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.listMenus);
router.post('/', authorize('admin'), ctrl.createMenu);
router.put('/:id', authorize('admin'), ctrl.updateMenu);
router.delete('/:id', authorize('admin'), ctrl.deleteMenu);
router.post('/:id/feedback', authorize('tenant'), ctrl.addFeedback);

export default router;
