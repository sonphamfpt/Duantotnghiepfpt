/**
 * 🧹 Script xóa sạch dữ liệu lịch hẹn và hồ sơ bệnh án để test lại từ đầu.
 * 
 * Dữ liệu GIỮ NGUYÊN: roles, users, patients, dentists, services, rooms, shifts, tiers
 * Dữ liệu XÓA: appointments, queue_tickets, medical_records, invoices, payments,
 *              treatment_plans, prescriptions, shift_change_notifications, system_logs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Bắt đầu xóa dữ liệu lịch hẹn & bệnh án test...\n');

  try {
    // 1. Xóa shift change affected items & notifications (phụ thuộc appointments)
    const deletedAffectedItems = await prisma.shiftChangeAffectedItem.deleteMany({});
    console.log(`  ✅ shift_change_affected_items: ${deletedAffectedItems.count} bản ghi`);

    const deletedShiftNotifs = await prisma.shiftChangeNotification.deleteMany({});
    console.log(`  ✅ shift_change_notifications: ${deletedShiftNotifs.count} bản ghi`);

    // 2. Xóa prescription items → prescriptions (phụ thuộc medical_records)
    const deletedPrescItems = await prisma.prescriptionItem.deleteMany({});
    console.log(`  ✅ prescription_items: ${deletedPrescItems.count} bản ghi`);

    const deletedPrescs = await prisma.prescription.deleteMany({});
    console.log(`  ✅ prescriptions: ${deletedPrescs.count} bản ghi`);

    // 3. Xóa medical record children
    const deletedMrTeeth = await prisma.medicalRecordTooth.deleteMany({});
    console.log(`  ✅ medical_record_teeth: ${deletedMrTeeth.count} bản ghi`);

    const deletedMrFiles = await prisma.medicalRecordFile.deleteMany({});
    console.log(`  ✅ medical_record_files: ${deletedMrFiles.count} bản ghi`);

    const deletedMrServices = await prisma.medicalRecordService.deleteMany({});
    console.log(`  ✅ medical_record_services: ${deletedMrServices.count} bản ghi`);

    // 4. Xóa wallet transactions & payments → invoices
    const deletedWalletTx = await prisma.walletTransaction.deleteMany({});
    console.log(`  ✅ wallet_transactions: ${deletedWalletTx.count} bản ghi`);

    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`  ✅ payments: ${deletedPayments.count} bản ghi`);

    // 5. Xóa invoice items → invoices
    const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({});
    console.log(`  ✅ invoice_items: ${deletedInvoiceItems.count} bản ghi`);

    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`  ✅ invoices: ${deletedInvoices.count} bản ghi`);

    // 6. Xóa medical records (sau khi đã xóa hết children và invoices)
    const deletedMedicalRecords = await prisma.medicalRecord.deleteMany({});
    console.log(`  ✅ medical_records: ${deletedMedicalRecords.count} bản ghi`);

    // 7. Xóa queue tickets (phụ thuộc appointments)
    const deletedQueue = await prisma.queueTicket.deleteMany({});
    console.log(`  ✅ queue_tickets: ${deletedQueue.count} bản ghi`);

    // 8. Xóa appointments
    const deletedAppointments = await prisma.appointment.deleteMany({});
    console.log(`  ✅ appointments: ${deletedAppointments.count} bản ghi`);

    // 9. Xóa treatment plans
    const deletedPlans = await prisma.treatmentPlan.deleteMany({});
    console.log(`  ✅ treatment_plans: ${deletedPlans.count} bản ghi`);

    // 10. Xóa system logs
    const deletedLogs = await prisma.systemLog.deleteMany({});
    console.log(`  ✅ system_logs: ${deletedLogs.count} bản ghi`);

    console.log('\n🎉 Xóa sạch dữ liệu test thành công!');
    console.log('📋 Dữ liệu giữ nguyên: roles, users, patients, dentists, services, rooms, shifts, tiers');
    console.log('🔄 Bạn có thể test lại flow đặt lịch → check-in → khám → thanh toán từ đầu.');

  } catch (error: any) {
    console.error('\n❌ Lỗi khi xóa dữ liệu:', error.message);
    throw error;
  }
}

cleanup()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
