import { Router } from 'express';
import * as ctrl from '../controllers/vendor.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listVendors);
router.post('/', authorize('admin'), ctrl.createVendor);
router.put('/:id', authorize('admin'), ctrl.updateVendor);
router.delete('/:id', authorize('admin'), ctrl.deleteVendor);

export default router;
