import { Router } from 'express';
import * as ctrl from '../controllers/document.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.listDocuments);
router.post('/', authorize('admin'), upload.single('file'), ctrl.uploadDocument);
router.delete('/:id', authorize('admin'), ctrl.deleteDocument);

export default router;
