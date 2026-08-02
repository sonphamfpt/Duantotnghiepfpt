import crypto from 'crypto';
import qs from 'qs';
import { env } from './env';

function sortObject(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  const str: string[] = [];
  let key: string;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let keyIdx = 0; keyIdx < str.length; keyIdx++) {
    key = str[keyIdx];
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

export interface CreateVnPayUrlParams {
  invoiceId: string;
  amount: number;
  orderInfo?: string;
  ipAddr?: string;
  returnUrl?: string;
}

export const vnpayHelper = {
  /**
   * Tạo URL thanh toán VNPay Sandbox
   */
  createPaymentUrl(params: CreateVnPayUrlParams): string {
    const date = new Date();
    // Định dạng YYYYMMDDHHmmss theo giờ VN (GMT+7)
    const tzOffset = 7 * 60; // offset in minutes
    const localDate = new Date(date.getTime() + (date.getTimezoneOffset() + tzOffset) * 60000);

    const year = localDate.getFullYear();
    const month = ('0' + (localDate.getMonth() + 1)).slice(-2);
    const day = ('0' + localDate.getDate()).slice(-2);
    const hours = ('0' + localDate.getHours()).slice(-2);
    const minutes = ('0' + localDate.getMinutes()).slice(-2);
    const seconds = ('0' + localDate.getSeconds()).slice(-2);
    const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;

    const tmnCode = env.VNP_TMN_CODE;
    const secretKey = env.VNP_HASH_SECRET;
    const vnpUrl = env.VNP_URL;
    const returnUrl = params.returnUrl || env.VNP_RETURN_URL;

    // TxnRef phải duy nhất mỗi lần tạo link
    const txnRef = `${params.invoiceId}_${Date.now()}`;
    const amount = Math.round(params.amount) * 100; // VNPay nhân 100

    let vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: params.orderInfo || `Thanh toan hoa don ${params.invoiceId}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: params.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    vnpParams = sortObject(vnpParams);

    const signData = qs.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnpParams['vnp_SecureHash'] = signed;

    return `${vnpUrl}?${qs.stringify(vnpParams, { encode: false })}`;
  },

  /**
   * Xác thực checksum phản hồi từ VNPay (ReturnUrl hoặc IPN)
   */
  verifyReturn(vnpParams: Record<string, any>): { isValid: boolean; isSuccess: boolean; invoiceId: string; responseCode: string; amount: number } {
    const secureHash = vnpParams['vnp_SecureHash'];
    const responseCode = vnpParams['vnp_ResponseCode'] || '';
    const txnRef = vnpParams['vnp_TxnRef'] || '';
    const invoiceId = txnRef.split('_')[0];
    const amount = Number(vnpParams['vnp_Amount'] || 0) / 100;

    const cloneParams = { ...vnpParams };
    delete cloneParams['vnp_SecureHash'];
    delete cloneParams['vnp_SecureHashType'];

    const sorted = sortObject(cloneParams);
    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const isSuccess = isValid && responseCode === '00';

    return { isValid, isSuccess, invoiceId, responseCode, amount };
  },
};
