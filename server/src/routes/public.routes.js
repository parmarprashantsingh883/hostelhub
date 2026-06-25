import { Router } from 'express';
import * as ctrl from '../controllers/public.controller.js';

// Unauthenticated, read-only endpoints (e.g. QR receipt verification).
const router = Router();

router.get('/verify/:id', ctrl.verifyReceipt);

export default router;
