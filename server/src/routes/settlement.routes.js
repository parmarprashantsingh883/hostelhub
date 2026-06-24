import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/settlement.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const deductionBody = z.object({
  amount: z.coerce.number().positive().max(10_000_000),
  reason: z.string().trim().max(300).optional().default(''),
});

const router = Router();
router.use(protect);
router.use(authorize('admin'));

router.get('/queue', ctrl.moveOutQueue);
router.get('/:tenantId', ctrl.getLedger);
router.get('/:tenantId/compute', ctrl.computeSettlement);
router.post('/:tenantId/deductions', validate(deductionBody), ctrl.addDeduction);
router.post('/:tenantId/finalize', ctrl.finalizeSettlement);

export default router;
