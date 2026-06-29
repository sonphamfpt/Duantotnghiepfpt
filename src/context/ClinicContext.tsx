import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Service, Dentist, Patient, Appointment, QueueItem, Invoice, ClinicLog, MedicalRecord, ToothState, InvoiceItem, DoctorShift, ShiftChangeNotification } from '../types/clinic';
import {
  INITIAL_SERVICES,
  INITIAL_DENTISTS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_QUEUE,
  INITIAL_INVOICES,
  INITIAL_LOGS,
  INITIAL_MEDICAL_RECORDS,
  INITIAL_DENTIST_SHIFTS,
  INITIAL_SHIFT_NOTIFICATIONS
} from '../services/mockData';

interface ClinicContextType {
  services: Service[];
  dentists: Dentist[];
  patients: Patient[];
  appointments: Appointment[];
  queue: QueueItem[];
  invoices: Invoice[];
  logs: ClinicLog[];
  medicalRecords: MedicalRecord[];
  addLog: (module: ClinicLog['module'], type: ClinicLog['type'], message: string) => void;
  checkInPatient: (patientId: string, dentistId: string, customRoom?: string, serviceName?: string) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => Appointment;
  startTreatment: (queueId: string) => void;
  completeTreatment: (
    queueId: string,
    treatments: ToothState[],
    notes: string,
    performedServices: string[], // service ids
    treatmentType?: 'independent' | 'plan_init' | 'plan_session',
    selectedPlanId?: string,
    files?: { id: string; type: 'pdf' | 'image' | 'prescription'; title: string; size: string; url?: string }[]
  ) => void;
  processPayment: (invoiceId: string, paymentMethod: Invoice['paymentMethod'], payAmount?: number) => void;
  addService: (service: Omit<Service, 'id' | 'isActive'>) => void;
  updateServicePrice: (serviceId: string, newPrice: number) => void;
  toggleServiceActive: (serviceId: string) => void;
  addPatient: (patient: Omit<Patient, 'id' | 'points' | 'tier' | 'balance'>) => Patient;
  rechargeWallet: (patientId: string, amount: number) => void;
  updatePatientDetails: (patientId: string, details: Partial<Pick<Patient, 'criticalAllergy' | 'condition' | 'name' | 'phone' | 'age' | 'gender'>>) => void;
  unlockPatient: (patientId: string) => void;
  lockPatient: (patientId: string) => void;
  rescheduleAppointment: (appointmentId: string, newTime: string, newDentistId?: string, newDentistName?: string) => void;

