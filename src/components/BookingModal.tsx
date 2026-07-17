import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';
import { OtpVerificationModal } from './OtpVerificationModal';
import { appointmentApi, BookingChannel } from '../services/api';

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
  const { services, dentists, patients, appointments, addLog, refreshAllData } = useClinic();
  const { role, user } = useAuth();
  
  const [patientName, setPatientName] = useState(defaultPatientName);
  const [patientPhone, setPatientPhone] = useState(defaultPatientPhone);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  
  const initialDentistId = dentists.find(d => d.name === defaultDentistName)?.id || '';
  const [selectedDentistId, setSelectedDentistId] = useState(initialDentistId);
  
  const todayObj = new Date();
  const minDateStr = todayObj.toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 7);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffBookingChannel, setStaffBookingChannel] = useState<Extract<BookingChannel, 'Phone' | 'WalkIn'>>('WalkIn');
  const [slotRefreshTick, setSlotRefreshTick] = useState(0);

  const formatDateInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const day = value.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [antiSpamError, setAntiSpamError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

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

  const formatSlotToTimeString = (isoString: string): string => {
    if (!isoString) return '';
    const dateObj = new Date(isoString);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDentistId || !selectedServiceId || !date) {
        setAvailableSlots([]);
        setTimeSlot('');
        return;
      }

      setLoadingSlots(true);
      setSlotsError('');

      try {
        const response = await appointmentApi.getAvailableSlots(selectedDentistId, date, selectedServiceId);
        const slots = response.data || [];
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

    void fetchAvailableSlots();
  }, [date, selectedDentistId, selectedServiceId, slotRefreshTick]);

  useEffect(() => {
    if (!selectedDentistId || !selectedServiceId || date !== formatDateInputValue(new Date())) return;

    const timer = window.setInterval(() => {
      setSlotRefreshTick((prev) => prev + 1);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [date, selectedDentistId, selectedServiceId]);

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
      setAntiSpamError('Số điện thoại này đã có 3 lịch hẹn đang chờ. Vui lòng hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.');
      return false;
    }
    return true;
  };

  // Anti-spam: Duplicate detection — same phone + same date + same time
  const checkDuplicate = (phone: string, dateStr: string, time: string): boolean => {
    const timeStr = `${dateStr} @ ${time}`;
    const duplicate = appointments.find(
      a => a.patientPhone === phone.trim() && 
      a.time === timeStr &&
      a.status !== 'Cancelled'
    );
    if (duplicate) {
      setAntiSpamError('Bạn đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntiSpamError('');

    if (!patientName || !patientPhone || !selectedServiceId || !selectedDentistId || !timeSlot || !date) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

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
      setSubmitting(false);
      return;
    }

    if (isStaffBooking) {
      // Lễ tân/quản lý: tạo ngay, không cần OTP
      await createAppointment();
    } else {
      // Bệnh nhân: cần OTP
      setSubmitting(false);
      setShowOtpModal(true);
    }
  };

  const createAppointment = async (otpToken?: string) => {
    const service = services.find(s => s.id === selectedServiceId);
    const dentist = dentists.find(d => d.id === selectedDentistId);
    if (!service || !dentist) return;

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
        bookingChannel: isStaffBooking ? staffBookingChannel : 'Online',
        otpToken,
      });

      const bookedApp = response.data;

      const localApp = {
        id: `A-${bookedApp.appointmentId}`,
        patientId: existingPatient ? existingPatient.id : `P-${bookedApp.patientId || ''}`,
        patientName: existingPatient ? existingPatient.name : patientName,
        patientPhone: existingPatient ? existingPatient.phone : patientPhone,
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
          ? `Lễ tân tạo lịch hẹn qua kênh ${staffBookingChannel === 'Phone' ? 'điện thoại' : 'trực tiếp'} cho SĐT ${patientPhone}.`
          : `OTP xác thực thành công cho SĐT ${patientPhone}. Lịch hẹn đã được tạo.`
      );

      await refreshAllData();
      
      setCreatedAppointment(localApp);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Lỗi khi tạo lịch hẹn:', err);
      setAntiSpamError(err.message || 'Không thể tạo lịch hẹn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerified = (otpToken: string) => {
    setShowOtpModal(false);
    void createAppointment(otpToken);
  };

  // Get blocked time ranges for the selected dentist on selected date
  const selectedService = services.find(s => s.id === selectedServiceId);

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
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: Patient Info & Service */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar border-r border-outline-variant space-y-5 bg-white">
                
                <div className="space-y-4">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                    <Icon name="person" className="text-primary" /> Thông tin bệnh nhân
                  </h4>

                  {isStaffBooking && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                        Hình thức tiếp nhận *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'WalkIn' as const, label: 'Trực tiếp', icon: 'person' },
                          { value: 'Phone' as const, label: 'Điện thoại', icon: 'call' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setStaffBookingChannel(option.value)}
                            className={`px-3 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                              staffBookingChannel === option.value
                                ? 'bg-primary text-on-primary border-primary shadow-sm'
                                : 'bg-white text-on-surface border-outline-variant hover:border-primary/50'
                            }`}
                          >
                            <Icon name={option.icon} className="text-[18px]" />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                      Số điện thoại liên hệ *
                    </label>
                    <div className="relative">
                      <Icon name="call" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]" />
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => { setPatientPhone(e.target.value); setAntiSpamError(''); }}
                        placeholder="Nhập SĐT..."
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    {existingPatient && (
                      <p className="text-xs text-primary font-medium mt-1.5 flex items-center gap-1 animate-in fade-in">
                        <Icon name="check_circle" className="text-[14px]" /> Đã nhận diện bệnh nhân cũ
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                      Họ và tên bệnh nhân *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                    <Icon name="medical_services" className="text-secondary" /> Dịch vụ & Thời gian
                  </h4>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                      Dịch vụ nha khoa điều trị *
                    </label>
                    <select
                      required
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Chọn dịch vụ --</option>
                      {services.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.price.toLocaleString('vi-VN')}₫ ({s.durationMin} phút)
                        </option>
                      ))}
                    </select>
                    {selectedService && (
                      <p className="text-xs text-secondary font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                        <Icon name="schedule" className="text-[14px]" />
                        Thời gian ước tính: ~{selectedService.durationMin} phút
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                      Ngày khám *
                    </label>
                    <input
                      type="date"
                      required
                      min={minDateStr}
                      max={maxDateStr}
                      value={date}
                      onChange={(e) => { setDate(e.target.value); setAntiSpamError(''); }}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Anti-spam error */}
                {antiSpamError && (
                  <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm animate-in fade-in">
                    <Icon name="gpp_bad" className="text-[20px] shrink-0 mt-0.5" />
                    <span className="font-medium">{antiSpamError}</span>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Doctor & Time */}
              <div className="w-full md:w-1/2 p-6 bg-surface-container-lowest overflow-y-auto custom-scrollbar space-y-6">
                
                <div>
                  <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                    Chọn Khung giờ * {selectedService && <span className="normal-case text-secondary font-semibold">({selectedService.durationMin} phút/ca)</span>}
                  </label>
                  {!selectedDentistId || !date ? (
                    <p className="text-xs text-on-surface-variant italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-outline-variant">
                      Vui lòng chọn bác sĩ và ngày khám trước
                    </p>
                  ) : loadingSlots ? (
                    <div className="flex items-center justify-center gap-2 text-primary py-4 text-sm font-semibold">
                      <Icon name="progress_activity" className="animate-spin text-xl" />
                      Đang tải khung giờ trống...
                    </div>
                  ) : slotsError ? (
                    <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium">
                      {slotsError}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-outline-variant">
                      Không có khung giờ khả dụng. Vui lòng chọn bác sĩ, dịch vụ hoặc ngày khác.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map(slot => {
                          const isSelected = timeSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setTimeSlot(slot); setAntiSpamError(''); }}
                              className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                                isSelected
                                    ? 'bg-secondary text-on-secondary border-secondary shadow-md scale-105 cursor-pointer'
                                    : 'bg-white text-on-surface border-outline-variant hover:border-secondary/50 hover:bg-secondary/5 cursor-pointer'
                              }`}
                              title={formatSlotToTimeString(slot)}
                            >
                              {formatSlotToTimeString(slot)}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-2 flex items-center gap-1">
                          <Icon name="info" className="text-[12px]" />
                          Danh sách giờ được tính từ ca trực, dịch vụ và lịch đã có trong backend.
                        </p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-on-surface-variant mb-3">
                    Bác sĩ điều trị *
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {dentists.map(dentist => (
                      <button
                        key={dentist.id}
                        type="button"
                        onClick={() => setSelectedDentistId(dentist.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex items-center gap-3 ${
                          selectedDentistId === dentist.id
                            ? 'border-primary bg-primary-container/10 shadow-sm'
                            : 'border-outline-variant hover:border-primary/40 bg-white'
                        }`}
                      >
                        {selectedDentistId === dentist.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-xl" />
                        )}
                        
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant overflow-hidden">
                          <Icon name="person" className="text-on-surface-variant text-xl" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface">{dentist.name}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <Icon name="meeting_room" className="text-[14px]" /> {dentist.room}
                          </p>
                        </div>
                        
                        <div className="shrink-0">
                          {selectedDentistId === dentist.id ? (
                            <Icon name="check_circle" className="text-primary text-xl" />
                          ) : (
                            <Icon name="radio_button_unchecked" className="text-outline-variant text-xl" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* OTP info banner for patient */}
            {!isStaffBooking && (
              <div className="px-6 py-2 bg-blue-50 border-t border-blue-200 flex items-center gap-2 text-xs text-blue-800">
                <Icon name="verified_user" className="text-[16px] text-blue-600" />
                <span className="font-medium">Mã OTP sẽ được gửi đến số điện thoại để xác thực lịch hẹn</span>
              </div>
            )}

            {/* Sticky Footer */}
            <div className="p-4 border-t border-outline-variant bg-surface-container-low shrink-0 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-outline-variant text-on-surface rounded-xl font-bold cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="event_available" />}
                {submitting ? 'Đang xử lý...' : isStaffBooking ? 'Đăng Ký Hẹn' : 'Xác Nhận & Gửi OTP'}
              </button>
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
      />
    </div>
  );
};
