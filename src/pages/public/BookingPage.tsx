import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { OtpVerificationModal } from '../../components/OtpVerificationModal';
import { AlertModal } from '../../components/AlertModal';
import { appointmentApi, request } from '../../services/api';
import { isSameDentistId, getVietnamHour, isSlotInDoctorShifts } from '../../utils/shiftUtils';
import { socket } from '../../services/socketClient';

export const BookingPage: React.FC = () => {
  const { services, dentists, appointments, addLog, patients, refreshAllData, doctorShifts } = useClinic();
  const { role, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  useEffect(() => {
    if (role === 'patient' && user?.id) {
      const p = patients.find(p => p.id === user.id);
      if (p) {
        setPatientName(p.name);
        setPatientPhone(p.phone);
      }
    }
  }, [role, user, patients]);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');

  // Tự động chọn dịch vụ hoặc bác sĩ từ URL query params (?serviceId=... hoặc ?dentistId=...)
  useEffect(() => {
    const sId = searchParams.get('serviceId') || searchParams.get('service');
    if (sId && services.some(s => s.id === sId)) {
      setSelectedServiceId(sId);
    }
    const dId = searchParams.get('dentistId') || searchParams.get('dentist');
    if (dId && dentists.some(d => d.id === dId)) {
      setSelectedDentistId(dId);
    }
  }, [searchParams, services, dentists]);

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
  const [timeSlot, setTimeSlot] = useState('09:00 AM');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedTimeIso, setSelectedTimeIso] = useState('');
  // Dùng ref để giữ tham chiếu fetch function ổn định, tránh vòng lặp re-render
  const fetchSlotsRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    if (selectedDentistId && date && doctorShifts) {
      const isStillOnDuty = doctorShifts.some(
        s => s.dentistId === selectedDentistId && s.date === date
      );
      if (!isStillOnDuty) {
        setSelectedDentistId('');
        setSelectedTimeIso('');
      }
    }
  }, [date, doctorShifts, selectedDentistId]);

  // Date input formatter moved above

  const formatSlotToTimeString = (isoString: string): string => {
    if (!isoString) return '';
    const dateObj = new Date(isoString);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [antiSpamError, setAntiSpamError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ open: false, title: '', message: '', type: 'error' });

  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAntiSpamError(message);
    setAlertModal({ open: true, title, message, type });
  };

  // ─── Validation errors per-field ───────────────────────────────────────────
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

  const checkRateLimit = (phone: string): boolean => {
    const activeAppts = appointments.filter(
      a => a.patientPhone === phone.trim() &&
      a.status !== 'Completed' && a.status !== 'Cancelled'
    );
    if (activeAppts.length >= 3) {
      showAlert(
        'Quá giới hạn lịch hẹn',
        'Số điện thoại này đã có 3 lịch hẹn đang chờ. Vui lòng hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.',
        'warning'
      );
      return false;
    }
    return true;
  };

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
        'Số điện thoại này đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.',
        'warning'
      );
      return false;
    }
    return true;
  };

  // Hàm fetch slot — dùng trực tiếp, không qua useCallback để tránh vòng lặp re-render
  const fetchAvailableSlots = async (dentistId: string, serviceId: string, dateStr: string) => {
    if (!dentistId || !serviceId || !dateStr) {
      setAvailableSlots([]);
      setSelectedTimeIso('');
      return;
    }

    setLoadingSlots(true);
    setSlotsError('');

    try {
      const response = await appointmentApi.getAvailableSlots(dentistId, dateStr, serviceId);
      const rawSlots = response.data || [];

      // Lọc ngặt nghèo khung giờ trống theo đúng ca trực thực tế của bác sĩ trong ngày (chuẩn hóa ID D-01 = D-1)
      const activeShiftsForDoc = doctorShifts.filter(s => isSameDentistId(s.dentistId, dentistId) && s.date === dateStr);
      const slots = rawSlots.filter(slotIso => isSlotInDoctorShifts(slotIso, activeShiftsForDoc));

      if (slots.length > 0) {
        setAvailableSlots(slots);
        setSelectedTimeIso((prev) => slots.includes(prev) ? prev : (slots[0] || ''));
      } else {
        setSlotsError('Không có khung giờ trống trong ca trực của bác sĩ. Vui lòng chọn ngày khác.');
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

  // Lắng nghe real-time socket — KHÔNG dùng state tick để tránh re-render chain
  useEffect(() => {
    if (!selectedDentistId || !selectedServiceId) return;

    const handleAppointmentChange = () => {
      // Gọi qua ref để không bị stale closure và không trigger re-render
      fetchSlotsRef.current?.();
    };

    socket.on('appointment:created', handleAppointmentChange);
    socket.on('appointment:cancelled', handleAppointmentChange);

    return () => {
      socket.off('appointment:created', handleAppointmentChange);
      socket.off('appointment:cancelled', handleAppointmentChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDentistId, selectedServiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntiSpamError('');

    const isGuest = !(role === 'patient' && user?.id);

    // ─── Per-field validation ───────────────────────────────────────────────
    const nErr = isGuest ? validateName(patientName) : '';
    const pErr = isGuest ? validatePhone(patientPhone) : '';
    const sErr = !selectedServiceId ? 'Vui lòng chọn dịch vụ điều trị.' : '';
    const dErr = !selectedDentistId ? 'Vui lòng chọn bác sĩ thăm khám.' : '';
    const tErr = !selectedTimeIso ? 'Vui lòng chọn khung giờ hẹn khám.' : '';

    setNameError(nErr);
    setPhoneError(pErr);
    setServiceError(sErr);
    setDentistError(dErr);
    setTimeError(tErr);

    if (nErr || pErr || sErr || dErr || tErr) return;

    // Check if phone number is locked
    const checkPhone = isGuest ? patientPhone : (user?.phone || '');
    if (checkPhone) {
      const matchedPatient = patients.find(p => p.phone === checkPhone.trim().replace(/\s|-/g, ''));
      if (matchedPatient) {
        const cancelCount = appointments.filter(a => a.patientId === matchedPatient.id && a.status === 'Cancelled').length;
        const isLocked = (cancelCount >= 3 || matchedPatient.isLocked) && !matchedPatient.isUnlocked;
        if (isLocked) {
          showAlert(
            'Số điện thoại bị khóa',
            'Số điện thoại này đã bị khóa do vi phạm chính sách hủy lịch hẹn hoặc không đến khám. Vui lòng liên hệ phòng khám để biết thêm chi tiết.',
            'error'
          );
          return;
        }
      }
    }

    // Anti-spam checks
    if (!checkRateLimit(checkPhone)) return;
    const formattedTime = formatSlotToTimeString(selectedTimeIso);
    if (!checkDuplicate(checkPhone, date, formattedTime)) return;

    // Gọi API gửi OTP thực tế cho tất cả đặt lịch trực tuyến
    setSendingOtp(true);
    try {
      const latestSlots = await appointmentApi.ensureSlotAvailable(selectedDentistId, date, selectedServiceId, selectedTimeIso);
      setAvailableSlots(latestSlots);
      setSelectedTimeIso((prev) => latestSlots.includes(prev) ? prev : '');

      await request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: checkPhone.trim() }),
      });
      setShowOtpModal(true);
    } catch (err: any) {
      showAlert(
        'Gửi OTP thất bại',
        err.message || 'Không thể kết nối đến máy chủ API để gửi OTP.',
        'error'
      );
      fetchSlotsRef.current?.();
    } finally {
      setSendingOtp(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const mapFrontendToBackendId = (id: string): string => {
    const numPart = id.split('-')[1];
    return numPart ? parseInt(numPart, 10).toString() : id;
  };

  const constructUtcIsoString = (dateStr: string, timeSlotStr: string): string => {
    const [time, ampm] = timeSlotStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    // Construct Date object in local timezone
    const dateObj = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    return dateObj.toISOString();
  };

const formatLocalDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  const normalizePhone = (phone: string): string => phone.trim().replace(/\s|-/g, '');

  const createAppointment = async (otpToken?: string) => {
    const service = services.find(s => s.id === selectedServiceId);
    const dentist = dentists.find(d => d.id === selectedDentistId);
    if (!service || !dentist) return;

    setSubmitting(true);
    setApiError('');

    const dentistDbId = mapFrontendToBackendId(selectedDentistId);
    const serviceDbId = mapFrontendToBackendId(selectedServiceId);
    const startTimeIso = selectedTimeIso;

    try {
      const response = await appointmentApi.createAppointment({
        dentistId: selectedDentistId,
        serviceId: selectedServiceId,
        startTime: startTimeIso,
        bookingChannel: 'Online',
        patientNotes: notes || undefined,
        ...(role === 'patient' && user?.id
          ? { patientId: user.id }
          : { patientName: patientName.trim(), patientPhone: normalizePhone(patientPhone) }
        ),
        otpToken,
      });

      const bookedApp = response.data;

      const localApp = {
        id: `A-${bookedApp.appointmentId}`,
        patientId: role === 'patient' && user?.id ? user.id : `P-${bookedApp.patientId || ''}`,
        patientName: role === 'patient' && user?.id ? user.name : patientName,
        patientPhone: role === 'patient' && user?.id ? (user.phone || '') : patientPhone,
        serviceName: service.name,
        dentistId: dentist.id,
        dentistName: dentist.name,
        time: `${formatLocalDateStr(date)} @ ${selectedTimeIso ? formatSlotToTimeString(selectedTimeIso) : ''}`,
        status: 'Confirmed' as const,
      };

      addLog('SYSTEM', 'SUCCESS', `Khách vãng lai đặt lịch thành công qua OTP cho SĐT ${patientPhone}. Lịch hẹn ${bookedApp.appointmentId} đã được tạo.`);

      setCreatedAppointment(localApp);
      setIsSuccess(true); // Hiển thị thành công ngay lập tức
      refreshAllData();   // Chạy nền — không await để không block UI
    } catch (err: any) {
      console.error('Lỗi khi lưu lịch hẹn:', err);
      const errMsg = err.message || 'Không thể kết nối đến máy chủ API.';
      setApiError(errMsg);
      showAlert('Đặt lịch không thành công', errMsg, 'error');
      fetchSlotsRef.current?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerified = (otpToken: string) => {
    setShowOtpModal(false);
    createAppointment(otpToken);
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
    <div className="bg-[#f8fafc] min-h-screen font-body-md pb-20">
      {/* ── Premium Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] py-16 px-6 md:px-16 text-center text-white">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-4">
          <span className="text-white/80 font-bold tracking-widest uppercase text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Dịch vụ Y tế Đẳng cấp
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Đặt Lịch Hẹn Khám Bệnh
          </h1>
          <p className="text-white/85 text-base md:text-lg max-w-2xl leading-relaxed">
            Đặt lịch hẹn trực tuyến nhanh chóng chỉ trong 1 phút. Xác thực OTP để đảm bảo an toàn lịch hẹn.
          </p>
        </div>
      </section>

      {/* ── Content Grid ── */}
      <div className="max-w-6xl mx-auto px-6 mt-12">
        {isSuccess && createdAppointment ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border-2 border-emerald-500 max-w-2xl mx-auto p-8 md:p-12 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="check_circle" className="text-[48px]" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#0f172a] mb-2">Đặt Hẹn Thành Công!</h2>
            <p className="text-emerald-700 font-bold text-sm mb-1">
              Mã lịch hẹn của bạn là: {createdAppointment.id}
            </p>
            <p className="text-xs text-emerald-600 mb-6 flex items-center justify-center gap-1">
              <Icon name="verified" className="text-[14px]" />
              Đã xác thực qua OTP
            </p>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 text-left space-y-3 max-w-md mx-auto mb-8 text-sm">
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-[#64748b] font-medium">Bệnh nhân:</span>
                <span className="text-[#0f172a] font-bold">{createdAppointment.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-[#64748b] font-medium">Số điện thoại:</span>
                <span className="text-[#0f172a] font-bold">{createdAppointment.patientPhone}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-[#64748b] font-medium">Dịch vụ điều trị:</span>
                <span className="text-[#0f172a] font-bold">{createdAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-[#64748b] font-medium">Bác sĩ phụ trách:</span>
                <span className="text-[#0f172a] font-bold">{createdAppointment.dentistName}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#64748b] font-medium">Thời gian hẹn:</span>
                <span className="text-[#005eb8] font-bold">{createdAppointment.time}</span>
              </div>
            </div>

            {/* QR Code Check-in Box */}
            <div className="mb-6 p-4 border-2 border-dashed border-[#005eb8]/40 bg-blue-50/30 rounded-xl inline-block">
              <p className="text-xs font-bold text-[#005eb8] mb-2 uppercase">Mã QR Check-in của bạn</p>
              <div className="bg-white p-2 rounded-lg shadow-sm w-fit mx-auto border border-slate-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${createdAppointment.id}`} alt="QR Code" className="w-32 h-32" />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Lưu lại mã QR này hoặc chụp màn hình đưa cho lễ tân khi đến khám</p>
            </div>

            <p className="text-xs text-slate-500 mb-8 leading-relaxed">
              * Vui lòng tới trước lịch hẹn khoảng 10-15 phút để quầy tiếp đón làm thủ tục và kiểm tra sức khỏe cơ bản. Xin cảm ơn quý khách!
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setPatientName('');
                  setPatientPhone('');
                  setSelectedServiceId('');
                  setSelectedDentistId('');
                  setNotes('');
                  setAntiSpamError('');
                }}
                className="bg-white text-[#005eb8] border border-[#005eb8] px-6 py-2.5 font-bold hover:bg-[#eff6ff] transition-colors cursor-pointer"
              >
                Đặt thêm lịch mới
              </button>
              <Link
                to="/"
                className="bg-[#005eb8] text-white px-6 py-2.5 font-bold hover:bg-[#004a94] transition-colors cursor-pointer"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          /* FORM SCREEN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Guidelines */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-[#e2e8f0] p-6 shadow-sm">
                <h3 className="text-[#0f172a] font-bold text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Icon name="info" className="text-[#005eb8]" />
                  Hướng Dẫn Đặt Lịch
                </h3>
                <ul className="space-y-4 text-sm text-[#475569]">
                  <li className="flex gap-3">
                    <span className="bg-[#eff6ff] text-[#1d4ed8] w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">1</span>
                    <p className="leading-relaxed">
                      <strong>Chọn dịch vụ chuyên khoa:</strong> Giúp phòng khám sắp xếp đúng trang thiết bị chuyên dụng phục vụ việc thăm khám của bạn.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#eff6ff] text-[#1d4ed8] w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">2</span>
                    <p className="leading-relaxed">
                      <strong>Chọn bác sĩ phụ trách:</strong> Bạn có thể tự do lựa chọn chuyên gia mong muốn điều trị cho mình hoặc chọn bất kỳ bác sĩ phù hợp.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#eff6ff] text-[#1d4ed8] w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">3</span>
                    <p className="leading-relaxed">
                      <strong>Xác nhận OTP:</strong> Mã xác thực sẽ được gửi đến số điện thoại đăng ký để đảm bảo tính xác thực của lịch hẹn.
                    </p>
                  </li>
                </ul>
              </div>

              {/* OTP Security Banner */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 shadow-sm">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Icon name="verified_user" className="text-[16px]" />
                  Bảo Mật Lịch Hẹn
                </h4>
                <p className="text-sm text-blue-900 leading-relaxed">
                  Mỗi lịch hẹn được xác thực qua <strong>mã OTP 6 số</strong> gửi đến số điện thoại đăng ký, giúp ngăn chặn đặt lịch spam và đảm bảo an toàn cho bạn.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#eff6ff] to-[#f0fdf4] border border-[#bfdbfe] p-6 shadow-sm">
                <h4 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Icon name="support_agent" className="text-[16px]" />
                  Hỗ Trợ Khẩn Cấp
                </h4>
                <p className="text-sm text-[#1e3a8a] leading-relaxed">
                  Nếu bạn gặp triệu chứng đau buốt tủy cấp tính hoặc chấn thương răng hàm khẩn cấp, vui lòng gọi điện thoại hotline <strong>0982.135.606</strong> để nhận lịch cấp cứu nha khoa lập tức.
                </p>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:col-span-8">
              <div className="bg-white border border-[#e2e8f0] p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#0f172a] mb-6 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Icon name="edit_calendar" className="text-[#005eb8]" />
                  Điền Thông Tin Đăng Ký
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Họ và tên bệnh nhân *
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => { setPatientName(e.target.value); setNameError(''); }}
                        onBlur={(e) => setNameError(validateName(e.target.value))}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className={`w-full bg-slate-50 border focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all ${
                          nameError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#005eb8]'
                        }`}
                      />
                      {nameError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{nameError}</p>}
                    </div>

                    {/* Patient Phone */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Số điện thoại liên hệ *
                      </label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => { setPatientPhone(e.target.value); setPhoneError(''); setAntiSpamError(''); }}
                        onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                        placeholder="Ví dụ: 0912345678"
                        maxLength={11}
                        className={`w-full bg-slate-50 border focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all ${
                          phoneError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#005eb8]'
                        }`}
                      />
                      {phoneError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{phoneError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Select Service */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Dịch vụ điều trị *
                      </label>
                      <select
                        required
                        value={selectedServiceId}
                        onChange={(e) => { setSelectedServiceId(e.target.value); setServiceError(''); }}
                        className={`w-full bg-slate-50 border focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all ${
                          serviceError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#005eb8]'
                        }`}
                      >
                        <option value="">-- Chọn dịch vụ --</option>
                        {services.filter(s => s.isActive).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.durationMin} phút (₫{s.price.toLocaleString()})
                          </option>
                        ))}
                      </select>
                      {serviceError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{serviceError}</p>}
                    </div>

                    {/* Select Dentist */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Bác sĩ thăm khám *
                      </label>
                      <select
                        required
                        value={selectedDentistId}
                        onChange={(e) => { setSelectedDentistId(e.target.value); setDentistError(''); }}
                        className={`w-full bg-slate-50 border focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all ${
                          dentistError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#005eb8]'
                        }`}
                      >
                        <option value="">
                          {(() => {
                            const activeDentists = dentists.filter(d => 
                              doctorShifts.some(s => isSameDentistId(s.dentistId, d.id) && s.date === date)
                            );
                            return activeDentists.length === 0 
                              ? "-- Không có bác sĩ trực ngày này --" 
                              : "-- Chọn bác sĩ phụ trách --";
                          })()}
                        </option>
                        {dentists.filter(d => 
                          doctorShifts.some(s => isSameDentistId(s.dentistId, d.id) && s.date === date)
                        ).map(d => {
                          const dayShifts = doctorShifts.filter(s => isSameDentistId(s.dentistId, d.id) && s.date === date);
                          const shiftLabel = dayShifts.map(s => 
                            s.shiftType === 'Morning' ? '☀️ Ca sáng' : s.shiftType === 'Afternoon' ? '🌙 Ca chiều' : '📅 Cả ngày'
                          ).join(' & ');

                          return (
                            <option key={d.id} value={d.id}>
                              {d.name.replace(/^bác sĩ\s+/i, 'BS. ')} ({d.room} — {shiftLabel})
                            </option>
                          );
                        })}
                      </select>
                      {dentistError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{dentistError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Ngày hẹn khám *
                      </label>
                      <input
                        type="date"
                        required
                        min={minDateStr}
                        max={maxDateStr}
                        value={date}
                        onChange={(e) => { setDate(e.target.value); setAntiSpamError(''); }}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#005eb8] focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all"
                      />
                    </div>

                    {/* Time slot */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                        Khung giờ hẹn * {selectedService && <span className="normal-case text-[#005eb8] font-semibold">({selectedService.durationMin} phút khám + 15p chuẩn bị/ca)</span>}
                      </label>
                      <select
                        required
                        value={selectedTimeIso}
                        onChange={(e) => { setSelectedTimeIso(e.target.value); setAntiSpamError(''); setTimeError(''); }}
                        className={`w-full bg-slate-50 border focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all ${
                          timeError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#005eb8]'
                        }`}
                        disabled={loadingSlots || availableSlots.length === 0}
                      >
                        {loadingSlots ? (
                          <option value="">Đang tải các giờ trống...</option>
                        ) : availableSlots.length === 0 ? (
                          <option value="">-- Không có ca trực hoặc hết giờ trống --</option>
                        ) : (
                          availableSlots.map(slotIso => (
                            <option key={slotIso} value={slotIso}>
                              {formatSlotToTimeString(slotIso)}
                            </option>
                          ))
                        )}
                      </select>
                      {timeError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{timeError}</p>}
                      {slotsError && !timeError && <p className="text-orange-500 text-xs mt-1 flex items-center gap-1"><span>ℹ</span>{slotsError}</p>}
                    </div>
                  </div>

                  {/* Session-Grouped Time Slot Quick Picker */}
                  {selectedDentistId && selectedServiceId && availableSlots.length > 0 && !loadingSlots && (
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
                    <label className="block text-xs font-bold uppercase text-[#475569] mb-2">
                      Ghi chú triệu chứng hoặc nhu cầu đặc biệt (Không bắt buộc)
                    </label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Mô tả qua tình trạng răng miệng hiện tại (VD: ê buốt khi uống nước lạnh, niềng răng tháo lắp...)"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#005eb8] focus:bg-white rounded px-4 py-2.5 text-sm outline-none transition-all resize-none"
                    ></textarea>
                  </div>

                  {/* Anti-spam error */}
                  {antiSpamError && (
                    <div id="booking-error-banner" className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm animate-in fade-in">
                      <Icon name="gpp_bad" className="text-[20px] shrink-0 mt-0.5" />
                      <span className="font-medium">{antiSpamError}</span>
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div className="pt-4 border-t border-slate-100 flex gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <Icon name="lock" className="text-[14px]" />
                      <span className="font-medium">Xác thực OTP bảo mật</span>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="bg-[#005eb8] hover:bg-[#004a94] text-white font-bold px-8 py-2.5 shadow hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Icon name="verified_user" className="text-[18px]" />
                        Xác Nhận & Gửi OTP
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OTP Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        phoneNumber={patientPhone || user?.phone || ''}
        dentistId={selectedDentistId}
        startTime={selectedTimeIso}
        serviceId={selectedServiceId}
        sendOnOpen={false}
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
