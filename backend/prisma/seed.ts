import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'seed-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Không tìm thấy file seed-data.json!');
    console.log('👉 Vui lòng chạy lệnh: npm run seed:export trước khi seed.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log('🧹 [1/2] Đang xóa dữ liệu cũ theo thứ tự ràng buộc khóa ngoại...');

  await prisma.systemLog.deleteMany();
  await prisma.serviceReview.deleteMany();
  await prisma.shiftChangeAffectedItem.deleteMany();
  await prisma.shiftChangeNotification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.medicalRecordService.deleteMany();
  await prisma.medicalRecordFile.deleteMany();
  await prisma.medicalRecordTooth.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.queueTicket.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.dentistShift.deleteMany();
  await prisma.dentistProfileItem.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.dentist.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.staffPermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.clinicOperatingHour.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.room.deleteMany();
  await prisma.membershipTier.deleteMany();
  await prisma.role.deleteMany();

  console.log('🌱 [2/2] Đang nạp dữ liệu mẫu vào cơ sở dữ liệu...');

  // 1. Roles
  if (data.roles?.length) {
    await prisma.role.createMany({ data: data.roles });
    console.log(`  ✓ Roles: ${data.roles.length}`);
  }

  // 2. Membership Tiers
  if (data.membershipTiers?.length) {
    await prisma.membershipTier.createMany({ data: data.membershipTiers });
    console.log(`  ✓ Membership Tiers: ${data.membershipTiers.length}`);
  }

  // 3. Rooms
  if (data.rooms?.length) {
    await prisma.room.createMany({ data: data.rooms });
    console.log(`  ✓ Rooms: ${data.rooms.length}`);
  }

  // 4. Service Categories
  if (data.serviceCategories?.length) {
    await prisma.serviceCategory.createMany({ data: data.serviceCategories });
    console.log(`  ✓ Service Categories: ${data.serviceCategories.length}`);
  }

  // 5. Clinic Operating Hours
  if (data.clinicOperatingHours?.length) {
    for (const h of data.clinicOperatingHours) {
      await prisma.clinicOperatingHour.create({
        data: {
          ...h,
          openTime: new Date(h.openTime),
          closeTime: new Date(h.closeTime),
          lunchStart: h.lunchStart ? new Date(h.lunchStart) : null,
          lunchEnd: h.lunchEnd ? new Date(h.lunchEnd) : null,
        },
      });
    }
    console.log(`  ✓ Clinic Operating Hours: ${data.clinicOperatingHours.length}`);
  }

  // 6. Users
  if (data.users?.length) {
    for (const u of data.users) {
      await prisma.user.create({
        data: {
          ...u,
          userId: BigInt(u.userId),
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }
    console.log(`  ✓ Users: ${data.users.length}`);
  }

  // 7. Staff Permissions
  if (data.staffPermissions?.length) {
    for (const sp of data.staffPermissions) {
      await prisma.staffPermission.create({
        data: {
          ...sp,
          userId: BigInt(sp.userId),
        },
      });
    }
    console.log(`  ✓ Staff Permissions: ${data.staffPermissions.length}`);
  }

  // 8. Medicines
  if (data.medicines?.length) {
    for (const m of data.medicines) {
      await prisma.medicine.create({
        data: {
          ...m,
          medicineId: BigInt(m.medicineId),
          createdByUserId: m.createdByUserId ? BigInt(m.createdByUserId) : null,
          createdAt: new Date(m.createdAt),
        },
      });
    }
    console.log(`  ✓ Medicines: ${data.medicines.length}`);
  }

  // 9. Dentists & Dentist Profile Items
  if (data.dentists?.length) {
    for (const d of data.dentists) {
      await prisma.dentist.create({
        data: {
          ...d,
          dentistId: BigInt(d.dentistId),
          userId: BigInt(d.userId),
        },
      });
    }
    console.log(`  ✓ Dentists: ${data.dentists.length}`);
  }

  if (data.dentistProfileItems?.length) {
    for (const item of data.dentistProfileItems) {
      await prisma.dentistProfileItem.create({
        data: {
          ...item,
          id: BigInt(item.id),
          dentistId: BigInt(item.dentistId),
        },
      });
    }
    console.log(`  ✓ Dentist Profile Items: ${data.dentistProfileItems.length}`);
  }

  // 10. Patients
  if (data.patients?.length) {
    for (const p of data.patients) {
      await prisma.patient.create({
        data: {
          ...p,
          patientId: BigInt(p.patientId),
          userId: BigInt(p.userId),
          unlockedByUserId: p.unlockedByUserId ? BigInt(p.unlockedByUserId) : null,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
          createdAt: new Date(p.createdAt),
        },
      });
    }
    console.log(`  ✓ Patients: ${data.patients.length}`);
  }

  // 11. Services
  if (data.services?.length) {
    for (const s of data.services) {
      await prisma.service.create({
        data: {
          ...s,
          serviceId: BigInt(s.serviceId),
        },
      });
    }
    console.log(`  ✓ Services: ${data.services.length}`);
  }

  // 12. Dentist Shifts
  if (data.dentistShifts?.length) {
    for (const s of data.dentistShifts) {
      await prisma.dentistShift.create({
        data: {
          ...s,
          shiftId: BigInt(s.shiftId),
          dentistId: BigInt(s.dentistId),
          workDate: new Date(s.workDate),
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
        },
      });
    }
    console.log(`  ✓ Dentist Shifts: ${data.dentistShifts.length}`);
  }

  // 13. Treatment Plans
  if (data.treatmentPlans?.length) {
    for (const tp of data.treatmentPlans) {
      await prisma.treatmentPlan.create({
        data: {
          ...tp,
          planId: BigInt(tp.planId),
          patientId: BigInt(tp.patientId),
          dentistId: BigInt(tp.dentistId),
          createdAt: new Date(tp.createdAt),
        },
      });
    }
    console.log(`  ✓ Treatment Plans: ${data.treatmentPlans.length}`);
  }

  // 14. Appointments
  if (data.appointments?.length) {
    for (const app of data.appointments) {
      await prisma.appointment.create({
        data: {
          ...app,
          appointmentId: BigInt(app.appointmentId),
          patientId: BigInt(app.patientId),
          dentistId: BigInt(app.dentistId),
          serviceId: BigInt(app.serviceId),
          startTime: new Date(app.startTime),
          endTime: new Date(app.endTime),
          createdAt: new Date(app.createdAt),
          cancelledAt: app.cancelledAt ? new Date(app.cancelledAt) : null,
        },
      });
    }
    console.log(`  ✓ Appointments: ${data.appointments.length}`);
  }

  // 15. Queue Tickets
  if (data.queueTickets?.length) {
    for (const q of data.queueTickets) {
      await prisma.queueTicket.create({
        data: {
          ...q,
          ticketId: BigInt(q.ticketId),
          appointmentId: q.appointmentId ? BigInt(q.appointmentId) : null,
          patientId: BigInt(q.patientId),
          dentistId: BigInt(q.dentistId),
          serviceId: q.serviceId ? BigInt(q.serviceId) : null,
          checkInTime: new Date(q.checkInTime),
          startTreatmentTime: q.startTreatmentTime ? new Date(q.startTreatmentTime) : null,
          endTreatmentTime: q.endTreatmentTime ? new Date(q.endTreatmentTime) : null,
        },
      });
    }
    console.log(`  ✓ Queue Tickets: ${data.queueTickets.length}`);
  }

  // 16. Medical Records & Details
  if (data.medicalRecords?.length) {
    for (const mr of data.medicalRecords) {
      await prisma.medicalRecord.create({
        data: {
          ...mr,
          recordId: BigInt(mr.recordId),
          patientId: BigInt(mr.patientId),
          dentistId: BigInt(mr.dentistId),
          queueTicketId: mr.queueTicketId ? BigInt(mr.queueTicketId) : null,
          treatmentPlanId: mr.treatmentPlanId ? BigInt(mr.treatmentPlanId) : null,
          visitDate: new Date(mr.visitDate),
          createdAt: new Date(mr.createdAt),
        },
      });
    }
    console.log(`  ✓ Medical Records: ${data.medicalRecords.length}`);
  }

  if (data.medicalRecordTeeth?.length) {
    for (const tooth of data.medicalRecordTeeth) {
      await prisma.medicalRecordTooth.create({
        data: {
          ...tooth,
          id: BigInt(tooth.id),
          recordId: BigInt(tooth.recordId),
        },
      });
    }
    console.log(`  ✓ Medical Record Teeth: ${data.medicalRecordTeeth.length}`);
  }

  if (data.medicalRecordFiles?.length) {
    for (const f of data.medicalRecordFiles) {
      await prisma.medicalRecordFile.create({
        data: {
          ...f,
          fileId: BigInt(f.fileId),
          recordId: BigInt(f.recordId),
        },
      });
    }
    console.log(`  ✓ Medical Record Files: ${data.medicalRecordFiles.length}`);
  }

  if (data.medicalRecordServices?.length) {
    for (const mrs of data.medicalRecordServices) {
      await prisma.medicalRecordService.create({
        data: {
          recordId: BigInt(mrs.recordId),
          serviceId: BigInt(mrs.serviceId),
        },
      });
    }
    console.log(`  ✓ Medical Record Services: ${data.medicalRecordServices.length}`);
  }

  // 17. Invoices & Items & Payments
  if (data.invoices?.length) {
    for (const inv of data.invoices) {
      await prisma.invoice.create({
        data: {
          ...inv,
          invoiceId: BigInt(inv.invoiceId),
          patientId: BigInt(inv.patientId),
          medicalRecordId: inv.medicalRecordId ? BigInt(inv.medicalRecordId) : null,
          dentistId: inv.dentistId ? BigInt(inv.dentistId) : null,
          createdAt: new Date(inv.createdAt),
        },
      });
    }
    console.log(`  ✓ Invoices: ${data.invoices.length}`);
  }

  if (data.invoiceItems?.length) {
    for (const item of data.invoiceItems) {
      await prisma.invoiceItem.create({
        data: {
          ...item,
          invoiceItemId: BigInt(item.invoiceItemId),
          invoiceId: BigInt(item.invoiceId),
          serviceId: BigInt(item.serviceId),
        },
      });
    }
    console.log(`  ✓ Invoice Items: ${data.invoiceItems.length}`);
  }

  if (data.payments?.length) {
    for (const p of data.payments) {
      await prisma.payment.create({
        data: {
          ...p,
          paymentId: BigInt(p.paymentId),
          invoiceId: BigInt(p.invoiceId),
          cashierUserId: p.cashierUserId ? BigInt(p.cashierUserId) : null,
          paidAt: new Date(p.paidAt),
        },
      });
    }
    console.log(`  ✓ Payments: ${data.payments.length}`);
  }

  // 18. Wallet Transactions
  if (data.walletTransactions?.length) {
    for (const wt of data.walletTransactions) {
      await prisma.walletTransaction.create({
        data: {
          ...wt,
          walletTxId: BigInt(wt.walletTxId),
          patientId: BigInt(wt.patientId),
          relatedInvoiceId: wt.relatedInvoiceId ? BigInt(wt.relatedInvoiceId) : null,
          createdAt: new Date(wt.createdAt),
        },
      });
    }
    console.log(`  ✓ Wallet Transactions: ${data.walletTransactions.length}`);
  }

  // 19. Shift Change Notifications & Items
  if (data.shiftChangeNotifications?.length) {
    for (const notif of data.shiftChangeNotifications) {
      await prisma.shiftChangeNotification.create({
        data: {
          ...notif,
          notifId: BigInt(notif.notifId),
          shiftId: notif.shiftId ? BigInt(notif.shiftId) : null,
          originalDentistId: BigInt(notif.originalDentistId),
          newDentistId: BigInt(notif.newDentistId),
          shiftDate: new Date(notif.shiftDate),
          createdAt: new Date(notif.createdAt),
        },
      });
    }
    console.log(`  ✓ Shift Change Notifications: ${data.shiftChangeNotifications.length}`);
  }

  if (data.shiftChangeAffectedItems?.length) {
    for (const aff of data.shiftChangeAffectedItems) {
      await prisma.shiftChangeAffectedItem.create({
        data: {
          ...aff,
          id: BigInt(aff.id),
          notifId: BigInt(aff.notifId),
          appointmentId: BigInt(aff.appointmentId),
        },
      });
    }
    console.log(`  ✓ Shift Change Affected Items: ${data.shiftChangeAffectedItems.length}`);
  }

  // 20. Service Reviews
  if (data.serviceReviews?.length) {
    for (const rev of data.serviceReviews) {
      await prisma.serviceReview.create({
        data: {
          ...rev,
          reviewId: BigInt(rev.reviewId),
          patientId: BigInt(rev.patientId),
          appointmentId: rev.appointmentId ? BigInt(rev.appointmentId) : null,
          serviceId: rev.serviceId ? BigInt(rev.serviceId) : null,
          createdAt: new Date(rev.createdAt),
          updatedAt: new Date(rev.updatedAt),
          aiRepliedAt: rev.aiRepliedAt ? new Date(rev.aiRepliedAt) : null,
        },
      });
    }
    console.log(`  ✓ Service Reviews: ${data.serviceReviews.length}`);
  }

  // 21. System Logs
  if (data.systemLogs?.length) {
    for (const log of data.systemLogs) {
      await prisma.systemLog.create({
        data: {
          ...log,
          logId: BigInt(log.logId),
          actorUserId: log.actorUserId ? BigInt(log.actorUserId) : null,
          createdAt: new Date(log.createdAt),
        },
      });
    }
    console.log(`  ✓ System Logs: ${data.systemLogs.length}`);
  }

  console.log('\n🎉 Hoàn tất! Đã nạp thành công toàn bộ dữ liệu mẫu vào Database!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
