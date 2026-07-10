import { Prisma } from '@prisma/client';

/**
 * Đệ quy chuyển đổi tất cả các thuộc tính kiểu BigInt thành String và Decimal thành Number
 * để tránh lỗi serialize JSON trong Node.js/Express.
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (obj instanceof Prisma.Decimal || (typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Decimal')) {
    return Number(obj.toString());
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

