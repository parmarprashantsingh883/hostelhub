import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/lead.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { isTest } from '../config/env.js';

const SOURCES = ['website', 'walk_in', 'referral', 'social', 'other'];
const STAGES = ['new', 'contacted', 'visit_scheduled', 'token_paid', 'converted', 'lost'];

const publicLeadBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().trim().min(1, 'Phone is required').max(20),
  email: z.string().trim().email('Enter a valid email').max(160).optional().or(z.literal('')),
  budget: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(2000).optional(),
});

const adminLeadBody = publicLeadBody.extend({
  source: z.enum(SOURCES).optional(),
  stage: z.enum(STAGES).optional(),
  followUpAt: z.string().datetime().optional().or(z.literal('')),
});

const stageBody = z.object({ stage: z.enum(STAGES) });

const router = Router();

// PUBLIC — the booking page posts here without auth. Must come BEFORE protect.
// Stricter per-IP limit than the global API guard to deter booking spam.
const publicLeadGuard = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many enquiries — please try again later.' },
    });
router.post('/public', publicLeadGuard, validate(publicLeadBody), ctrl.createPublicLead);

// Everything below requires an authenticated admin.
router.use(protect);

router.get('/', authorize('admin'), ctrl.listLeads);
router.post('/', authorize('admin'), validate(adminLeadBody), ctrl.createLead);
router.patch('/:id/stage', authorize('admin'), validate(stageBody), ctrl.updateStage);
router.post('/:id/convert', authorize('admin'), ctrl.convertLead);
router.delete('/:id', authorize('admin'), ctrl.deleteLead);

export default router;
