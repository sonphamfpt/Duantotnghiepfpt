import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { OtpVerificationModal } from '../../../components/OtpVerificationModal';
import { AlertModal } from '../../../components/AlertModal';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';
import { appointmentApi, clinicApi } from '../../../services/api';
import { isSameDentistId, getVietnamHour, isSlotInDoctorShifts } from '../../../utils/shiftUtils';
import { downloadQrCode } from '../../../utils/qrDownloader';

const formatSlotToTimeString = (isoString: string): string => {
  if (!isoString) return '';
  const dateObj = new Date(isoString);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatLocalDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

export const PatientBooking: React.FC = () => {
  const { services, dentists, patients, appointments, addLog, refreshAllData, doctorShifts } = useClinic();
  const { user } = useAuth();

  const formatDateInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const day = value.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayObj = new Date();
  const minDateStr = formatDateInputValue(todayObj);
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 14);
  const maxDateStr = formatDateInputValue(maxDateObj);

  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');

  const [date, setDate] = useState(minDateStr);
  const [selectedTimeIso, setSelectedTimeIso] = useState('');
  const [notes, setNotes] = useState('');

  const [isBooked, setIsBooked] = useState(false);
  const [bookedApptId, setBookedApptId] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  // API Slot states
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  // Dùng ref để giữ tham chiếu fetch function ổn định, tránh vòng lặp re-render
  const fetchSlotsRef = React.useRef<(() => void) | null>(null);
  const [antiSpamError, setAntiSpamError] = useState('');

  // Per-field validation errors matching BookingPage.tsx
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [dentistError, setDentistError] = useState('');
  const [timeError, setTimeError] = useState('');

  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ open: false, title: '', message: '', type: 'error' });

  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAntiSpamError(message);
    setAlertModal({ open: true, title, message, type });
  };

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

  const patientId = user?.id || '';
  const matchedPatient = patients.find(p => p.id === patientId || p.phone === patientPhone.trim());
  const cancelCount = matchedPatient 
    ? appointments.filter(a => a.patientId === matchedPatient.id && a.status === 'Cancelled').length 
    : 0;
  const isLocked = matchedPatient 
    ? (matchedPatient.isLocked || cancelCount >= 3) && !matchedPatient.isUnlocked 
    : false;

  // Auto-sync patient name & phone if logged in
  useEffect(() => {
    if (user?.name && !patientName) setPatientName(user.name);
    if (user?.phone && !patientPhone) setPatientPhone(user.phone);
  }, [user, patientName, patientPhone]);

  // Check doctor shifts on date change
  useEffect(() => {
    if (selectedDentistId && date) {
      const isStillOnDuty = doctorShifts.some(
        s => s.dentistId === selectedDentistId && s.date === date
      );
      if (!isStillOnDuty) {
        setSelectedDentistId('');
        setSelectedTimeIso('');
      }
    }
  }, [date, doctorShifts, selectedDentistId]);

  // Fetch slots — không dùng useCallback để tránh vòng lặp re-render
  const fetchAvailableSlots = async (dentistId: string, serviceId: string, dateStr: string) => {
    if (!serviceId || !dateStr || !dentistId) {
      setAvailableSlots([]);
      setSelectedTimeIso('');
      return;
    }

    setLoadingSlots(true);
    setSlotsError('');

    try {
      const response = await appointmentApi.getAvailableSlots(dentistId, dateStr, serviceId);
      const rawSlots = response.data || [];

      const activeShiftsForDoc = doctorShifts.filter(s => isSameDentistId(s.dentistId, dentistId) && s.date === dateStr);
      const slots = rawSlots.filter(slotIso => isSlotInDoctorShifts(slotIso, activeShiftsForDoc));

      if (slots.length > 0) {
        setAvailableSlots(slots);
        setSelectedTimeIso((prev) => slots.includes(prev) ? prev : (slots[0] || ''));
      } else {
        setSlotsError('Không có khung giờ trống trong ca trực của bác sĩ. Vui lòng chọn ngày hoặc bác sĩ khác.');
        setAvailableSlots([]);
        setSelectedTimeIso('');
      }
    } catch (err: any) {
      console.error('Lỗi khi lấy slot khám:', err);
      setSlotsError(err.message || 'Lỗi kết nối máy chủ API.');
      setAvailableSlots([]);
      setSelectedTimeIso('');
    } finally {
      setLoadingSlots(false);
    }
  };


  // Cập nhật ref mỗi khi dependencies thay đổi (không gây re-render)
  fetchSlotsRef.current = () => fetchAvailableSlots(selectedDentistId, selectedServiceId, date);

  // Fetch slot khi bác sĩ / dịch vụ / ngày thay đổi
  useEffect(() => {
    fetchAvailableSlots(selectedDentistId, selectedServiceId, date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDentistId, selectedServiceId, date]);

  const checkRateLimit = (phone: string): boolean => {
    const activeAppts = matchedPatient
      ? appointments.filter(
          a => a.patientId === matchedPatient.id &&
          (a.status === 'Pending' || a.status === 'Confirmed')
        )
      : appointments.filter(
          a => a.patientPhone === phone.trim() &&
          a.status !== 'Completed' && a.status !== 'Cancelled'
        );
    if (activeAppts.length >= 3) {
      const msg = `Bạn đã có ${activeAppts.length} lịch hẹn đang chờ. Vui lòng hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.`;
      showAlert('Quá giới hạn lịch hẹn', msg, 'warning');
      return false;
    }
    return true;
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




  const checkDuplicate = (phone: string, dateStr: string, timeIso: string): boolean => {
    const formattedDate = formatLocalDateStr(dateStr);
    const formattedTime = formatSlotToTimeString(timeIso);
    const timeStr = `${formattedDate} @ ${formattedTime}`;
    const duplicate = appointments.find(
      a => a.patientPhone === phone.trim() &&
      a.time === timeStr &&
      a.status !== 'Cancelled'
    );
    if (duplicate) {
      const msg = 'Bạn đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.';
      showAlert('Trùng lịch hẹn', msg, 'warning');
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
    const dErr = !selectedDentistId ? 'Vui lòng chọn bác sĩ thăm khám.' : '';
    const tErr = !selectedTimeIso ? 'Vui lòng chọn khung giờ hẹn khám.' : '';


    setNameError(nErr);
    setPhoneError(pErr);
    setServiceError(sErr);
    setDentistError(dErr);
    setTimeError(tErr);

    if (nErr || pErr || sErr || dErr || tErr) return;

    if (isLocked) {
      setAntiSpamError('Tài khoản của bạn đã bị tạm khóa do vi phạm chính sách hủy lịch quá 3 lần. Vui lòng liên hệ phòng khám.');
      return;
    }

    if (!checkRateLimit(patientPhone)) return;
    if (!checkDuplicate(patientPhone, date, selectedTimeIso)) return;

    setSubmitting(true);
    try {
      const latestSlots = await appointmentApi.ensureSlotAvailable(selectedDentistId, date, selectedServiceId, selectedTimeIso);
      setAvailableSlots(latestSlots);
      setSelectedTimeIso((prev) => latestSlots.includes(prev) ? prev : '');
      setShowOtpModal(true);
    } catch (err: any) {

      setAntiSpamError(err.message || 'Khung giờ đã chọn không còn khả dụng. Vui lòng chọn lại.');
      fetchSlotsRef.current?.();
    } finally {
      setSubmitting(false);
    }
  };

  const createAppointment = async (otpToken?: string) => {
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    const dentist = dentists.find(d => d.id === selectedDentistId) || dentists[0];
    if (!dentist) return;


    setSubmitting(true);
    setAntiSpamError('');

    try {
      const response = await appointmentApi.createAppointment({
        dentistId: dentist.id,
        serviceId: selectedServiceId,
        startTime: selectedTimeIso,
        bookingChannel: 'Online',
        patientNotes: notes || undefined,
        ...(user?.id ? { patientId: user.id } : { patientName: patientName.trim(), patientPhone: patientPhone.trim() }),
        otpToken,
      });

      const bookedApp = response.data;

      const localApp = {
        id: `A-${bookedApp.appointmentId}`,
        patientId: user?.id || `P-${bookedApp.patientId || ''}`,
        patientName: patientName,
        patientPhone: patientPhone,
        serviceName: service.name,
        dentistId: dentist.id,
        dentistName: dentist.name,
        time: `${formatLocalDateStr(date)} @ ${selectedTimeIso ? formatSlotToTimeString(selectedTimeIso) : ''}`,
        status: 'Confirmed' as const,
      };


      addLog('SYSTEM', 'SUCCESS', `Bệnh nhân ${patientName} (SĐT: ${patientPhone}) đặt lịch hẹn khám thành công.`);

      setBookedApptId(bookedApp.appointmentId.toString());
      setCreatedAppointment(localApp);
      setIsBooked(true);   // Hiển thị thành công ngay lập tức
      refreshAllData();    // Chạy nền — không await để không block UI
    } catch (err: any) {
      console.error('Lỗi khi tạo lịch hẹn:', err);
      const errMsg = err.message || 'Không thể tạo lịch hẹn.';
      setAntiSpamError(errMsg);
      showAlert('Đặt lịch không thành công', errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerified = (otpToken: string) => {
    setShowOtpModal(false);
    createAppointment(otpToken);
  };

  const handleReset = () => {
    setIsBooked(false);
    setSelectedServiceId('');
    setSelectedDentistId('');
    setSelectedTimeIso('');
    setNotes('');
    setBookedApptId('');
    setCreatedAppointment(null);
    setAntiSpamError('');
    // BUG-H02: Reset date về hôm nay tránh dùng lại ngày cũ (có thể quá khứ)
    setDate(minDateStr);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00478d] to-[#005eb8] p-6 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Cổng Thông Tin Bệnh Nhân
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-2">Đặt Lịch Khám Mới</h2>
          <p className="text-sm opacity-85 mt-1">Đăng ký lịch khám trực tuyến nhanh chóng trong 1 bước duy nhất</p>
        </div>
        <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 shrink-0">
          <Icon name="calendar_add_on" className="text-3xl text-white" />
        </div>
      </div>

      {isBooked && createdAppointment ? (
        /* SUCCESS SCREEN */
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 md:p-10 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <Icon name="check_circle" className="text-[48px]" />
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">Đặt Lịch Hẹn Thành Công!</h3>
          <p className="text-emerald-700 font-bold text-sm mt-1">
            Mã lịch hẹn của bạn là: {createdAppointment.id}
          </p>

          <div className="bg-slate-50 border border-slate-200 p-6 text-left space-y-3 max-w-md mx-auto my-6 text-sm rounded-xl">
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Bệnh nhân:</span>
              <span className="text-slate-900 font-bold">{createdAppointment.patientName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Số điện thoại:</span>
              <span className="text-slate-900 font-bold">{createdAppointment.patientPhone}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Dịch vụ điều trị:</span>
              <span className="text-slate-900 font-bold">{createdAppointment.serviceName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Bác sĩ phụ trách:</span>
              <span className="text-slate-900 font-bold">{createdAppointment.dentistName}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 font-medium">Thời gian hẹn:</span>
              <span className="text-[#005eb8] font-bold">{createdAppointment.time}</span>
            </div>
          </div>

          {/* QR Code Box */}
          <div className="p-4 border-2 border-dashed border-[#005eb8]/40 bg-blue-50/30 rounded-xl inline-block mb-6">
            <p className="text-xs font-bold text-[#005eb8] mb-2 uppercase">Mã QR Check-in của bạn</p>
            <div className="bg-white p-2 rounded-lg shadow-sm w-fit mx-auto border border-slate-200">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${createdAppointment.id}`} alt="QR Code" className="w-32 h-32" />
            </div>

            <button
              type="button"
              onClick={() => downloadQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${createdAppointment.id}`, createdAppointment.id)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#005eb8] hover:bg-[#00478d] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Icon name="download" className="text-base" />
              Lưu mã QR về máy
            </button>

            <p className="text-[10px] text-slate-500 mt-2 font-medium">Lưu lại mã QR này hoặc chụp màn hình đưa cho lễ tân khi đến khám</p>
          </div>

          <div>
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-[#005eb8] text-white rounded-xl font-bold hover:bg-[#004a94] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Icon name="add_circle" className="text-[20px]" />
              Đặt lịch hẹn khác
            </button>
          </div>
        </div>
      ) : (
        /* 1-STEP UNIFIED FORM */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          {/* Header inside form */}
          <div className="pb-4 border-b border-slate-200 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="edit_calendar" className="text-[#005eb8] text-2xl" />
              <h3 className="text-xl font-extrabold text-[#0f172a]">Điền Thông Tin Đăng Ký Lịch Hẹn</h3>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Icon name="verified_user" className="text-[14px]" /> Xác thực OTP an toàn
            </span>
          </div>

          {/* Account Locked Alert */}
          {isLocked && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex gap-3 text-red-800 text-sm">
              <Icon name="block" className="text-2xl text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-base">Tài khoản của bạn đã bị khóa đặt lịch</p>
                <p className="mt-1 leading-relaxed">
                  Số điện thoại này đã bị tạm khóa do vi phạm chính sách hủy lịch hẹn hoặc không đến khám quá 3 lần. Vui lòng liên hệ trực tiếp phòng khám qua Hotline <strong>0982.135.606</strong> để mở khóa.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Patient Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${
                    nameError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
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
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${
                    phoneError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
                  }`}
                />
                {phoneError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{phoneError}</p>}
              </div>
            </div>

            {/* Row 2: Service & Doctor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-[#475569] mb-1.5">
                  Dịch vụ nha khoa điều trị *
                </label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => { setSelectedServiceId(e.target.value); setServiceError(''); setAntiSpamError(''); }}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${
                    serviceError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
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
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${
                    dentistError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    {slotsError || 'Không có khung giờ khả dụng. Vui lòng chọn ngày khác.'}
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={selectedTimeIso}
                      onChange={(e) => { setSelectedTimeIso(e.target.value); setTimeError(''); setAntiSpamError(''); }}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold text-[#005eb8] outline-none transition-all cursor-pointer ${
                        timeError ? 'border-red-400 focus:border-red-500 focus:bg-white' : 'border-slate-300 focus:border-[#005eb8] focus:bg-white'
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
            {selectedServiceId && availableSlots.length > 0 && !loadingSlots && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a] flex items-center gap-2">
                    <Icon name="schedule" className="text-[#005eb8] text-base" />
                    Chọn Nhanh Khung Giờ Khám (Theo Buổi Sáng / Chiều / Tối)
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
                          const isSelected = selectedTimeIso === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setSelectedTimeIso(slot); setTimeError(''); setAntiSpamError(''); }}
                              className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isSelected
                                  ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md scale-[1.04] ring-2 ring-[#005eb8]/30'
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
                          const isSelected = selectedTimeIso === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setSelectedTimeIso(slot); setTimeError(''); setAntiSpamError(''); }}
                              className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isSelected
                                  ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md scale-[1.04] ring-2 ring-[#005eb8]/30'
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
                          const isSelected = selectedTimeIso === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setSelectedTimeIso(slot); setTimeError(''); setAntiSpamError(''); }}
                              className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isSelected
                                  ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-md scale-[1.04] ring-2 ring-[#005eb8]/30'
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

            {/* Submit button */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Icon name="lock" className="text-[14px] text-[#005eb8]" />
                <span>Bảo mật OTP 6 chữ số</span>
              </div>

              <button
                type="submit"
                disabled={submitting || isLocked}
                className="px-8 py-3 bg-[#005eb8] hover:bg-[#004a94] text-white rounded-xl font-bold text-sm shadow hover:shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? <Icon name="progress_activity" className="animate-spin text-base" /> : <Icon name="verified_user" className="text-base" />}
                {submitting ? 'Đang gửi mã OTP...' : 'Xác Nhận & Gửi OTP'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        phoneNumber={patientPhone}
        dentistId={selectedDentistId}
        startTime={selectedTimeIso}
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
