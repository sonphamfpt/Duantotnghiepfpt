import { prisma } from '../../config/prisma';

export async function getDashboardStatistics(startDate?: Date, endDate?: Date) {
  // 1. Phân tích khoảng thời gian lọc (Mặc định là 30 ngày gần đây)
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 2. Thống kê tổng doanh thu (Tổng tiền thực tế đã thu)
  const revenueAgg = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      paidAt: {
        gte: start,
        lte: end,
      },
    },
  });
  const totalRevenue = Number(revenueAgg._sum.amount || 0);

  // 3. Thống kê công nợ chưa thu (Tổng số tiền nợ còn lại của các hóa đơn trong khoảng thời gian)
  const receivablesAgg = await prisma.invoice.aggregate({
    _sum: {
      remainingAmount: true,
    },
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      status: {
        in: ['Pending', 'PartiallyPaid'],
      },
    },
  });
  const totalReceivables = Number(receivablesAgg._sum.remainingAmount || 0);

  // 4. Biểu đồ doanh thu theo ngày
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      amount: true,
      paidAt: true,
    },
    orderBy: {
      paidAt: 'asc',
    },
  });

  const dailyTrendMap: Record<string, number> = {};
  payments.forEach((p) => {
    const dayStr = p.paidAt.toISOString().split('T')[0];
    dailyTrendMap[dayStr] = (dailyTrendMap[dayStr] || 0) + Number(p.amount);
  });
  const dailyTrend = Object.keys(dailyTrendMap).map((date) => ({
    date,
    revenue: dailyTrendMap[date],
  }));

  // 5. Hiệu suất bác sĩ
  const dentistInvoices = await prisma.invoice.groupBy({
    by: ['dentistId'],
    _sum: {
      netPrice: true,
    },
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      dentistId: { not: null },
    },
  });

  const dentistRecords = await prisma.medicalRecord.groupBy({
    by: ['dentistId'],
    _count: {
      recordId: true,
    },
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  const dentists = await prisma.dentist.findMany({
    include: {
      user: true,
    },
  });

  const dentistPerformance = dentists.map((d) => {
    const invoiceSum = dentistInvoices.find((i) => i.dentistId === d.dentistId)?._sum.netPrice || 0;
    const recordCount = dentistRecords.find((r) => r.dentistId === d.dentistId)?._count.recordId || 0;
    return {
      dentistId: `D-${d.dentistId.toString().padStart(2, '0')}`,
      dentistName: d.user.fullName,
      specialty: d.specialty || 'Nha sĩ',
      treatmentsCount: Number(recordCount),
      revenueGenerated: Number(invoiceSum),
    };
  });

  // 6. Cơ cấu doanh thu theo Dịch Vụ
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    },
    include: {
      service: true,
    },
  });

  const serviceBreakdownMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
  invoiceItems.forEach((item) => {
    const sId = item.serviceId.toString();
    const cost = Number(item.price) * item.quantity;
    if (!serviceBreakdownMap[sId]) {
      serviceBreakdownMap[sId] = {
        name: item.service.name,
        revenue: 0,
        quantity: 0,
      };
    }
    serviceBreakdownMap[sId].revenue += cost;
    serviceBreakdownMap[sId].quantity += item.quantity;
  });

  const serviceBreakdown = Object.keys(serviceBreakdownMap).map((sId) => ({
    serviceId: `S-${sId.padStart(2, '0')}`,
    serviceName: serviceBreakdownMap[sId].name,
    revenue: serviceBreakdownMap[sId].revenue,
    quantity: serviceBreakdownMap[sId].quantity,
  })).sort((a, b) => b.revenue - a.revenue);

  // 7. Thống kê tỷ lệ lịch hẹn
  const appointmentAgg = await prisma.appointment.groupBy({
    by: ['status'],
    _count: {
      appointmentId: true,
    },
    where: {
      startTime: {
        gte: start,
        lte: end,
      },
    },
  });

  const appointmentsRatio = appointmentAgg.map((item) => ({
    status: item.status,
    count: Number(item._count.appointmentId),
  }));

  return {
    totalRevenue,
    totalReceivables,
    dailyTrend,
    dentistPerformance,
    serviceBreakdown,
    appointmentsRatio,
  };
}
