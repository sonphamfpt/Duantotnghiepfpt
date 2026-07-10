import { z } from 'zod';

export const PayInvoiceSchema = z.object({
  amount: z.number().min(0, 'Số tiền thanh toán phải lớn hơn hoặc bằng 0'),
  method: z.enum(['Cash', 'Card', 'Transfer', 'Wallet']),
});

export const RechargeWalletSchema = z.object({
  amount: z.number().positive('Số tiền nạp phải lớn hơn 0'),
});