  cancelAppointment: (appointmentId: string) => void;
  doctorShifts: DoctorShift[];
  swapShifts: (shiftId1: string, shiftId2: string, conflictAppointmentIds?: string[]) => void;
  transferShift: (shiftId: string, targetDentistId: string, conflictAppointmentIds?: string[]) => void;
  changeShiftRoom: (shiftId: string, newRoom: string) => void;
  addShift: (shift: Omit<DoctorShift, 'id'>) => void;
  deleteShift: (shiftId: string) => void;
  shiftChangeNotifications: ShiftChangeNotification[];
  resolveShiftConflict_Update: (notifId: string, appointmentId: string) => void;
  resolveShiftConflict_Cancel: (notifId: string, appointmentId: string) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [dentists, setDentists] = useState<Dentist[]>(INITIAL_DENTISTS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [logs, setLogs] = useState<ClinicLog[]>(INITIAL_LOGS);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(INITIAL_MEDICAL_RECORDS);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>(INITIAL_DENTIST_SHIFTS);
  const [shiftChangeNotifications, setShiftChangeNotifications] = useState<ShiftChangeNotification[]>(INITIAL_SHIFT_NOTIFICATIONS);

  // Auto-increment elapsed time for active treatments in queue to simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue((prevQueue) =>
        prevQueue.map((item) => {
          if (item.status === 'In Chair' && item.elapsedTimeMin !== undefined) {
            return { ...item, elapsedTimeMin: item.elapsedTimeMin + 1 };
          }
          if (item.status === 'Waiting') {
            return { ...item, waitTimeMin: item.waitTimeMin + 1 };
          }
          return item;
        })
      );
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const addLog = (module: ClinicLog['module'], type: ClinicLog['type'], message: string) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const newLog: ClinicLog = {
      id: `L-${Math.random().toString(36).substr(2, 9)}`,
      time,
      module,
      type,
      message
    };
    setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 100)); // cap at 100 logs
  };

  const addPatient = (newPatientData: Omit<Patient, 'id' | 'points' | 'tier' | 'balance'>) => {
    const id = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient: Patient = {
      ...newPatientData,
      id,
      balance: 0,
      tier: 'Standard',
      points: 100
    };
    setPatients((prev) => [...prev, newPatient]);
    addLog('RECEPTION', 'SUCCESS', `Bệnh nhân mới đăng ký: ${newPatient.name} (ID: ${id})`);
    return newPatient;
  };

  const rechargeWallet = (patientId: string, amount: number) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === patientId) {
          const newBalance = p.balance + amount;
          let tier = p.tier;
          // Upgrade tiers based on total balance/points mock
          const newPoints = p.points + Math.floor(amount / 10000);
          if (newPoints >= 8000) tier = 'Diamond';
          else if (newPoints >= 3000) tier = 'Platinum';
          else if (newPoints >= 1500) tier = 'Gold';
          
          addLog('SYSTEM', 'SUCCESS', `Bệnh nhân ${p.name} nạp ₫${amount.toLocaleString()} vào ví. Số dư mới: ₫${newBalance.toLocaleString()}`);
          return { ...p, balance: newBalance, points: newPoints, tier };
        }
        return p;
      })
    );
  };

  const updatePatientDetails = (
    patientId: string,
    details: Partial<Pick<Patient, 'criticalAllergy' | 'condition' | 'name' | 'phone' | 'age' | 'gender'>>
  ) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === patientId) {
          addLog('SYSTEM', 'INFO', `Cập nhật thông tin bệnh nhân ${p.name} (ID: ${patientId})`);
          return { ...p, ...details };
        }
        return p;
      })
    );
  };

  const unlockPatient = (patientId: string) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === patientId) {
          addLog('SYSTEM', 'SUCCESS', `Mở khóa tài khoản cho bệnh nhân ${p.name} (ID: ${patientId})`);
          return { ...p, isUnlocked: true, isLocked: false };
        }
        return p;
      })
    );
  };

  const lockPatient = (patientId: string) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === patientId) {
          addLog('SYSTEM', 'WARN', `Khóa tài khoản bệnh nhân ${p.name} (ID: ${patientId})`);
          return { ...p, isLocked: true, isUnlocked: false };
        }
        return p;
      })
    );
  };

  const checkInPatient = (patientId: string, dentistId: string, customRoom?: string, serviceName?: string) => {
    const patient = patients.find((p) => p.id === patientId);
    const dentist = dentists.find((d) => d.id === dentistId);
    if (!patient || !dentist) return;

    // Check if already in queue
    if (queue.some((q) => q.patientId === patientId && q.status !== 'Completed')) {
      addLog('RECEPTION', 'WARN', `Bệnh nhân ${patient.name} đã ở trong hàng chờ.`);
      return;
    }

    const room = customRoom || dentist.room;
    const checkInTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newQueueItem: QueueItem = {
      id: `Q-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId,
      patientName: patient.name,
      dentistId,
      dentistName: dentist.name,
      room,
      status: 'Waiting',
      checkInTime,
      waitTimeMin: 0,
      serviceName: serviceName || undefined,
    };

    setQueue((prev) => [...prev, newQueueItem]);
    addLog('RECEPTION', 'INFO', `Bệnh nhân ${patient.name} check-in thành công. Phòng khám: ${room} - ${dentist.name}.`);
  };

  const addAppointment = (apptData: Omit<Appointment, 'id' | 'status'>) => {
    const id = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt: Appointment = {
      ...apptData,
      id,
      status: 'Confirmed'
    };
    setAppointments((prev) => [...prev, newAppt]);
    addLog('RECEPTION', 'SUCCESS', `Lịch hẹn mới được đăng ký: Bệnh nhân ${apptData.patientName} lúc ${apptData.time}.`);
    return newAppt;
  };

  const startTreatment = (queueId: string) => {
    setQueue((prevQueue) =>
      prevQueue.map((item) => {
        if (item.id === queueId) {
          addLog('DENTIST', 'INFO', `Bác sĩ ${item.dentistName} bắt đầu điều trị cho bệnh nhân ${item.patientName} tại ${item.room}.`);
          return { ...item, status: 'In Chair', elapsedTimeMin: 0 };
        }
        return item;
      })
    );
  };

  const completeTreatment = (
    queueId: string,
    treatments: ToothState[],
    notes: string,
    performedServices: string[],
    treatmentType: 'independent' | 'plan_init' | 'plan_session' = 'independent',
    selectedPlanId?: string,
    files?: { id: string; type: 'pdf' | 'image' | 'prescription'; title: string; size: string; url?: string }[]
  ) => {
    const queueItem = queue.find((q) => q.id === queueId);
    if (!queueItem) return;

    // 1. Update queue status
    setQueue((prevQueue) =>
      prevQueue.map((item) => {
        if (item.id === queueId) {
          return { ...item, status: 'Completed' };
        }
        return item;
      })
    );

    // 2. Add Medical Record
    const patient = patients.find((p) => p.id === queueItem.patientId);
    const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const recordId = `MR-${Math.floor(1000 + Math.random() * 9000)}`;

    let recordTitle = performedServices.length > 0
      ? `Điều trị: ${services.find(s => s.id === performedServices[0])?.name || 'Khám tổng quát'}`
      : 'Khám lâm sàng';

    if (treatmentType === 'plan_init') {
      recordTitle = `[Khởi tạo phác đồ] ${recordTitle}`;
    } else if (treatmentType === 'plan_session') {
      recordTitle = `[Phiên điều trị] ${recordTitle}`;
    }

    const prefixedNotes = treatmentType === 'plan_session'
      ? `[PHIÊN ĐIỀU TRỊ - PHÁC ĐỒ #${selectedPlanId}] ${notes}`
      : treatmentType === 'plan_init'
      ? `[PHÁC ĐỒ ĐIỀU TRỊ] ${notes}`
      : notes;

    const hasImage = files && files.some(f => f.type === 'image');

    const newRecord: MedicalRecord = {
      id: recordId,
      patientId: queueItem.patientId,
      title: recordTitle,
      date: dateStr,
      size: files && files.length > 0 ? `${(files.length * 1.2).toFixed(1)} MB` : '150 KB',
      type: hasImage ? 'image' : (treatments.length > 0 ? 'pdf' : 'prescription'),
      notes: prefixedNotes,
      teethMap: treatments,
      dentistName: queueItem.dentistName,
      room: queueItem.room,
      files: files || []
    };

    setMedicalRecords((prev) => [newRecord, ...prev]);

    // 3. Compile invoice items and create invoice if not a plan session
    if (treatmentType !== 'plan_session') {
      const invoiceItems: InvoiceItem[] = performedServices.map((id) => {
        const service = services.find((s) => s.id === id);
        return {
          serviceId: id,
          serviceName: service?.name || 'Dịch vụ nha khoa',
          price: service?.price || 0
        };
      });

      const totalPrice = invoiceItems.reduce((sum, item) => sum + item.price, 0);

      // Apply discount logic
      // Phòng khám không áp dụng giảm trừ BHYT và không bán thuốc trực tiếp
      const insuranceDiscount = 0;
      
      // Tier discounts: Platinum (5%), Gold (2%), Diamond (10%)
      let tierDiscountPercent = 0;
      if (patient?.tier === 'Diamond') tierDiscountPercent = 0.10;
      else if (patient?.tier === 'Platinum') tierDiscountPercent = 0.05;
      else if (patient?.tier === 'Gold') tierDiscountPercent = 0.02;

      const memberDiscount = Math.round(totalPrice * tierDiscountPercent);
      const netPrice = totalPrice - memberDiscount;

      const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const newInvoice: Invoice = {
        id: invoiceId,
        patientId: queueItem.patientId,
        patientName: queueItem.patientName,
        patientPhone: patient?.phone || 'Chưa cập nhật',
        services: invoiceItems,
        totalPrice,
        insuranceDiscount,
        memberDiscount,
        netPrice,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        room: queueItem.room,
        dentistName: queueItem.dentistName,
        paidAmount: 0,
        remainingAmount: netPrice,
        payments: []
      };

      setInvoices((prev) => [newInvoice, ...prev]);

      addLog(
        'DENTIST',
        'SUCCESS',
        `Bác sĩ ${queueItem.dentistName} hoàn tất ca khám của ${queueItem.patientName}. Chuyển hóa đơn ${invoiceId} (₫${netPrice.toLocaleString()}) sang thu ngân.`
      );
    } else {
      addLog(
        'DENTIST',
        'SUCCESS',
        `Bác sĩ ${queueItem.dentistName} hoàn tất phiên điều trị (Phác đồ #${selectedPlanId}) cho ${queueItem.patientName}. Không sinh hóa đơn mới.`
      );
    }
  };

  const processPayment = (invoiceId: string, paymentMethod: Invoice['paymentMethod'], payAmount?: number) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const currentRemaining = invoice.remainingAmount !== undefined ? invoice.remainingAmount : invoice.netPrice;
    const currentPaid = invoice.paidAmount !== undefined ? invoice.paidAmount : 0;

    const amountToPay = payAmount !== undefined ? Math.min(payAmount, currentRemaining) : currentRemaining;
    const newPaidAmount = currentPaid + amountToPay;
    const newRemainingAmount = Math.max(0, invoice.netPrice - newPaidAmount);

    let newStatus: Invoice['status'] = 'Paid';
    if (newRemainingAmount > 0) {
      newStatus = 'Partially Paid';
    }

    const newPayment = {
      date: new Date().toISOString(),
      amount: amountToPay,
      method: paymentMethod || 'Cash'
    };

    setInvoices((prevInvoices) =>
      prevInvoices.map((inv) => {
        if (inv.id === invoiceId) {
          const updatedPayments = [...(inv.payments || []), newPayment];
          return {
            ...inv,
            status: newStatus,
            paymentMethod,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            payments: updatedPayments
          };
        }
        return inv;
      })
    );

    // Reward points to patient: 1 point for every 10,000đ spent on the actual paid amount this time
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.id === invoice.patientId) {
          const updatedBalance = p.balance;
          const addedPoints = Math.floor(amountToPay / 10000);
          const newPoints = p.points + addedPoints;
          let tier = p.tier;
          if (newPoints >= 8000) tier = 'Diamond';
          else if (newPoints >= 3000) tier = 'Platinum';
          else if (newPoints >= 1500) tier = 'Gold';

          return {
            ...p,
            balance: updatedBalance,
            points: newPoints,
            tier
          };
        }
        return p;
      })
    );

    addLog(
      'CASHIER',
      'SUCCESS',
      `Thanh toán ₫${amountToPay.toLocaleString()} thành công bằng [${paymentMethod}] cho hóa đơn ${invoiceId} (Còn nợ: ₫${newRemainingAmount.toLocaleString()}).`
    );
  };

  const addService = (newServiceData: Omit<Service, 'id' | 'isActive'>) => {
    // Dùng timestamp để tránh trùng ID
    const id = `S-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const newService: Service = {
      ...newServiceData,
      id,
      isActive: true
    };
    setServices((prev) => [...prev, newService]);
    addLog('SYSTEM', 'SUCCESS', `Cấu hình thêm dịch vụ mới: ${newServiceData.name} - Giá: ₫${newServiceData.price.toLocaleString()}`);
  };

  const toggleServiceActive = (serviceId: string) => {
    setServices((prevServices) =>
      prevServices.map((s) => {
        if (s.id === serviceId) {
          const nextActive = !s.isActive;
          addLog('SYSTEM', nextActive ? 'SUCCESS' : 'WARN', `Dịch vụ "${s.name}" đã được ${nextActive ? 'kích hoạt' : 'vô hiệu hóa'}.`);
          return { ...s, isActive: nextActive };
        }
        return s;
      })
    );
  };

  const updateServicePrice = (serviceId: string, newPrice: number) => {
    setServices((prevServices) =>
      prevServices.map((s) => {
        if (s.id === serviceId) {
          addLog('SYSTEM', 'SUCCESS', `Cấu hình cập nhật giá dịch vụ ${s.name}: ₫${s.price.toLocaleString()} -> ₫${newPrice.toLocaleString()}`);
          return { ...s, price: newPrice };
        }
        return s;
      })
    );
  };

  const swapShifts = (shiftId1: string, shiftId2: string, conflictAppointmentIds?: string[]) => {
    setDoctorShifts((prevShifts) => {
      const shift1 = prevShifts.find((s) => s.id === shiftId1);
      const shift2 = prevShifts.find((s) => s.id === shiftId2);
      if (!shift1 || !shift2) return prevShifts;

      const updatedShifts = prevShifts.map((s) => {
        if (s.id === shiftId1) {
          return { ...s, dentistId: shift2.dentistId, dentistName: shift2.dentistName };
        }
        if (s.id === shiftId2) {
          return { ...s, dentistId: shift1.dentistId, dentistName: shift1.dentistName };
        }
        return s;
      });

      addLog(
        'SYSTEM',
        'SUCCESS',
        `Đổi ca thành công: ${shift1.dentistName} (${shift1.date}) hoán đổi ca với ${shift2.dentistName} (${shift2.date})`
      );

      // Tạo notification cho lễ tân nếu có conflict
      if (conflictAppointmentIds && conflictAppointmentIds.length > 0) {
        const affectedAppts = appointments.filter(a => conflictAppointmentIds.includes(a.id));
        if (affectedAppts.length > 0) {
          const notifId = `SCN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
          const newNotif: ShiftChangeNotification = {
            id: notifId,
            createdAt: new Date().toISOString(),
            shiftDate: shift1.date,
            shiftType: shift1.shiftType,
            originalDentistId: shift1.dentistId,
            originalDentistName: shift1.dentistName,
            newDentistId: shift2.dentistId,
            newDentistName: shift2.dentistName,
            affectedItems: affectedAppts.map(a => ({
              appointmentId: a.id,
              patientName: a.patientName,
              patientPhone: a.patientPhone,
              time: a.time,
              serviceName: a.serviceName,
              resolved: false,
            })),
          };
          setShiftChangeNotifications(prev => [newNotif, ...prev]);
          addLog('SYSTEM', 'WARN', `Thông báo đổi ca: Lễ tân cần liên hệ ${affectedAppts.length} bệnh nhân về việc đổi bác sĩ trực.`);
        }
      }

      return updatedShifts;
    });
  };

  const transferShift = (shiftId: string, targetDentistId: string, conflictAppointmentIds?: string[]) => {
    const dentist = dentists.find((d) => d.id === targetDentistId);
    if (!dentist) return;

    setDoctorShifts((prevShifts) => {
      const shift = prevShifts.find((s) => s.id === shiftId);
      if (!shift) return prevShifts;

      const updatedShifts = prevShifts.map((s) => {
        if (s.id === shiftId) {
          return { ...s, dentistId: targetDentistId, dentistName: dentist.name };
        }
        return s;
      });

      addLog(
        'SYSTEM',
        'SUCCESS',
        `Chuyển ca thành công: ${shift.dentistName} chuyển ca ngày ${shift.date} cho ${dentist.name}`
      );

      // Tạo notification cho lễ tân nếu có conflict
      if (conflictAppointmentIds && conflictAppointmentIds.length > 0) {
        const affectedAppts = appointments.filter(a => conflictAppointmentIds.includes(a.id));
        if (affectedAppts.length > 0) {
          const notifId = `SCN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
          const newNotif: ShiftChangeNotification = {
            id: notifId,
            createdAt: new Date().toISOString(),
            shiftDate: shift.date,
            shiftType: shift.shiftType,
            originalDentistId: shift.dentistId,
            originalDentistName: shift.dentistName,
            newDentistId: targetDentistId,
            newDentistName: dentist.name,
            affectedItems: affectedAppts.map(a => ({
              appointmentId: a.id,
              patientName: a.patientName,
              patientPhone: a.patientPhone,
              time: a.time,
              serviceName: a.serviceName,
              resolved: false,
            })),
          };
          setShiftChangeNotifications(prev => [newNotif, ...prev]);
          addLog('SYSTEM', 'WARN', `Thông báo đổi ca: Lễ tân cần liên hệ ${affectedAppts.length} bệnh nhân về việc đổi bác sĩ trực.`);
        }
      }

      return updatedShifts;
    });
  };

  // ── Resolve conflict: Bệnh nhân đồng ý → cập nhật bác sĩ mới trong appointment ──
  const resolveShiftConflict_Update = (notifId: string, appointmentId: string) => {
    const notif = shiftChangeNotifications.find(n => n.id === notifId);
    if (!notif) return;

    // Cập nhật dentist trong appointment
    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        addLog('RECEPTION', 'SUCCESS',
          `Lễ tân cập nhật lịch hẹn ${appointmentId} của ${a.patientName}: đổi sang ${notif.newDentistName} (bệnh nhân đã đồng ý qua điện thoại).`);
        return { ...a, dentistId: notif.newDentistId, dentistName: notif.newDentistName };
      }
      return a;
    }));

    // Đánh dấu item này đã resolved
    setShiftChangeNotifications(prev => prev.map(n => {
      if (n.id !== notifId) return n;
      return {
        ...n,
        affectedItems: n.affectedItems.map(item =>
          item.appointmentId === appointmentId
            ? { ...item, resolved: true, resolvedAction: 'updated' as const }
            : item
        ),
      };
    }));
  };

  // ── Resolve conflict: Bệnh nhân từ chối → hủy appointment ──
  const resolveShiftConflict_Cancel = (notifId: string, appointmentId: string) => {
    const notif = shiftChangeNotifications.find(n => n.id === notifId);
    if (!notif) return;

    // Hủy appointment
    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId && a.status !== 'Completed') {
        addLog('RECEPTION', 'WARN',
          `Hủy lịch hẹn ${appointmentId} của ${a.patientName}: bệnh nhân không đồng ý đổi bác sĩ sau khi liên hệ qua điện thoại.`);
        return { ...a, status: 'Cancelled' as const };
      }
      return a;
    }));

    // Đánh dấu item này đã resolved
    setShiftChangeNotifications(prev => prev.map(n => {
      if (n.id !== notifId) return n;
      return {
        ...n,
        affectedItems: n.affectedItems.map(item =>
          item.appointmentId === appointmentId
            ? { ...item, resolved: true, resolvedAction: 'cancelled' as const }
            : item
        ),
      };
    }));
  };



  const rescheduleAppointment = (
    appointmentId: string,
    newTime: string,
    newDentistId?: string,
    newDentistName?: string
  ) => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === appointmentId) {
          const updated = { ...a, time: newTime };
          if (newDentistId && newDentistName) {
            updated.dentistId = newDentistId;
            updated.dentistName = newDentistName;
          }
          addLog(
            'RECEPTION',
            'SUCCESS',
            `Dời lịch hẹn ${appointmentId} của ${a.patientName} sang lúc ${newTime} (Bác sĩ: ${updated.dentistName}).`
          );
          return updated;
        }
        return a;
      })
    );
  };

  const cancelAppointment = (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === appointmentId && a.status !== 'Completed') {
          addLog('RECEPTION', 'WARN', `Hủy lịch hẹn ${appointmentId} của bệnh nhân ${a.patientName}.`);
          return { ...a, status: 'Cancelled' as const };
        }
        return a;
      })
    );
  };

  const changeShiftRoom = (shiftId: string, newRoom: string) => {
    setDoctorShifts((prevShifts) => {
      const shift = prevShifts.find((s) => s.id === shiftId);
      if (!shift) return prevShifts;

      const updatedShifts = prevShifts.map((s) => {
        if (s.id === shiftId) {
          return { ...s, room: newRoom };
        }
        return s;
      });

      addLog(
        'SYSTEM',
        'SUCCESS',
        `Đổi phòng trực thành công: Ca trực ngày ${shift.date} của ${shift.dentistName} chuyển sang phòng ${newRoom}`
      );

      return updatedShifts;
    });
  };

  const addShift = (shiftData: Omit<DoctorShift, 'id'>) => {
    const id = `SH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const newShift: DoctorShift = { ...shiftData, id };
    setDoctorShifts((prev) => [...prev, newShift]);
    addLog('SYSTEM', 'SUCCESS', `Thêm ca trực mới: ${shiftData.dentistName} ngày ${shiftData.date} (${shiftData.shiftType}) tại ${shiftData.room}`);
  };

  const deleteShift = (shiftId: string) => {
    const shift = doctorShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    setDoctorShifts((prev) => prev.filter((s) => s.id !== shiftId));
    addLog('SYSTEM', 'WARN', `Xóa ca trực: ${shift.dentistName} ngày ${shift.date} (${shift.shiftType}) tại ${shift.room}`);
  };

  return (
    <ClinicContext.Provider
      value={{
        services,
        dentists,
        patients,
        appointments,
        queue,
        invoices,
        logs,
        medicalRecords,
        addLog,
        checkInPatient,
        addAppointment,
        startTreatment,
        completeTreatment,
        processPayment,
        addService,
        updateServicePrice,
        toggleServiceActive,
        addPatient,
        rechargeWallet,
        updatePatientDetails,
        unlockPatient,
        lockPatient,
        rescheduleAppointment,

        cancelAppointment,
        doctorShifts,
        swapShifts,
        transferShift,
        changeShiftRoom,
        addShift,
        deleteShift,
        shiftChangeNotifications,
        resolveShiftConflict_Update,
        resolveShiftConflict_Cancel,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
