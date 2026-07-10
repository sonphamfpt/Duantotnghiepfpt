import { z } from 'zod';

export const CreateTreatmentPlanSchema = z.object({
  patientId: z.union([z.string(), z.number()]),
  dentistId: z.union([z.string(), z.number()]),
  title: z.string().min(1, 'Tiêu đề phác đồ không được để trống'),
  estimatedTotalCost: z.number().min(0).optional(),
});

export const UpdatePlanStatusSchema = z.object({
  status: z.enum(['Active', 'Completed', 'Cancelled']),
});
