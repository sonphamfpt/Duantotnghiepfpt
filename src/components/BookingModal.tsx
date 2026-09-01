import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';
import { OtpVerificationModal } from './OtpVerificationModal';
import { AlertModal } from './AlertModal';
import { appointmentApi, BookingChannel, clinicApi } from '../services/api';
import { isSameDentistId, getVietnamHour, isSlotInDoctorShifts } from '../utils/shiftUtils';
import { downloadQrCode } from '../utils/qrDownloader';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientName?: string;
  defaultPatientPhone?: string;
  defaultDentistName?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  defaultPatientName = '',
  defaultPatientPhone = '',
  defaultDentistName = ''
}) => {
  const { services, dentists, patients, appointments, addLog, refreshAllData, doctorShifts } = useClinic();
  const { role, user } = useAuth();

  const [patientName, setPatientName] = useState(defaultPatientName);
  const [patientPhone, setPatientPhone] = useState(defaultPatientPhone);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const initialDentistId = dentists.find(d => d.name === defaultDentistName)?.id || '';
  const [selectedDentistId, setSelectedDentistId] = useState(initialDentistId);


  const formatDateInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const day = value.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayObj = new Date();
  const minDateStr = formatDateInputValue(todayObj);
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 7);
  const maxDateStr = formatDateInputValue(maxDateObj);

  const [date, setDate] = useState(minDateStr);
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffBookingChannel, setStaffBookingChannel] = useState<Extract<BookingChannel, 'Phone' | 'WalkIn'>>('WalkIn');
  const [slotRefreshTick, setSlotRefreshTick] = useState(0);
  // Dùng ref để giữ tham chiếu fetch function ổn định, tránh vòng lặp re-render
  const fetchSlotsRef = React.useRef<(() => void) | null>(null);

  // Per-field validation errors matching BookingPage.tsx
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [dentistError, setDentistError] = useState('');
  const [timeError, setTimeError] = useState('');


  const PHONE_VN_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/;

  const validatePhone = (phone: string): string => {
    const clean = phone.replace(/\s|-/g, '');
    if (!clean) return 'Vui lòng nhập số điện thoại.';
    if (!/^[0-9]+$/.test(clean)) return 'Số điện thoại chỉ được chứa các chữ số (0-9).';
    if (clean.length !== 10) return 'Số điện thoại phải đủ 10 chữ số.';
    if (!PHONE_VN_REGEX.test(clean)) return 'Số điện thoại không hợp lệ. Phải bắt đầu bằng 03x, 05x, 07x, 08x, hoặc 09x.';
    return '';
  };

  const validateName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return 'Vui lòng nhập họ và tên.';
    if (trimmed.length < 3) return 'Họ và tên phải có ít nhất 3 ký tự.';
    if (/[0-9!@#$%^&*()_+\-=\[\]{};\':"|,.<>\/?\\]/.test(trimmed)) return 'Họ và tên không được chứa ký tự đặc biệt hoặc chữ số.';
    return '';
  };

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [antiSpamError, setAntiSpamError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ open: false, title: '', message: '', type: 'error' });

  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAntiSpamError(message);
    setAlertModal({ open: true, title, message, type });
  };

  const formatLocalDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  // Auto-fill patient name if phone exists
  const existingPatient = patients.find(p => p.phone === patientPhone.trim());
  useEffect(() => {
    if (existingPatient && !defaultPatientName && patientName === '') {
      setPatientName(existingPatient.name);
    }
  }, [existingPatient, defaultPatientName, patientName]);

  // Sync patient info if logged in as patient
  useEffect(() => {
    if (role === 'patient' && user?.id && !defaultPatientName) {
      const p = patients.find(p => p.id === user.id);
      if (p) {
        setPatientName(p.name);
        setPatientPhone(p.phone);
      }
    }
  }, [role, user, patients, defaultPatientName]);

  useEffect(() => {
    if (!defaultDentistName || selectedDentistId) return;
    const dentist = dentists.find(d => d.name === defaultDentistName);
    if (dentist) {
      setSelectedDentistId(dentist.id);
    }
  }, [defaultDentistName, dentists, selectedDentistId]);

  useEffect(() => {
    if (selectedDentistId && date) {
      const isStillOnDuty = doctorShifts.some(
        s => isSameDentistId(s.dentistId, selectedDentistId) && s.date === date
      );
      if (!isStillOnDuty) {
        setSelectedDentistId('');
        setTimeSlot('');
      }
    }
  }, [date, doctorShifts, selectedDentistId]);



  const formatSlotToTimeString = (isoString: string): string => {
    if (!isoString) return '';
    const dateObj = new Date(isoString);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isSlotAvailableRealtime = (slotIso: string, targetDentistId: string, _dateStr?: string): boolean => {

    const slotStart = new Date(slotIso).getTime();
    if (isNaN(slotStart)) return false;

    const currentService = services.find(s => s.id === selectedServiceId);
    const selectedServiceDuration = currentService?.durationMin || 30;
    const slotEnd = slotStart + (selectedServiceDuration + 15) * 60 * 1000;

    const isDoctorOccupied = (docId: string): boolean => {
      return appointments.some(a => {
        if (a.status === 'Cancelled') return false;
        if (a.dentistId && !isSameDentistId(a.dentistId, docId)) return false;

        let apptStart: number | null = null;
        if (a.time) {
          if (a.time.includes('@')) {
            const [dPart, tPart] = a.time.split('@').map(s => s.trim());
            const dParts = dPart.split('/').map(Number);
            const tParts = tPart ? tPart.split(':').map(Number) : [0, 0];
            if (dParts.length === 3) {
              apptStart = new Date(dParts[2], dParts[1] - 1, dParts[0], tParts[0] || 0, tParts[1] || 0).getTime();
            }
          } else {
            const dObj = new Date(a.time);
            if (!isNaN(dObj.getTime())) apptStart = dObj.getTime();
          }
        }

        if (!apptStart) return false;

        const apptService = services.find(s => s.id === a.serviceId || s.name === a.serviceName);
        const apptDurationMin = apptService?.durationMin || 30;
        const apptEnd = apptStart + (apptDurationMin + 15) * 60 * 1000;

        // Kiểm tra chồng lấp khoảng thời gian: [slotStart, slotEnd) với [apptStart, apptEnd)
        return slotStart < apptEnd && apptStart < slotEnd;
      });
    };

    return !isDoctorOccupied(targetDentistId);
  };

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedServiceId || !date || !selectedDentistId) {
        setAvailableSlots([]);
        setTimeSlot('');
        return;
      }

      setLoadingSlots(true);
      setSlotsError('');

      try {
        const response = await appointmentApi.getAvailableSlots(selectedDentistId, date, selectedServiceId);
        const rawSlots = response.data || [];

        const activeShiftsForDoc = doctorShifts.filter(
          s => isSameDentistId(s.dentistId, selectedDentistId) && s.date === date
        );
        const slots = rawSlots.filter(slotIso =>
          isSlotInDoctorShifts(slotIso, activeShiftsForDoc) && isSlotAvailableRealtime(slotIso, selectedDentistId, date)
        );

        setAvailableSlots(slots);
        setTimeSlot((prev) => slots.includes(prev) ? prev : '');
      } catch (err: any) {
        console.error('Lỗi khi tải khung giờ trống:', err);
        setSlotsError(err.message || 'Không thể tải danh sách giờ trống.');
        setAvailableSlots([]);
        setTimeSlot('');
      } finally {
        setLoadingSlots(false);
      }
    };

    // Cập nhật ref mỗi khi dependencies thay đổi (không gây re-render)
    fetchSlotsRef.current = () => void fetchAvailableSlots();

    void fetchAvailableSlots();
  }, [date, selectedDentistId, selectedServiceId, appointments, slotRefreshTick]);


  if (!isOpen) return null;

  // Lễ tân bỏ qua OTP
  const isStaffBooking = role === 'receptionist' || role === 'manager';

  // Anti-spam: Rate limit — max 3 active appointments per phone
  const checkRateLimit = (phone: string): boolean => {
    const activeAppts = appointments.filter(
      a => a.patientPhone === phone.trim() &&
        a.status !== 'Completed' && a.status !== 'Cancelled'
    );
    if (activeAppts.length >= 3) {
      showAlert(
        isStaffBooking ? 'Giới hạn lịch hẹn' : 'Quá giới hạn',
        isStaffBooking ? 'Bệnh nhân này đã có 3 lịch hẹn đang chờ. Yêu cầu hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.' : 'Số điện thoại này đã có 3 lịch hẹn đang chờ. Vui lòng hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.',
        'warning'
      );
      return false;
    }
    return true;
  };

  // Anti-spam: Duplicate detection — same phone + same date + same time
  const checkDuplicate = (phone: string, dateStr: string, time: string): boolean => {
    const timeStr = `${formatLocalDateStr(dateStr)} @ ${time}`;
    const duplicate = appointments.find(
      a => a.patientPhone === phone.trim() &&
        a.time === timeStr &&
        a.status !== 'Cancelled'
    );
    if (duplicate) {
      showAlert(
        'Trùng lịch hẹn',
        isStaffBooking ? 'Bệnh nhân này đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.' : 'Bạn đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntiSpamError('');

    const nErr = validateName(patientName);
    const pErr = validatePhone(patientPhone);
    const sErr = !selectedServiceId ? 'Vui lòng chọn dịch vụ điều trị.' : '';
    const dErr = !selectedDentistId ? 'Vui lòng chọn bác sĩ.' : '';
    const tErr = !timeSlot ? 'Vui lòng chọn khung giờ hẹn khám.' : '';


    setNameError(nErr);
    setPhoneError(pErr);
    setServiceError(sErr);
    setDentistError(dErr);
    setTimeError(tErr);

    if (nErr || pErr || sErr || dErr || tErr) return;

    // Check if phone number is locked
    const matchedPatient = patients.find(p => p.phone === patientPhone.trim());
    if (matchedPatient) {
      const cancelCount = appointments.filter(a => a.patientId === matchedPatient.id && a.status === 'Cancelled').length;
      const isLocked = (cancelCount >= 3 || matchedPatient.isLocked) && !matchedPatient.isUnlocked;
      if (isLocked) {
        setAntiSpamError('Số điện thoại này đã bị khóa do vi phạm chính sách hủy lịch hẹn hoặc không đến khám. Vui lòng liên hệ phòng khám để biết thêm chi tiết.');
        return;
      }
    }

    // Anti-spam checks
    if (!checkRateLimit(patientPhone)) return;
    if (!checkDuplicate(patientPhone, date, timeSlot)) return;

    setSubmitting(true);

    try {
      const latestSlots = await appointmentApi.ensureSlotAvailable(selectedDentistId, date, selectedServiceId, timeSlot);
      setAvailableSlots(latestSlots);
      setTimeSlot((prev) => latestSlots.includes(prev) ? prev : '');
    } catch (err: any) {
      setAntiSpamError(err.message || 'Khung giờ đã chọn không còn khả dụng. Vui lòng chọn lại.');
      setSlotRefreshTick((prev) => prev + 1);
      fetchSlotsRef.current?.();
      setSubmitting(false);
      return;
    }

    if (isStaffBooking) {
      await createAppointment(selectedDentistId);
    } else {
      setSubmitting(false);
      setShowOtpModal(true);
    }

  };

  const createAppointment = async (targetDentistId?: string, otpToken?: string) => {
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    const effectiveDentistId = targetDentistId || selectedDentistId;
    const dentist = dentists.find(d => d.id === effectiveDentistId) || dentists[0];
    if (!dentist) return;


    setSubmitting(true);
    setAntiSpamError('');

    try {
      const response = await appointmentApi.createAppointment({
        patientId: existingPatient?.id,
        patientName: existingPatient ? undefined : patientName.trim(),
        patientPhone: existingPatient ? undefined : patientPhone.trim(),
        dentistId: dentist.id,
        serviceId: service.id,
        startTime: timeSlot,
        bookingChannel: isStaffBooking ? 'Phone' : 'Online',
        otpToken,
      });

      const bookedApp = response.data;

      const localApp = {
        id: `A-${bookedApp.appointmentId}`,
        patientId: existingPatient?.id || `P-${bookedApp.patientId || ''}`,
        patientName: existingPatient?.name || patientName,
        patientPhone: existingPatient?.phone || patientPhone,
        serviceName: service.name,
        dentistId: dentist.id,
        dentistName: dentist.name,
        time: `${formatLocalDateStr(date)} @ ${timeSlot ? formatSlotToTimeString(timeSlot) : ''}`,
        status: 'Confirmed' as const,
      };


      addLog(
        isStaffBooking ? 'RECEPTION' : 'SYSTEM',
        'SUCCESS',
        isStaffBooking
          ? `Lễ tân đặt lịch hẹn mới thành công cho bệnh nhân SĐT ${patientPhone}.`
          : `OTP xác thực thành công cho SĐT ${patientPhone}. Lịch hẹn đã được tạo.`
      );

      setCreatedAppointment(localApp);
      setIsSuccess(true);   // Hiển thị thành công ngay lập tức
      refreshAllData();     // Chạy nền — không await để không block UI
    } catch (err: any) {
      console.error('Lỗi khi tạo lịch hẹn:', err);
      const errMsg = err.message || 'Khung giờ này vừa mới có người đặt. Vui lòng chọn lại giờ khám khác.';
      setAntiSpamError(errMsg);
      setTimeSlot('');
      setSlotRefreshTick((prev) => prev + 1);
      fetchSlotsRef.current?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerified = (otpToken: string) => {
    setShowOtpModal(false);
    void createAppointment(selectedDentistId, otpToken);
  };


  // Helper lấy giờ chuẩn Việt Nam (UTC+7) từ ISO string
  const getVietnamHour = (isoStr: string): number => {
    const dateObj = new Date(isoStr);
    if (isNaN(dateObj.getTime())) return 0;
    const vnDate = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
    return vnDate.getUTCHours();
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  const morningSlots = availableSlots.filter(slot => {
    const h = getVietnamHour(slot);
    return h >= 8 && h < 12;
  });
  const afternoonSlots = availableSlots.filter(slot => {
    const h = getVietnamHour(slot);
    return h >= 12 && h < 17;
  });
  const eveningSlots = availableSlots.filter(slot => {
    const h = getVietnamHour(slot);
    return h >= 17 && h < 21;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-4 text-on-primary flex justify-between items-center shrink-0">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <Icon name="calendar_add_on" />
            Tạo Lịch Hẹn Khám
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors" type="button">
            <Icon name="close" />
          </button>
        </div>

        {isSuccess && createdAppointment ? (
          <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Icon name="check_circle" className="text-[40px]" />
            </div>
            <h4 className="text-2xl font-extrabold text-on-surface">Đặt Hẹn Thành Công!</h4>
            <p className="text-emerald-700 font-bold text-sm">
              Mã lịch hẹn của bạn là: {createdAppointment.id}
            </p>

            <div className="bg-surface-container-low border border-outline-variant p-5 text-left space-y-2.5 max-w-md w-full text-xs rounded-xl">
              <div className="flex justify-between border-b border-dashed border-outline-variant pb-2">
                <span className="text-on-surface-variant font-medium">Bệnh nhân:</span>
                <span className="text-on-surface font-bold">{createdAppointment.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-outline-variant pb-2">
                <span className="text-on-surface-variant font-medium">Số điện thoại:</span>
                <span className="text-on-surface font-bold">{createdAppointment.patientPhone}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-outline-variant pb-2">
                <span className="text-on-surface-variant font-medium">Dịch vụ điều trị:</span>
                <span className="text-on-surface font-bold">{createdAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-outline-variant pb-2">
                <span className="text-on-surface-variant font-medium">Bác sĩ phụ trách:</span>
                <span className="text-on-surface font-bold">{createdAppointment.dentistName}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-on-surface-variant font-medium">Thời gian hẹn:</span>
                <span className="text-primary font-bold">{createdAppointment.time}</span>
              </div>
            </div>

            {/* QR Code Check-in Box */}
            <div className="p-4 border-2 border-dashed border-primary/30 bg-primary-container/10 rounded-xl inline-block">
              <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Mã QR Check-in của bạn</p>
              <div className="bg-white p-2 rounded-lg shadow-sm w-fit mx-auto border border-outline-variant">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${createdAppointment.id}`} alt="QR Code" className="w-28 h-28" />
              </div>

              <button
                type="button"
                onClick={() => downloadQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${createdAppointment.id}`, createdAppointment.id)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer hover:opacity-95"
              >
                <Icon name="download" className="text-base" />
                Lưu mã QR về máy
              </button>

              <p className="text-[10px] text-on-surface-variant mt-2 font-medium">Đưa mã QR này cho lễ tân khi đến phòng khám</p>
            </div>

            <div className="flex gap-3 w-full max-w-md pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setPatientName('');
                  setPatientPhone('');
                  setSelectedServiceId('');
                  setSelectedDentistId('');
                  setTimeSlot('');
                  setAntiSpamError('');
                }}
                className="flex-1 py-2.5 border border-primary text-primary font-bold rounded-xl text-xs hover:bg-primary/5 transition-all cursor-pointer"
              >
                Đặt thêm lịch mới
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white">

            {/* Header section inside form */}
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="edit_calendar" className="text-[#005eb8] text-xl" />
                <h4 className="text-lg font-extrabold text-[#0f172a]">Điền Thông Tin Đăng Ký Lịch Hẹn</h4>
              </div>
              {!isStaffBooking && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
                  <Icon name="verified_user" className="text-[14px]" /> Xác thực OTP an toàn
                </span>
              )}
            </div>

            {/* Row 1: Patient Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Họ và tên bệnh nhân *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => { setPatientName(e.target.value); setNameError(''); }}
                  onBlur={(e) => setNameError(validateName(e.target.value))}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${nameError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                    }`}
                />
                {nameError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{nameError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setPatientPhone(val);
                    setPhoneError('');
                    setAntiSpamError('');
                    const cleanPhone = val.trim().replace(/[\s-]/g, '');
                    if (cleanPhone.length >= 10) {
                      try {
                        const res = await clinicApi.lookupPatientByPhone(cleanPhone);
                        if (res?.success && res.data?.found && res.data?.fullName) {
                          setPatientName(res.data.fullName);
                          setNameError('');
                        }
                      } catch (err) {
                        console.error('Lỗi tra cứu SĐT:', err);
                      }
                    }
                  }}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    const err = validatePhone(val);
                    setPhoneError(err);
                    const cleanPhone = val.trim().replace(/[\s-]/g, '');
                    if (!err && cleanPhone.length >= 9) {
                      try {
                        const res = await clinicApi.lookupPatientByPhone(cleanPhone);
                        if (res?.success && res.data?.found && res.data?.fullName) {
                          setPatientName(res.data.fullName);
                          setNameError('');
                        }
                      } catch (err) {
                        console.error('Lỗi tra cứu SĐT:', err);
                      }
                    }
                  }}
                  placeholder="Ví dụ: 0912345678"
                  maxLength={11}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${phoneError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                    }`}
                />
                {phoneError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{phoneError}</p>}
                {existingPatient && !phoneError && (
                  <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <Icon name="check_circle" className="text-[14px]" /> Đã nhận diện bệnh nhân cũ: {existingPatient.name}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Service & Doctor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Dịch vụ nha khoa điều trị *
                </label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => { setSelectedServiceId(e.target.value); setServiceError(''); setAntiSpamError(''); }}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${serviceError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                    }`}
                >
                  <option value="">-- Chọn dịch vụ điều trị --</option>
                  {services.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.durationMin} phút (₫{s.price.toLocaleString('vi-VN')})
                    </option>
                  ))}
                </select>
                {serviceError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{serviceError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Bác sĩ thăm khám *
                </label>
                <select
                  required
                  value={selectedDentistId}
                  onChange={(e) => { setSelectedDentistId(e.target.value); setDentistError(''); setAntiSpamError(''); }}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${dentistError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                    }`}
                >
                  <option value="">-- Chọn bác sĩ phụ trách --</option>
                  {dentists.filter(d =>
                    doctorShifts.some(s => isSameDentistId(s.dentistId, d.id) && s.date === date)
                  ).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name.replace(/^bác sĩ\s+/i, 'BS. ')}
                    </option>
                  ))}

                </select>

                {dentistError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{dentistError}</p>}
              </div>
            </div>

            {/* Row 3: Date & Time slot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Ngày hẹn khám *
                </label>
                <input
                  type="date"
                  required
                  min={minDateStr}
                  max={maxDateStr}
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setAntiSpamError(''); }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#005eb8] focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Khung giờ hẹn * {selectedService && <span className="normal-case text-[#005eb8] font-semibold">({selectedService.durationMin} phút khám + 15p chuẩn bị/ca)</span>}
                </label>

                {!selectedServiceId ? (
                  <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-500 italic">
                    Vui lòng chọn dịch vụ điều trị để xem giờ trống
                  </div>
                ) : loadingSlots ? (
                  <div className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-primary font-bold flex items-center gap-2">
                    <Icon name="progress_activity" className="animate-spin text-base" />
                    Đang tải khung giờ trống...
                  </div>
                ) : slotsError || availableSlots.length === 0 ? (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-medium">
                    {slotsError || 'Không có khung giờ khả dụng trong ca trực của bác sĩ.'}
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={timeSlot}
                      onChange={(e) => { setTimeSlot(e.target.value); setTimeError(''); setAntiSpamError(''); }}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold text-[#005eb8] outline-none transition-all cursor-pointer ${timeError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                        }`}
                    >
                      <option value="">-- Chọn khung giờ trống --</option>
                      {availableSlots.map(slotIso => (
                        <option key={slotIso} value={slotIso}>
                          {formatSlotToTimeString(slotIso)}
                        </option>
                      ))}
                    </select>
                    {timeError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{timeError}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Time Slot Picker grouped by Morning / Afternoon / Evening */}
            {selectedServiceId && (
              <div className="space-y-3 pt-2">
                {loadingSlots && availableSlots.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2 min-h-[80px]">
                    <Icon name="progress_activity" className="animate-spin text-[#005eb8] text-base" />
                    <span>Đang kiểm tra ca trực và khung giờ trống của bác sĩ...</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className={`space-y-3 transition-opacity duration-150 ${loadingSlots ? 'opacity-60 pointer-events-none' : ''}`}>
                    {(() => {
                      const currentDentist = dentists.find(d => isSameDentistId(d.id, selectedDentistId));
                      const activeShifts = doctorShifts.filter(s => isSameDentistId(s.dentistId, selectedDentistId) && s.date === date);
                      const shiftDesc = activeShifts.map(s =>
                        s.shiftType === 'Morning' ? '☀️ Ca Sáng (08:00 – 14:00)' : s.shiftType === 'Afternoon' ? '🌙 Ca Chiều (14:00 – 20:00)' : '📅 Cả Ngày (08:00 – 20:00)'
                      ).join(' & ');

                      return (
                        <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between font-medium shadow-2xs">
                          <div className="flex items-center gap-2">
                            <Icon name="info" className="text-blue-600 text-base shrink-0" />
                            <span>
                              <strong className="text-blue-950 font-bold">{currentDentist?.name.replace(/^bác sĩ\s+/i, 'BS. ')}</strong> trực ngày {formatLocalDateStr(date)}: {' '}
                              <span className="font-extrabold text-blue-800">{shiftDesc || 'Theo lịch phân ca'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a] flex items-center gap-2">
                        <Icon name="schedule" className="text-[#005eb8] text-base" />
                        Chọn Nhanh Khung Giờ Hẹn Khám (Theo Buổi)
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Tổng số: <strong className="text-[#005eb8]">{availableSlots.length}</strong> khung giờ trống
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Buổi Sáng */}
                      {morningSlots.length > 0 && (
                        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                            <span className="text-base">☀️</span>
                            <span>Buổi Sáng</span>
                            <span className="text-[11px] text-amber-700 font-normal normal-case">(08:00 – 12:00)</span>
                            <span className="ml-auto text-[10px] bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                              {morningSlots.length} giờ
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {morningSlots.map(slot => {
                              const isSelected = timeSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => { setTimeSlot(slot); setTimeError(''); setAntiSpamError(''); }}
                                  className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1 ${isSelected
                                    ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md ring-2 ring-[#005eb8]/30 font-black'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#005eb8] hover:bg-blue-50/70'
                                    }`}
                                >
                                  {isSelected && <Icon name="check" className="text-[13px]" />}
                                  {formatSlotToTimeString(slot)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Buổi Chiều */}
                      {afternoonSlots.length > 0 && (
                        <div className="bg-sky-50/40 border border-sky-200/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900 uppercase tracking-wide">
                            <span className="text-base">🌤️</span>
                            <span>Buổi Chiều</span>
                            <span className="text-[11px] text-sky-700 font-normal normal-case">(12:00 – 17:00)</span>
                            <span className="ml-auto text-[10px] bg-sky-100/80 text-sky-900 px-2 py-0.5 rounded-full font-bold">
                              {afternoonSlots.length} giờ
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {afternoonSlots.map(slot => {
                              const isSelected = timeSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => { setTimeSlot(slot); setTimeError(''); setAntiSpamError(''); }}
                                  className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1 ${isSelected
                                    ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md ring-2 ring-[#005eb8]/30 font-black'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#005eb8] hover:bg-blue-50/70'
                                    }`}
                                >
                                  {isSelected && <Icon name="check" className="text-[13px]" />}
                                  {formatSlotToTimeString(slot)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Buổi Tối */}
                      {eveningSlots.length > 0 && (
                        <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                            <span className="text-base">🌙</span>
                            <span>Buổi Tối</span>
                            <span className="text-[11px] text-indigo-700 font-normal normal-case">(17:00 – 20:30)</span>
                            <span className="ml-auto text-[10px] bg-indigo-100/80 text-indigo-950 px-2 py-0.5 rounded-full font-bold">
                              {eveningSlots.length} giờ
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {eveningSlots.map(slot => {
                              const isSelected = timeSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => { setTimeSlot(slot); setTimeError(''); setAntiSpamError(''); }}
                                  className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1 ${isSelected
                                    ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md ring-2 ring-[#005eb8]/30 font-black'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#005eb8] hover:bg-blue-50/70'
                                    }`}
                                >
                                  {isSelected && <Icon name="check" className="text-[13px]" />}
                                  {formatSlotToTimeString(slot)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Notes / Symptom */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                Ghi chú triệu chứng hoặc nhu cầu đặc biệt (Không bắt buộc)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mô tả qua tình trạng răng miệng hiện tại (VD: ê buốt khi uống nước lạnh, niềng răng tháo lắp...)"
                className="w-full bg-slate-50 border border-slate-300 focus:border-[#005eb8] focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all resize-none"
              ></textarea>
            </div>

            {/* Anti-spam error */}
            {antiSpamError && (
              <div className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm animate-in fade-in">
                <Icon name="gpp_bad" className="text-[20px] shrink-0 mt-0.5" />
                <span className="font-medium">{antiSpamError}</span>
              </div>
            )}

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Icon name="lock" className="text-[14px] text-[#005eb8]" />
                <span>{isStaffBooking ? 'Đặt lịch phòng khám' : 'Xác thực OTP bảo mật'}</span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-[#005eb8] hover:bg-[#004a94] text-white rounded-xl font-bold text-sm shadow hover:shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? <Icon name="progress_activity" className="animate-spin text-base" /> : <Icon name="verified_user" className="text-base" />}
                  {submitting ? 'Đang xử lý...' : isStaffBooking ? 'Đăng Ký Hẹn' : 'Xác Nhận & Gửi OTP'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* OTP Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        phoneNumber={patientPhone}
        dentistId={selectedDentistId}
        startTime={timeSlot}
        serviceId={selectedServiceId}
        purpose="booking"
      />

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal(prev => ({ ...prev, open: false }))}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};
