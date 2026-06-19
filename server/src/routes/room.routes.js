import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/room.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const roomBody = z.object({
  roomNumber: z.string().trim().min(1).max(20),
  floor: z.coerce.number().int().min(0).max(50),
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']),
  capacity: z.coerce.number().int().min(1).max(20),
  rentAmount: z.coerce.number().min(0),
  status: z.enum(['vacant', 'partially_occupied', 'occupied', 'maintenance']).optional(),
  facilities: z.array(z.string().trim().max(50)).optional().default([]),
});

const assignBody = z.object({ tenantId: z.string().min(1) });

const router = Router();
router.use(protect);

router.get('/', ctrl.listRooms);
router.get('/:id', ctrl.getRoom);

router.post('/', authorize('admin'), validate(roomBody), ctrl.createRoom);
router.put('/:id', authorize('admin'), validate(roomBody.partial()), ctrl.updateRoom);
router.delete('/:id', authorize('admin'), ctrl.deleteRoom);
router.put('/:id/assign-tenant', authorize('admin'), validate(assignBody), ctrl.assignTenant);
router.put('/:id/remove-tenant', authorize('admin'), validate(assignBody), ctrl.removeTenant);

export default router;
