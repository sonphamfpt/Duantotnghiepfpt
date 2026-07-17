import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Service, Dentist, Patient, Appointment, QueueItem, Invoice, ClinicLog, MedicalRecord, ToothState, InvoiceItem, DoctorShift, ShiftChangeNotification } from '../types/clinic';
import { INITIAL_LOGS } from '../services/mockData';
import { socket } from '../services/socketClient';

import {
  authApi,
  clinicApi,
  queueApi,
  appointmentApi,
  invoiceApi,
  medicalRecordApi,
  shiftApi,
} from '../services/api';

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
  addPatient: (patient: Omit<Patient, 'id' | 'points' | 'tier' | 'balance' | 'age'> & { dateOfBirth?: string }) => Promise<Patient>;
  rechargeWallet: (patientId: string, amount: number) => void;
  updatePatientDetails: (patientId: string, details: Partial<Pick<Patient, 'criticalAllergy' | 'condition' | 'name' | 'phone' | 'age' | 'gender'>>) => void;
  unlockPatient: (patientId: string) => void;
  lockPatient: (patientId: string) => void;
  rescheduleAppointment: (appointmentId: string, newTime: string, newDentistId?: string, newDentistName?: string) => void;

  cancelAppointment: (appointmentId: string) => void;
  doctorShifts: DoctorShift[];
  shiftChangeNotifications: ShiftChangeNotification[];
  fetchPatientRecords: (patientId: string) => Promise<void>;
  swapShifts: (shiftId1: string, shiftId2: string, conflictAppointmentIds?: string[]) => Promise<void>;
  transferShift: (shiftId: string, targetDentistId: string, conflictAppointmentIds?: string[]) => Promise<void>;
  changeShiftRoom: (shiftId: string, roomId: string) => void;
  addShift: (shift: any) => void;
  deleteShift: (shiftId: string) => void;
  resolveShiftConflict_Update: (notifId: string, appointmentId: string) => Promise<void>;
  resolveShiftConflict_Cancel: (notifId: string, appointmentId: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<ClinicLog[]>(INITIAL_LOGS);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([]);
  const [shiftChangeNotifications, setShiftChangeNotifications] = useState<ShiftChangeNotification[]>([]);

  // Đồng bộ hóa toàn bộ dữ liệu từ backend
  const refreshAllData = async () => {
    try {
      const [resSvc, resDen, resPat, resApp, resQue, resInv, resShf, resNot, resLog] = await Promise.all([
        clinicApi.getServices(),
        clinicApi.getDentists(),
        clinicApi.getPatients(),
        appointmentApi.getAppointments(),
        queueApi.getQueue(),
        invoiceApi.getInvoices(),
        shiftApi.getShifts(),
        shiftApi.getNotifications(),
        clinicApi.getLogs(),
      ]);

      if (resSvc.data) setServices(resSvc.data);
      if (resDen.data) setDentists(resDen.data);
      if (resPat.data) setPatients(resPat.data);
      if (resApp.data) setAppointments(resApp.data);
      if (resQue.data) setQueue(resQue.data);
      if (resInv.data) {
        const mappedInvoices = resInv.data.map((backendInv: any) => ({
          id: `I-${backendInv.invoiceId}`,
          patientId: `P-${backendInv.patientId}`,
          patientName: backendInv.patient?.fullName || 'Khách hàng',
          patientPhone: backendInv.patient?.phone || '',
          services: (backendInv.items || []).map((item: any) => ({
            serviceId: `S-${item.serviceId}`,
            serviceName: item.service?.name || 'Dịch vụ',
            price: Number(item.price),
          })),
          totalPrice: Number(backendInv.totalPrice),
          insuranceDiscount: Number(backendInv.insuranceDiscount),
          memberDiscount: Number(backendInv.memberDiscount),
          netPrice: Number(backendInv.netPrice),
          status: backendInv.status === 'PartiallyPaid' ? 'Partially Paid' : backendInv.status,
          createdAt: backendInv.createdAt,
          paymentMethod: backendInv.payments && backendInv.payments.length > 0 
            ? backendInv.payments[0].method 
            : undefined,
          room: backendInv.room?.name || undefined,
          dentistName: backendInv.dentist?.user?.fullName || undefined,
          paidAmount: Number(backendInv.paidAmount || 0),
          remainingAmount: Number(backendInv.remainingAmount || 0),
          payments: (backendInv.payments || []).map((p: any) => ({
            date: p.paidAt || p.createdAt || backendInv.createdAt,
            amount: Number(p.amount),
            method: p.method,
          })),
        }));
        setInvoices(mappedInvoices);
      }
      if (resShf.data) setDoctorShifts(resShf.data);
      if (resNot.data) setShiftChangeNotifications(resNot.data);
      if (resLog.data) setLogs(resLog.data);
    } catch (err) {
      console.error('Lỗi khi đồng bộ dữ liệu từ backend:', err);
    }
  };

  useEffect(() => {
    // Tải dữ liệu ban đầu
    refreshAllData();

    // Kết nối WebSocket
    socket.connect();

    // Lắng nghe sự kiện từ server — refresh ngay khi có thay đổi
    const handleClinicEvent = () => {
      refreshAllData();
    };

    socket.on('queue:checkin', handleClinicEvent);
    socket.on('queue:status_changed', handleClinicEvent);
    socket.on('invoice:created', handleClinicEvent);
    socket.on('invoice:paid', handleClinicEvent);
    socket.on('shift:swap_requested', handleClinicEvent);
    socket.on('appointment:created', handleClinicEvent);
    socket.on('appointment:cancelled', handleClinicEvent);

    // Polling fallback mỗi 30 giây (phòng ngừa khi WebSocket mất kết nối)
    const interval = setInterval(refreshAllData, 30000);

    return () => {
      // Dọn dẹp khi unmount
      socket.off('queue:checkin', handleClinicEvent);
      socket.off('queue:status_changed', handleClinicEvent);
      socket.off('invoice:created', handleClinicEvent);
      socket.off('invoice:paid', handleClinicEvent);
      socket.off('shift:swap_requested', handleClinicEvent);
      socket.off('appointment:created', handleClinicEvent);
      socket.off('appointment:cancelled', handleClinicEvent);
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchPatientRecords = async (patientId: string) => {
    try {
      const response = await medicalRecordApi.getByPatient(patientId);
      if (response.success && response.data) {
        setMedicalRecords((prev) => {
          const filtered = prev.filter((r) => r.patientId !== patientId);
          return [...filtered, ...response.data!];
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải bệnh án của bệnh nhân:', err);
    }
  };

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

  const addPatient = async (newPatientData: Omit<Patient, 'id' | 'points' | 'tier' | 'balance' | 'age'> & { dateOfBirth?: string }) => {
    const response = await clinicApi.createPatient(newPatientData);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể tạo hồ sơ bệnh nhân.');
    }

    addLog('RECEPTION', 'SUCCESS', 'Tạo hồ sơ bệnh nhân mới thành công.');
    await refreshAllData();
    return response.data;
  };

  const rechargeWallet = async (patientId: string, amount: number) => {
    try {
      const response = await invoiceApi.rechargeWallet(patientId, amount);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Nạp tiền ví thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updatePatientDetails = async (
    patientId: string,
    details: Partial<Pick<Patient, 'criticalAllergy' | 'condition' | 'name' | 'phone' | 'age' | 'gender'>>
  ) => {
    try {
      const response = await clinicApi.updatePatient(patientId, {
        name: details.name,
        phone: details.phone,
        criticalAllergy: details.criticalAllergy,
        condition: details.condition,
        gender: details.gender,
        age: details.age,
      });
      if (response.success) {
        addLog('SYSTEM', 'INFO', `Cập nhật thông tin bệnh nhân (ID: ${patientId}) thành công.`);
        await refreshAllData();
      }
    } catch (err: any) {
      console.error('Lỗi khi cập nhật thông tin bệnh nhân:', err);
      alert(err.message || 'Không thể cập nhật thông tin bệnh nhân.');
    }
  };

  const unlockPatient = async (patientId: string) => {
    try {
      const response = await clinicApi.unlockPatient(patientId);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Mở khóa tài khoản bệnh nhân (ID: ${patientId}) thành công.`);
        await refreshAllData();
      }
    } catch (err: any) {
      console.error('Lỗi khi mở khóa bệnh nhân:', err);
      alert(err.message || 'Không thể mở khóa tài khoản bệnh nhân.');
    }
  };

  const lockPatient = async (patientId: string) => {
    try {
      const response = await clinicApi.lockPatient(patientId, 'Khóa thủ công bởi nhân viên.');
      if (response.success) {
        addLog('SYSTEM', 'WARN', `Khóa tài khoản bệnh nhân (ID: ${patientId}) thành công.`);
        await refreshAllData();
      }
    } catch (err: any) {
      console.error('Lỗi khi khóa bệnh nhân:', err);
      alert(err.message || 'Không thể khóa tài khoản bệnh nhân.');
    }
  };

  const checkInPatient = async (patientId: string, dentistId: string, customRoom?: string, serviceName?: string) => {
    try {
      const response = await queueApi.checkIn(patientId, dentistId, customRoom, serviceName);
      if (response.success) {
        addLog('RECEPTION', 'INFO', `Bệnh nhân check-in thành công.`);
        await refreshAllData();
      } else {
        alert(response.message || 'Không thể check-in bệnh nhân.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Lỗi mạng khi check-in.');
    }
  };

  const addAppointment = (apptData: Omit<Appointment, 'id' | 'status'>) => {
    const tempId = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt: Appointment = {
      ...apptData,
      id: tempId,
      status: 'Confirmed'
    };
    setAppointments((prev) => [newAppt, ...prev]);

    (async () => {
      try {
        const response = await appointmentApi.create(apptData);
        if (response.success) {
          addLog('RECEPTION', 'SUCCESS', `Đăng ký lịch hẹn thành công.`);
          await refreshAllData();
        }
      } catch (err) {
        console.error('Lỗi khi lưu lịch hẹn qua API:', err);
      }
    })();

    return newAppt;
  };

  const startTreatment = async (queueId: string) => {
    try {
      const response = await queueApi.updateStatus(queueId, 'InChair');
      if (response.success) {
        addLog('DENTIST', 'INFO', `Bắt đầu điều trị.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const completeTreatment = async (
    queueId: string,
    treatments: ToothState[],
    notes: string,
    performedServices: string[],
    treatmentType: 'independent' | 'plan_init' | 'plan_session' = 'independent',
    selectedPlanId?: string,
    _files?: { id: string; type: 'pdf' | 'image' | 'prescription'; title: string; size: string; url?: string }[]
  ) => {
    const queueItem = queue.find((q) => q.id === queueId);
    if (!queueItem) return;

    try {
      const response = await medicalRecordApi.create({
        patientId: queueItem.patientId,
        dentistId: queueItem.dentistId,
        queueTicketId: queueId,
        notes,
        performedServices,
        sessionType: treatmentType,
        treatmentPlanId: selectedPlanId,
        teeth: treatments,
      });
      if (response.success) {
        addLog('DENTIST', 'SUCCESS', `Hoàn tất phiên điều trị.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processPayment = async (invoiceId: string, paymentMethod: Invoice['paymentMethod'], payAmount?: number) => {
    try {
      const response = await invoiceApi.pay(invoiceId, paymentMethod, payAmount);
      if (response.success) {
        addLog('CASHIER', 'SUCCESS', `Thanh toán hóa đơn thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addService = async (newServiceData: Omit<Service, 'id' | 'isActive'>) => {
    try {
      const response = await clinicApi.addService({
        name: newServiceData.name,
        price: newServiceData.price,
        durationMin: newServiceData.durationMin,
      });
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Cấu hình thêm dịch vụ mới thành công: ${newServiceData.name}.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Lỗi khi thêm dịch vụ:', err);
    }
  };

  const toggleServiceActive = async (serviceId: string) => {
    try {
      const response = await clinicApi.toggleServiceActive(serviceId);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Cập nhật trạng thái kích hoạt dịch vụ thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái dịch vụ:', err);
    }
  };

  const updateServicePrice = async (serviceId: string, newPrice: number) => {
    try {
      const response = await clinicApi.updateServicePrice(serviceId, newPrice);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Cập nhật đơn giá dịch vụ thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật giá dịch vụ:', err);
    }
  };

  const swapShifts = async (shiftId1: string, shiftId2: string, conflictAppointmentIds?: string[]) => {
    try {
      const response = await shiftApi.swap(shiftId1, shiftId2, conflictAppointmentIds);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Hoán đổi ca trực thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const transferShift = async (shiftId: string, targetDentistId: string, conflictAppointmentIds?: string[]) => {
    try {
      const response = await shiftApi.transfer(shiftId, targetDentistId, conflictAppointmentIds);
      if (response.success) {
        addLog('SYSTEM', 'SUCCESS', `Chuyển giao ca trực thành công.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Resolve conflict: Bệnh nhân đồng ý → cập nhật bác sĩ mới trong appointment ──
  const resolveShiftConflict_Update = async (notifId: string, appointmentId: string) => {
    try {
      const response = await shiftApi.resolveConflict(notifId, appointmentId, 'approve');
      if (response.success) {
        addLog('RECEPTION', 'SUCCESS', `Lễ tân cập nhật lịch hẹn ${appointmentId}: Bệnh nhân đồng ý đổi bác sĩ.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Resolve conflict: Bệnh nhân từ chối → hủy appointment ──
  const resolveShiftConflict_Cancel = async (notifId: string, appointmentId: string) => {
    try {
      const response = await shiftApi.resolveConflict(notifId, appointmentId, 'reject');
      if (response.success) {
        addLog('RECEPTION', 'WARN', `Lễ tân hủy lịch hẹn ${appointmentId}: Bệnh nhân từ chối đổi bác sĩ.`);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const rescheduleAppointment = async (
    appointmentId: string,
    newTime: string,
    newDentistId?: string,
    newDentistName?: string
  ) => {
    try {
      const response = await appointmentApi.reschedule(appointmentId, newTime, newDentistId);
      if (response.success) {
        addLog(
          'RECEPTION',
          'SUCCESS',
          `Dời lịch hẹn ${appointmentId} sang lúc ${newTime}${newDentistName ? ` (Bác sĩ: ${newDentistName})` : ''}.`
        );
        await refreshAllData();
      }
    } catch (err: any) {
      console.error('Lỗi khi dời lịch hẹn:', err);
      alert(err.message || 'Không thể dời lịch hẹn. Vui lòng thử lại.');
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const response = await appointmentApi.cancel(appointmentId);
      if (response.success) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: 'Cancelled' as const } : a))
        );
        addLog('RECEPTION', 'WARN', `Hủy lịch hẹn ${appointmentId} thành công.`);
      }
    } catch (err) {
      console.error('Lỗi khi hủy lịch hẹn:', err);
    }
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
        shiftChangeNotifications,
        fetchPatientRecords,
        swapShifts,
        transferShift,
        changeShiftRoom: async (shiftId: string, roomId: string) => {
          try {
            const res = await shiftApi.updateShiftRoom(shiftId, roomId);
            if (res.success) {
              addLog('SYSTEM', 'SUCCESS', `Cập nhật phòng trực cho ca ${shiftId} thành công.`);
              await refreshAllData();
            }
          } catch (err) {
            console.error('Lỗi cập nhật phòng trực:', err);
          }
        },
        addShift: async (shift: any) => {
          try {
            const res = await shiftApi.createShift({
              dentistId: shift.dentistId,
              workDate: shift.date,
              shiftType: shift.shiftType,
              roomId: shift.room,
            });
            if (res.success) {
              addLog('SYSTEM', 'SUCCESS', `Thêm ca trực mới cho ${shift.dentistName} thành công.`);
              await refreshAllData();
            }
          } catch (err) {
            console.error('Lỗi thêm ca trực:', err);
          }
        },
        deleteShift: async (shiftId: string) => {
          try {
            const res = await shiftApi.deleteShift(shiftId);
            if (res.success) {
              addLog('SYSTEM', 'WARN', `Xóa ca trực ${shiftId} thành công.`);
              await refreshAllData();
            }
          } catch (err) {
            console.error('Lỗi xóa ca trực:', err);
          }
        },
        resolveShiftConflict_Update,
        resolveShiftConflict_Cancel,
        refreshAllData,
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
