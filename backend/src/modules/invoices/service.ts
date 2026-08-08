import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { PaymentMethod, WalletTxType, InvoiceStatus, LogModule, LogType } from '@prisma/client';
import { socketManager } from '../../config/socket';

/**
 * Lấy danh sách tất cả hóa đơn trong hệ thống
 */
export async function getInvoices() {
  return await prisma.invoice.findMany({
    include: {
      patient: { include: { tier: true, user: true } },
      dentist: { include: { user: true } },
      room: true,
      items: { include: { service: true } },
      payments: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 200, // Giới hạn 200 hóa đơn gần nhất để tránh tải không giới hạn
  });
}

/**
 * Lấy chi tiết hóa đơn theo ID
 */
export async function getInvoiceById(invoiceId: bigint) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
    include: {
      patient: { include: { tier: true, user: true } },
      dentist: { include: { user: true } },
      room: true,
      items: { include: { service: true } },
      payments: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại.');
  }

  return invoice;
}

/**
 * Tạo mới hóa đơn khi hoàn thành khám (gọi từ medicalRecord service)
 */
export async function createInvoice(data: {
  patientId: bigint;
  medicalRecordId?: bigint;
  dentistId?: bigint;
  roomId?: number | null;
  serviceIds: bigint[];
}) {
  // 1. Lấy thông tin bệnh nhân và hạng thành viên
  const patient = await prisma.patient.findUnique({
    where: { patientId: data.patientId },
    include: { tier: true, user: true },
  });

  if (!patient) {
    throw new AppError(404, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại.');
  }

  // 2. Lấy thông tin các dịch vụ
  const services = await prisma.service.findMany({
    where: {
      serviceId: { in: data.serviceIds },
    },
  });

  if (services.length === 0) {
    throw new AppError(400, 'NO_SERVICES_FOUND', 'Không tìm thấy dịch vụ nào.');
  }

  // Tính tổng tiền dựa trên số lần xuất hiện của dịch vụ trong danh sách đầu vào
  let totalPrice = 0;
  const itemsData: { serviceId: bigint; price: number; quantity: number }[] = [];

  const serviceCountMap = new Map<string, number>();
  for (const id of data.serviceIds) {
    const key = id.toString();
    serviceCountMap.set(key, (serviceCountMap.get(key) || 0) + 1);
  }

  for (const svc of services) {
    const qty = serviceCountMap.get(svc.serviceId.toString()) || 1;
    const price = Number(svc.price);
    totalPrice += price * qty;
    itemsData.push({
      serviceId: svc.serviceId,
      price,
      quantity: qty,
    });
  }

  // 3. Tính chiết khấu hội viên
  const discountPercent = Number(patient.tier.discountPercent) / 100;
  const memberDiscount = Math.round(totalPrice * discountPercent);
  const netPrice = totalPrice - memberDiscount;

  // 4. Tạo Invoice và các InvoiceItems tương ứng bằng Transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        patientId: data.patientId,
        medicalRecordId: data.medicalRecordId || null,
        dentistId: data.dentistId || null,
        roomId: data.roomId || null,
        totalPrice,
        insuranceDiscount: 0,
        memberDiscount,
        netPrice,
        paidAmount: 0,
        remainingAmount: netPrice,
        status: 'Pending',
      },
    });

    await tx.invoiceItem.createMany({
      data: itemsData.map((item) => ({
        invoiceId: newInvoice.invoiceId,
        serviceId: item.serviceId,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    return newInvoice;
  });

  return invoice;
}

/**
 * Xử lý thanh toán hóa đơn
 */
export async function processPayment(
  invoiceId: bigint,
  data: {
    amount: number;
    method: PaymentMethod;
    cashierUserId?: bigint;
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Tìm hóa đơn và thông tin bệnh nhân liên quan
    const invoice = await tx.invoice.findUnique({
      where: { invoiceId },
      include: { patient: true },
    });

    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại.');
    }

    if (invoice.status === 'Paid') {
      throw new AppError(400, 'INVOICE_ALREADY_PAID', 'Hóa đơn đã được thanh toán đầy đủ.');
    }

    const remaining = Number(invoice.remainingAmount);
    const amountToPay = Math.min(data.amount, remaining);

    if (amountToPay <= 0) {
      throw new AppError(400, 'INVALID_PAYMENT_AMOUNT', 'Số tiền thanh toán phải lớn hơn 0.');
    }

    // 2. Nếu thanh toán bằng ví điện tử thành viên
    if (data.method === 'Wallet') {
      const balance = Number(invoice.patient.walletBalance);
      if (balance < amountToPay) {
        throw new AppError(400, 'INSUFFICIENT_WALLET_BALANCE', 'Số dư ví bệnh nhân không đủ.');
      }

      // Khấu trừ số dư ví bệnh nhân
      await tx.patient.update({
        where: { patientId: invoice.patientId },
        data: {
          walletBalance: { decrement: amountToPay },
        },
      });

      // Tạo giao dịch ví dạng PaymentDeduct
      await tx.walletTransaction.create({
        data: {
          patientId: invoice.patientId,
          amount: amountToPay,
          type: 'PaymentDeduct',
          relatedInvoiceId: invoiceId,
        },
      });
    }

    // 3. Ghi nhận thông tin thanh toán (Payment)
    await tx.payment.create({
      data: {
        invoiceId,
        cashierUserId: data.cashierUserId || null,
        amount: amountToPay,
        method: data.method,
      },
    });

    // 4. Cập nhật số tiền đã trả, còn nợ và trạng thái hóa đơn
    const newPaidAmount = Number(invoice.paidAmount) + amountToPay;
    const newRemainingAmount = Math.max(0, Number(invoice.netPrice) - newPaidAmount);
    const newStatus: InvoiceStatus = newRemainingAmount === 0 ? 'Paid' : 'PartiallyPaid';

    const updatedInvoice = await tx.invoice.update({
      where: { invoiceId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
      },
      include: {
        patient: { include: { tier: true, user: true } },
        items: { include: { service: true } },
        payments: true,
      },
    });

    // 5. Ghi nhận Log hệ thống
    await tx.systemLog.create({
      data: {
        module: LogModule.CASHIER,
        logType: LogType.SUCCESS,
        message: `Thanh toán ₫${amountToPay.toLocaleString()} thành công cho hóa đơn INV-${invoiceId} bằng [${data.method}].`,
        actorUserId: data.cashierUserId || null,
      },
    });

    return updatedInvoice;
  });
}

