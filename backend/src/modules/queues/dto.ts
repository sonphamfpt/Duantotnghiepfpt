import { z } from 'zod';

export const CheckInSchema = z.object({
  patientId: z.union([z.string(), z.number()]),
  dentistId: z.union([z.string(), z.number()]),
  serviceId: z.union([z.string(), z.number()]).optional(),
  appointmentId: z.union([z.string(), z.number()]).optional(),
  customRoom: z.string().optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['Waiting', 'InChair', 'In Chair', 'Completed']),
});
