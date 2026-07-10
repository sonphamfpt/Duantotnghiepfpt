import { z } from 'zod';

export const CreateShiftSchema = z.object({
  dentistId: z.union([z.string(), z.number()]),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
  shiftType: z.enum(['Morning', 'Afternoon', 'Full']),
  roomId: z.number().int().min(1),
});

export const SwapShiftsSchema = z.object({
  shiftId1: z.union([z.string(), z.number()]),
  shiftId2: z.union([z.string(), z.number()]),
});

export const TransferShiftSchema = z.object({
  shiftId: z.union([z.string(), z.number()]),
  targetDentistId: z.union([z.string(), z.number()]),
});

export const ResolveConflictSchema = z.object({
  action: z.enum(['updated', 'cancelled']),
});
