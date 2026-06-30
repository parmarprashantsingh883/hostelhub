import { Router } from 'express';
import * as ctrl from '../controllers/asset.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listAssets);
router.post('/', authorize('admin'), ctrl.createAsset);
router.put('/:id', authorize('admin'), ctrl.updateAsset);
router.delete('/:id', authorize('admin'), ctrl.deleteAsset);

export default router;
