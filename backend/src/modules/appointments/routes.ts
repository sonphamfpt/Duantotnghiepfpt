import { Router } from 'express';
import { appointmentsController } from './controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  getAvailableSlotsSchema,
  createAppointmentSchema,
  cancelAppointmentSchema,
} from './dto';

const router = Router();

// GET /api/appointments
router.get(
  '/',
  appointmentsController.getAllAppointments
);

// GET /api/appointments/dentists/:dentistId/available-slots
router.get(
  '/dentists/:dentistId/available-slots',
  validateRequest(getAvailableSlotsSchema),
  appointmentsController.getAvailableSlots
);

// POST /api/appointments
router.post(
  '/',
  validateRequest(createAppointmentSchema),
  appointmentsController.createAppointment
);

// PATCH /api/appointments/:id/cancel
router.patch(
  '/:id/cancel',
  validateRequest(cancelAppointmentSchema),
  appointmentsController.cancelAppointment
);

export default router;
