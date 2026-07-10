import { request } from './apiClient';
import { Invoice } from '../../types/clinic';

export const invoiceApi = {
  /**
   * Lấy danh sách toàn bộ hóa đơn
   */
  getInvoices: () => request<Invoice[]>('/invoices'),

  /**
   * Thanh toán hóa đơn (dùng số dư ví hoặc tiền mặt/chuyển khoản)
   */
  pay: (invoiceId: string, method: Invoice['paymentMethod'], payAmount?: number) => {
    const rawInvoiceId = invoiceId.split('-')[1] || invoiceId;
    return request<any>(`/invoices/${rawInvoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        method,
        amount: payAmount,
      }),
    });
  },

  /**
   * Nạp thêm tiền vào tài khoản ví của bệnh nhân
   */
  rechargeWallet: (patientId: string, amount: number) => {
    const rawPatientId = patientId.split('-')[1] || patientId;
    return request<any>(`/invoices/patients/${rawPatientId}/recharge`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};
