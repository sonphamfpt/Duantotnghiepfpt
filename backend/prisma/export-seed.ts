import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function replacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

async function exportSeed() {
  console.log('⏳ Đang đọc dữ liệu từ database hiện tại...');

  const [
    roles,
    membershipTiers,
    rooms,
    serviceCategories,
    clinicOperatingHours,
    users,
    staffPermissions,
    medicines,
    dentists,
    dentistProfileItems,
    patients,
    services,
    dentistShifts,
    treatmentPlans,
    appointments,
    queueTickets,
    medicalRecords,
    medicalRecordTeeth,
    medicalRecordFiles,
    medicalRecordServices,
    invoices,
    invoiceItems,
    payments,
    walletTransactions,
    shiftChangeNotifications,
    shiftChangeAffectedItems,
    serviceReviews,
    systemLogs,
  ] = await Promise.all([
    prisma.role.findMany({ orderBy: { roleId: 'asc' } }),
    prisma.membershipTier.findMany({ orderBy: { tierId: 'asc' } }),
    prisma.room.findMany({ orderBy: { roomId: 'asc' } }),
    prisma.serviceCategory.findMany({ orderBy: { categoryId: 'asc' } }),
    prisma.clinicOperatingHour.findMany({ orderBy: { weekday: 'asc' } }),
    prisma.user.findMany({ orderBy: { userId: 'asc' } }),
    prisma.staffPermission.findMany({ orderBy: { userId: 'asc' } }),
    prisma.medicine.findMany({ orderBy: { medicineId: 'asc' } }),
    prisma.dentist.findMany({ orderBy: { dentistId: 'asc' } }),
    prisma.dentistProfileItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.patient.findMany({ orderBy: { patientId: 'asc' } }),
    prisma.service.findMany({ orderBy: { serviceId: 'asc' } }),
    prisma.dentistShift.findMany({ orderBy: { shiftId: 'asc' } }),
    prisma.treatmentPlan.findMany({ orderBy: { planId: 'asc' } }),
    prisma.appointment.findMany({ orderBy: { appointmentId: 'asc' } }),
    prisma.queueTicket.findMany({ orderBy: { ticketId: 'asc' } }),
    prisma.medicalRecord.findMany({ orderBy: { recordId: 'asc' } }),
    prisma.medicalRecordTooth.findMany({ orderBy: { id: 'asc' } }),
    prisma.medicalRecordFile.findMany({ orderBy: { fileId: 'asc' } }),
    prisma.medicalRecordService.findMany(),
    prisma.invoice.findMany({ orderBy: { invoiceId: 'asc' } }),
    prisma.invoiceItem.findMany({ orderBy: { invoiceItemId: 'asc' } }),
    prisma.payment.findMany({ orderBy: { paymentId: 'asc' } }),
    prisma.walletTransaction.findMany({ orderBy: { walletTxId: 'asc' } }),
    prisma.shiftChangeNotification.findMany({ orderBy: { notifId: 'asc' } }),
    prisma.shiftChangeAffectedItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.serviceReview.findMany({ orderBy: { reviewId: 'asc' } }),
    prisma.systemLog.findMany({ orderBy: { logId: 'asc' } }),
  ]);

  const summary = {
    roles: roles.length,
    membershipTiers: membershipTiers.length,
    rooms: rooms.length,
    serviceCategories: serviceCategories.length,
    clinicOperatingHours: clinicOperatingHours.length,
    users: users.length,
    staffPermissions: staffPermissions.length,
    medicines: medicines.length,
    dentists: dentists.length,
    dentistProfileItems: dentistProfileItems.length,
    patients: patients.length,
    services: services.length,
    dentistShifts: dentistShifts.length,
    treatmentPlans: treatmentPlans.length,
    appointments: appointments.length,
    queueTickets: queueTickets.length,
    medicalRecords: medicalRecords.length,
    medicalRecordTeeth: medicalRecordTeeth.length,
    medicalRecordFiles: medicalRecordFiles.length,
    medicalRecordServices: medicalRecordServices.length,
    invoices: invoices.length,
    invoiceItems: invoiceItems.length,
    payments: payments.length,
    walletTransactions: walletTransactions.length,
    shiftChangeNotifications: shiftChangeNotifications.length,
    shiftChangeAffectedItems: shiftChangeAffectedItems.length,
    serviceReviews: serviceReviews.length,
    systemLogs: systemLogs.length,
  };

  console.log('📊 Thống kê số lượng bản ghi:', summary);

  const payload = {
    _exportedAt: new Date().toISOString(),
    _summary: summary,
    roles,
    membershipTiers,
    rooms,
    serviceCategories,
    clinicOperatingHours,
    users,
    staffPermissions,
    medicines,
    dentists,
    dentistProfileItems,
    patients,
    services,
    dentistShifts,
    treatmentPlans,
    appointments,
    queueTickets,
    medicalRecords,
    medicalRecordTeeth,
    medicalRecordFiles,
    medicalRecordServices,
    invoices,
    invoiceItems,
    payments,
    walletTransactions,
    shiftChangeNotifications,
    shiftChangeAffectedItems,
    serviceReviews,
    systemLogs,
  };

  const outputPath = path.join(__dirname, 'seed-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, replacer, 2), 'utf-8');

  console.log(`\n✅ Xuất dữ liệu mẫu thành công vào: ${outputPath}`);
}

exportSeed()
  .catch((err) => {
    console.error('❌ Lỗi xuất dữ liệu:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
