import { z } from 'zod';

export const CreateMedicalRecordSchema = z.object({
  patientId: z.union([z.string(), z.number()]),
  dentistId: z.union([z.string(), z.number()]),
  queueTicketId: z.union([z.string(), z.number()]).optional(),
  notes: z.string(),
  performedServices: z.array(z.union([z.string(), z.number()])),
  sessionType: z.enum(['independent', 'plan_init', 'plan_session']).optional().default('independent'),
  treatmentPlanId: z.union([z.string(), z.number()]).optional(),
  teeth: z.array(z.object({
    toothNumber: z.number().min(11).max(85),
    condition: z.enum(['healthy', 'decay', 'missing', 'crown', 'bridge', 'treated']),
    treatmentNote: z.string().optional(),
  })).optional().default([]),
});
