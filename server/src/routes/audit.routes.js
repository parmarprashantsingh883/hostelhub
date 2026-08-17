import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect, authorize('admin'));
router.get('/', listAuditLogs);

export default router;
