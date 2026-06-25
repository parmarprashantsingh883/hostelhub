import { Router } from 'express';
import * as ctrl from '../controllers/booking.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listBookings);
router.post('/', authorize('admin'), ctrl.createBooking);
router.put('/:id', authorize('admin'), ctrl.updateBooking);
router.put('/:id/status', authorize('admin'), ctrl.updateBookingStatus);
router.delete('/:id', authorize('admin'), ctrl.deleteBooking);

export default router;
