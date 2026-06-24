import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/expense.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const expenseBody = z.object({
  category: z.enum(['maintenance', 'utilities', 'salaries', 'supplies', 'rent', 'marketing', 'other']),
  amount: z.coerce.number().min(0),
  date: z.coerce.date().optional(),
  vendor: z.string().trim().max(120).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
});

const router = Router();
router.use(protect);
router.use(authorize('admin'));

router.get('/', ctrl.listExpenses);
router.get('/summary', ctrl.expenseSummary);
router.post('/', validate(expenseBody), ctrl.createExpense);
router.delete('/:id', ctrl.deleteExpense);

export default router;