/**
 * Nạp tiền vào ví của bệnh nhân
 */
export async function rechargeWallet(patientId: bigint, amount: number, actorUserId?: bigint) {
  if (amount <= 0) {
    throw new AppError(400, 'INVALID_RECHARGE_AMOUNT', 'Số tiền nạp phải lớn hơn 0.');
  }

  return await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { patientId },
    });

    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại.');
    }

    // Tăng số dư ví bệnh nhân
    const updatedPatient = await tx.patient.update({
      where: { patientId },
      data: {
        walletBalance: { increment: amount },
      },
      include: {
        tier: true,
        user: true,
      },
    });

    // Tạo giao dịch ví dạng Recharge
    await tx.walletTransaction.create({
      data: {
        patientId,
        amount,
        type: 'Recharge',
      },
    });

    // Ghi nhận Log hệ thống
    await tx.systemLog.create({
      data: {
        module: LogModule.SYSTEM,
        logType: LogType.SUCCESS,
        message: `Nạp ₫${amount.toLocaleString()} thành công vào ví của bệnh nhân ${updatedPatient.user.fullName}.`,
        actorUserId: actorUserId || null,
      },
    });

    return updatedPatient;
  });
}

/**
 * Lấy lịch sử hóa đơn và giao dịch ví của một bệnh nhân
 */
export async function getPatientBilling(patientId: bigint) {
  const patient = await prisma.patient.findUnique({
    where: { patientId },
    include: { tier: true },
  });

  if (!patient) {
    throw new AppError(404, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại.');
  }

  const invoices = await prisma.invoice.findMany({
    where: { patientId },
    include: {
      items: { include: { service: true } },
      payments: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const walletTransactions = await prisma.walletTransaction.findMany({
    where: { patientId },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    patient,
    invoices,
    walletTransactions,
  };
}

/**
 * Tạo URL thanh toán VNPay cho hóa đơn
 */
export async function createVnPayUrlForInvoice(
  invoiceId: bigint,
  returnUrl?: string,
  ipAddr?: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
    include: { patient: true },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại.');
  }

  if (invoice.status === 'Paid') {
    throw new AppError(400, 'INVOICE_ALREADY_PAID', 'Hóa đơn đã được thanh toán đầy đủ.');
  }

  const remaining = Number(invoice.remainingAmount);
  if (remaining <= 0) {
    throw new AppError(400, 'INVALID_PAYMENT_AMOUNT', 'Số tiền còn lại không hợp lệ.');
  }

  const { vnpayHelper } = await import('../../config/vnpay');

  const checkoutUrl = vnpayHelper.createPaymentUrl({
    invoiceId: String(invoiceId),
    amount: remaining,
    orderInfo: `Thanh toan hoa don INV${invoiceId}`,
    ipAddr,
    returnUrl,
  });

  return {
    checkoutUrl,
    amount: remaining,
    invoiceId: String(invoiceId),
  };
}

/**
 * Xử lý kết quả trả về từ VNPay (ReturnUrl hoặc IPN)
 */
export async function handleVnPayReturn(vnpParams: Record<string, any>) {
  const { vnpayHelper } = await import('../../config/vnpay');
  const result = vnpayHelper.verifyReturn(vnpParams);

  if (!result.isValid) {
    throw new AppError(400, 'INVALID_VNPAY_SIGNATURE', 'Chữ ký VNPay không hợp lệ.');
  }

  const invoiceId = BigInt(result.invoiceId);
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại.');
  }

  if (result.isSuccess && invoice.status !== 'Paid') {
    // Cập nhật trạng thái thanh toán
    const updatedInvoice = await processPayment(invoiceId, {
      amount: result.amount || Number(invoice.remainingAmount),
      method: PaymentMethod.Transfer,
    });

    socketManager.emit('invoice:paid', {
      invoiceId: String(invoiceId),
      method: PaymentMethod.Transfer,
      viaVNPay: true,
      amount: result.amount,
    });

    return {
      success: true,
      message: 'Thanh toán VNPay thành công',
      data: updatedInvoice,
    };
  }

  return {
    success: result.isSuccess,
    message: result.isSuccess ? 'Hóa đơn đã được thanh toán trước đó' : `Thanh toán thất bại (Mã lỗi VNPay: ${result.responseCode})`,
    invoice,
  };
}

