import { Invoice } from '../types/clinic';

/**
 * Kiểm tra xem 2 mốc thời gian có cùng thuộc một ngày (theo giờ địa phương) hay không.
 */
export const isSameCalendarDay = (date1: Date | string, date2: Date | string = new Date()): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export interface RevenueStats {
  cashIncome: number;
  nonCashIncome: number;
  totalCollected: number;
  paidInvoiceCount: number;
  paidInvoices: Invoice[];
}

/**
 * Tính toán thống kê doanh thu chuẩn xác cho hóa đơn / thanh toán.
 * @param invoices Danh sách tất cả hóa đơn trong clinic context
 * @param options Các tham số lọc ngày targetDate và minTimestamp (mốc thời gian bắt đầu ca)
 */
export const calculateRevenueStats = (
  invoices: Invoice[],
  options?: { targetDate?: Date | string; minTimestamp?: number | null }
): RevenueStats => {
  const targetDate = options?.targetDate ? new Date(options.targetDate) : new Date();
  const minTs = options?.minTimestamp ?? null;

  let cashIncome = 0;
  let nonCashIncome = 0;
  const paidInvoiceIds = new Set<string>();

  for (const inv of invoices || []) {
    const isPaid = inv.status === 'Paid' || inv.status === 'Partially Paid';
    if (!isPaid) continue;

    if (inv.payments && inv.payments.length > 0) {
      for (const p of inv.payments) {
        const pDate = new Date(p.date || inv.createdAt);
        const pTime = pDate.getTime();
        if (isNaN(pTime)) continue;

        // Phải trùng ngày targetDate
        if (!isSameCalendarDay(pDate, targetDate)) continue;

        // Nếu có mốc chốt ca minTimestamp -> bỏ qua giao dịch trước mốc chốt ca
        if (minTs !== null && pTime < minTs) continue;

        if (p.method === 'Cash') {
          cashIncome += p.amount;
        } else {
          nonCashIncome += p.amount;
        }
        paidInvoiceIds.add(inv.id);
      }
    } else {
      // Fallback cho hóa đơn không có mảng payments chi tiết
      const invDate = new Date(inv.createdAt);
      const invTime = invDate.getTime();
      if (!isNaN(invTime) && isSameCalendarDay(invDate, targetDate)) {
        if (minTs === null || invTime >= minTs) {
          const amount = inv.paidAmount || inv.netPrice || 0;
          if (inv.paymentMethod === 'Cash') {
            cashIncome += amount;
          } else {
            nonCashIncome += amount;
          }
          paidInvoiceIds.add(inv.id);
        }
      }
    }
  }

  const paidInvoices = (invoices || []).filter(i => paidInvoiceIds.has(i.id));

  return {
    cashIncome,
    nonCashIncome,
    totalCollected: cashIncome + nonCashIncome,
    paidInvoiceCount: paidInvoiceIds.size,
    paidInvoices,
  };
};
