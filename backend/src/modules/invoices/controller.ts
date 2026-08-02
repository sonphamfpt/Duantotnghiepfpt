import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { PayInvoiceSchema, RechargeWalletSchema } from './dto';
import { serializeBigInt } from '../../utils/serialize';
import { socketManager } from '../../config/socket';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

/**
 * Lấy tất cả hóa đơn
 */
export async function getInvoicesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getInvoices();
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy chi tiết hóa đơn theo ID
 */
export async function getInvoiceByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoiceId = parseId(req.params.id);
    const data = await service.getInvoiceById(invoiceId);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Thanh toán hóa đơn
 */
export async function payInvoiceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoiceId = parseId(req.params.id);
    const body = PayInvoiceSchema.parse(req.body);
    
    // Lấy thông tin user đăng nhập nếu có thông qua authGuard
    const cashierUserId = (req as any).user?.userId ? parseId((req as any).user.userId) : undefined;

    const data = await service.processPayment(invoiceId, {
      amount: body.amount,
      method: body.method,
      cashierUserId,
    });

    // Emit WebSocket event — thông báo hóa đơn đã thanh toán cho toàn hệ thống
    socketManager.emit('invoice:paid', {
      invoiceId: String(invoiceId),
      method: body.method,
    });

    return res.status(200).json({
      success: true,
      message: 'Thanh toán hóa đơn thành công',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Nạp tiền ví bệnh nhân
 */
export async function rechargeWalletHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = parseId(req.params.patientId);
    const body = RechargeWalletSchema.parse(req.body);
    
    const actorUserId = (req as any).user?.userId ? parseId((req as any).user.userId) : undefined;

    const data = await service.rechargeWallet(patientId, body.amount, actorUserId);

    return res.status(200).json({
      success: true,
      message: 'Nạp tiền vào ví thành công',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy lịch sử hóa đơn và giao dịch ví của bệnh nhân
 */
export async function getPatientBillingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = parseId(req.params.patientId);
    const data = await service.getPatientBilling(patientId);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Tạo URL thanh toán VNPay
 */
export async function createVnPayUrlHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoiceId = parseId(req.params.id);
    const { returnUrl } = req.body || {};
    const ipAddr = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const data = await service.createVnPayUrlForInvoice(invoiceId, returnUrl, ipAddr);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Xử lý Callback ReturnUrl / IPN từ VNPay
 */
export async function vnPayReturnHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const vnpParams = req.query;
    const data = await service.handleVnPayReturn(vnpParams as Record<string, any>);

    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

