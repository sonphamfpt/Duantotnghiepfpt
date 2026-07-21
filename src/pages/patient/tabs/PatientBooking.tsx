import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { OtpVerificationModal } from '../../../components/OtpVerificationModal';
import { AlertModal } from '../../../components/AlertModal';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';
import { appointmentApi } from '../../../services/api';

type Step = 1 | 2 | 3 | 4;


const mapFrontendToBackendId = (id: string): string => {
  const numPart = id.split('-')[1];
  return numPart ? parseInt(numPart, 10).toString() : id;
};

const formatSlotTime = (isoString: string): string => {
  const dateObj = new Date(isoString);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isMorningSlot = (isoString: string): boolean => {
  const dateObj = new Date(isoString);
  return dateObj.getHours() < 12;
};

const formatLocalDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

export const PatientBooking: React.FC = () => {
  const { services, dentists, patients, appointments, addLog, refreshAllData, doctorShifts } = useClinic();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState('');
  const [bookedApptId, setBookedApptId] = useState('');
  const [selectedDentist, setSelectedDentist] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState(''); // Lưu chuỗi ISO đầy đủ từ Backend
  const [note, setNote] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  // States gọi API
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submittingAppt, setSubmittingAppt] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [slotRefreshTick, setSlotRefreshTick] = useState(0);
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ open: false, title: '', message: '', type: 'error' });

  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAlertModal({ open: true, title, message, type });
  };

  const formatDateInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const day = value.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const patientName = user?.name || 'Bệnh nhân';
  const patientPhone = user?.phone || '';
  const patientId = user?.id || '';

  const matchedPatient = patients.find(p => p.id === patientId);
  const cancelCount = matchedPatient 
    ? appointments.filter(a => a.patientId === matchedPatient.id && a.status === 'Cancelled').length 
    : 0;
  const isLocked = matchedPatient 
    ? (matchedPatient.isLocked || cancelCount >= 3) && !matchedPatient.isUnlocked 
    : false;

  useEffect(() => {
    if (selectedDentist && selectedDate) {
      const isStillOnDuty = doctorShifts.some(
        s => s.dentistId === selectedDentist && s.date === selectedDate
      );
      if (!isStillOnDuty) {
        setSelectedDentist('');
        setSelectedTime('');
      }
    }
  }, [selectedDate, doctorShifts, selectedDentist]);

  // Tự động load danh sách slot khám trống từ API
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDentist || !selectedService || !selectedDate) {
        setAvailableSlots([]);
        setSelectedTime('');
        return;
      }

      setLoadingSlots(true);
      setSlotsError('');

      try {
        const response = await appointmentApi.getAvailableSlots(selectedDentist, selectedDate, selectedService);
        const slots = response.data || [];
        setAvailableSlots(slots);
        setSelectedTime((prev) => slots.includes(prev) ? prev : '');
      } catch (err: any) {
        console.error('Lỗi khi lấy slot khám:', err);
        setSlotsError(err.message || 'Lỗi kết nối máy chủ API.');
        setAvailableSlots([]);
        setSelectedTime('');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDentist, selectedService, selectedDate, slotRefreshTick]);

  useEffect(() => {
    if (!selectedDentist || !selectedService || selectedDate !== formatDateInputValue(new Date())) return;

    const timer = window.setInterval(() => {
      setSlotRefreshTick((prev) => prev + 1);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [selectedDate, selectedDentist, selectedService]);

  // Build next 14 days for date picker, starting from today
  const today = new Date();
  const dateOptions: { label: string; value: string; dayName: string }[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    dateOptions.push({
      label: i === 0 ? `Hôm nay, ${d.getDate()}/${d.getMonth() + 1}` : `${d.getDate()}/${d.getMonth() + 1}`,
      value: formatDateInputValue(d),
      dayName: dayNames[d.getDay()],
    });
  }

  const serviceSel = services.find(s => s.id === selectedService);
  const dentistSel = dentists.find(d => d.id === selectedDentist);

  const createAppointment = async (otpToken: string) => {
    if (!serviceSel || !dentistSel || !selectedDate || !selectedTime) {
      setSubmitError('Vui lòng hoàn thành đầy đủ các bước chọn dịch vụ, bác sĩ, ngày và khung giờ hẹn khám.');
      return;
    }

    setSubmittingAppt(true);
    setSubmitError('');

    try {
      const response = await appointmentApi.createAppointment({
        patientId,
        dentistId: selectedDentist,
        serviceId: selectedService,
        startTime: selectedTime,
        bookingChannel: 'Online',
        patientNotes: note || undefined,
        otpToken,
      });

      const bookedAppt = response.data;

      setBookedApptId(bookedAppt.appointmentId.toString());
      addLog('SYSTEM', 'SUCCESS', `Bệnh nhân ${patientName} đặt lịch trực tuyến thành công.`);
      await refreshAllData();
      setIsBooked(true);
      setStep(4);
    } catch (err: any) {
      console.error('Lỗi khi đặt lịch khám:', err);
      const errMsg = err.message || 'Lỗi kết nối máy chủ API.';
      setSubmitError(errMsg);
      showAlert('Đặt lịch không thành công', errMsg, 'error');
    } finally {
      setSubmittingAppt(false);
    }
  };

  const checkRateLimit = (phone: string): boolean => {
    const activeAppts = appointments.filter(
      a => a.patientPhone === phone.trim() &&
      a.status !== 'Completed' && a.status !== 'Cancelled'
    );
    if (activeAppts.length >= 3) {
      const msg = 'Bạn đã có 3 lịch hẹn đang chờ. Vui lòng hoàn thành hoặc hủy lịch cũ trước khi đặt thêm.';
      setSubmitError(msg);
      showAlert('Giới hạn lịch hẹn', msg, 'warning');
      return false;
    }
    return true;
  };

  const checkDuplicate = (phone: string, dateStr: string, timeIso: string): boolean => {
    const formattedDate = formatLocalDateStr(dateStr);
    const formattedTime = formatSlotTime(timeIso);
    const timeStr = `${formattedDate} @ ${formattedTime}`;
    const duplicate = appointments.find(
      a => a.patientPhone === phone.trim() &&
      a.time === timeStr &&
      a.status !== 'Cancelled'
    );
    if (duplicate) {
      const msg = 'Bạn đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.';
      setSubmitError(msg);
      showAlert('Trùng lịch hẹn', msg, 'warning');
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!serviceSel || !dentistSel || !selectedDate || !selectedTime) {
      setSubmitError('Vui lòng hoàn thành đầy đủ các bước chọn dịch vụ, bác sĩ, ngày và khung giờ hẹn khám.');
      return;
    }

    if (!checkRateLimit(patientPhone)) return;
    if (!checkDuplicate(patientPhone, selectedDate, selectedTime)) return;

    setSubmitError('');
    setSubmittingAppt(true);

    try {
      const latestSlots = await appointmentApi.ensureSlotAvailable(selectedDentist, selectedDate, selectedService, selectedTime);
      setAvailableSlots(latestSlots);
      setSelectedTime((prev) => latestSlots.includes(prev) ? prev : '');
      setShowOtpModal(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Khung giờ đã chọn không còn khả dụng. Vui lòng chọn lại.');
      setSlotRefreshTick((prev) => prev + 1);
    } finally {
      setSubmittingAppt(false);
    }
  };

  const handleOtpVerified = (otpToken: string) => {
    setShowOtpModal(false);
    void createAppointment(otpToken);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedService('');
    setSelectedDentist('');
    setSelectedDate('');
    setSelectedTime('');
    setNote('');
    setIsBooked(false);
    setBookedApptId('');
    setSubmitError('');
  };

  const steps = [
    { num: 1, label: 'Chọn dịch vụ' },
    { num: 2, label: 'Chọn ngày khám' },
    { num: 3, label: 'Chọn bác sĩ & giờ' },
    { num: 4, label: 'Xác nhận' },
  ];

  return (
    <div className="p-stack-lg max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-headline-md text-headline-md text-on-surface">Đặt lịch khám mới</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Hoàn thành 4 bước đơn giản để đặt lịch khám tại GoodSmile</p>
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center mb-10 px-2">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step > s.num
                    ? 'bg-secondary text-on-secondary shadow-md'
                    : step === s.num
                    ? 'bg-primary text-on-primary shadow-lg ring-4 ring-primary/20'
                    : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                }`}
              >
                {step > s.num ? (
                  <Icon name="check" className="text-[18px]" />
                ) : (
                  s.num
                )}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap ${step === s.num ? 'text-primary' : 'text-on-surface-variant'}`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${step > s.num ? 'bg-secondary' : 'bg-outline-variant'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Chọn dịch vụ */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          {isLocked ? (
            <div className="bg-error-container/10 border border-error/20 text-on-error-container rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-8">
              <div className="w-16 h-16 bg-error text-on-error rounded-full flex items-center justify-center mx-auto shadow-md">
                <Icon name="block" className="text-3xl text-white" />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Tài khoản của bạn đã bị khóa đặt lịch</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Số điện thoại của bạn đã bị tạm khóa do vi phạm chính sách hủy lịch hẹn hoặc không đến khám quá 3 lần. Vui lòng liên hệ trực tiếp với phòng khám để được hỗ trợ mở khóa.
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Bạn muốn khám dịch vụ gì?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.filter(s => s.isActive).map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedService(svc.id)}
                    className={`text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      selectedService === svc.id
                        ? 'border-primary bg-primary-container shadow-md'
                        : 'border-outline-variant bg-white hover:border-primary/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${selectedService === svc.id ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'}`}>
                          <Icon name="dentistry" className="text-[20px]" />
                        </div>
                        <p className={`font-bold text-body-md ${selectedService === svc.id ? 'text-on-primary-container' : 'text-on-surface'}`}>{svc.name}</p>
                        <p className={`text-xs mt-1 ${selectedService === svc.id ? 'text-on-primary-container/70' : 'text-on-surface-variant'}`}>
                          ⏱ {svc.durationMin} phút
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-label-md ${selectedService === svc.id ? 'text-primary' : 'text-secondary'}`}>
                          ₫{svc.price.toLocaleString()}
                        </p>
                        {selectedService === svc.id && (
                          <Icon name="check_circle" className="text-primary text-[20px]" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <button
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  Tiếp theo
                  <Icon name="arrow_forward" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Chọn ngày khám */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Chọn ngày khám</h3>
          <div>
            <div className="grid grid-cols-7 gap-2">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setSelectedDate(d.value); setSelectedTime(''); setSelectedDentist(''); }}
                  className={`flex flex-col items-center px-2 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedDate === d.value
                      ? 'border-primary bg-primary text-on-primary shadow-md'
                      : 'border-outline-variant bg-white hover:border-primary/40 text-on-surface'
                  }`}
                >
                  <span className="text-[11px] font-bold opacity-70">{d.dayName}</span>
                  <span className="text-body-lg font-bold">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-6 py-3 border border-outline text-on-surface rounded-xl font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-2">
              <Icon name="arrow_back" />
              Quay lại
            </button>
            <button
              disabled={!selectedDate}
              onClick={() => setStep(3)}
              className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              Tiếp theo
              <Icon name="arrow_forward" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Chọn bác sĩ & giờ */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">Chọn bác sĩ điều trị</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(() => {
                const activeDentists = dentists.filter(doc =>
                  doctorShifts.some(shift => shift.dentistId === doc.id && shift.date === selectedDate)
                );
                if (activeDentists.length === 0) {
                  return (
                    <div className="col-span-full bg-surface-container-low border border-outline-variant rounded-xl p-6 text-center text-on-surface-variant text-sm">
                      Không có bác sĩ nào trực vào ngày này. Vui lòng quay lại bước trước chọn ngày khác.
                    </div>
                  );
                }
                return activeDentists.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDentist(doc.id); setSelectedTime(''); }}
                    className={`text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                      selectedDentist === doc.id
                        ? 'border-primary bg-primary-container shadow-md'
                        : 'border-outline-variant bg-white hover:border-primary/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <img src={doc.avatar} alt={doc.name} className={`w-16 h-16 rounded-full object-cover border-2 ${selectedDentist === doc.id ? 'border-primary' : 'border-outline-variant'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold ${selectedDentist === doc.id ? 'text-on-primary-container' : 'text-on-surface'}`}>{doc.name}</p>
                      <p className={`text-xs mt-0.5 ${selectedDentist === doc.id ? 'text-on-primary-container/70' : 'text-on-surface-variant'}`}>{doc.role}</p>
                      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedDentist === doc.id ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        <Icon name="meeting_room" className="text-[12px]" />
                        {doc.room}
                      </div>
                    </div>
                    {selectedDentist === doc.id && (
                      <Icon name="check_circle" className="text-primary text-[24px]" />
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Time picker */}
          {selectedDentist && (
            <div>
              <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-3">Chọn khung giờ khám</p>
              
              {loadingSlots && (
                <div className="flex items-center gap-2 text-primary py-4">
                  <Icon name="progress_activity" className="animate-spin text-xl" />
                  <span className="text-sm font-semibold">Đang tải danh sách khung giờ trống...</span>
                </div>
              )}

              {slotsError && (
                <div className="text-error text-sm py-2">
                  ⚠️ {slotsError}
                </div>
              )}

              {!loadingSlots && !slotsError && availableSlots.length === 0 && (
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-center text-on-surface-variant text-sm">
                  Không còn khung giờ khám nào trống cho bác sĩ này vào ngày đã chọn. Vui lòng chọn bác sĩ hoặc ngày khác.
                </div>
              )}

              {!loadingSlots && !slotsError && availableSlots.length > 0 && (
                <div className="space-y-4">
                  {/* Morning Slots */}
                  {availableSlots.some(isMorningSlot) && (
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1">
                        <Icon name="light_mode" className="text-[16px]" /> Buổi sáng
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {availableSlots.filter(isMorningSlot).map((slot) => {
                          const displayTime = formatSlotTime(slot);
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={`py-2 px-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                                selectedTime === slot
                                  ? 'border-primary bg-primary text-on-primary shadow-md'
                                  : 'border-outline-variant bg-white hover:border-primary/50 text-on-surface'
                              }`}
                            >
                              {displayTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {availableSlots.some(slot => !isMorningSlot(slot)) && (
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1">
                        <Icon name="wb_twilight" className="text-[16px]" /> Buổi chiều
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {availableSlots.filter(slot => !isMorningSlot(slot)).map((slot) => {
                          const displayTime = formatSlotTime(slot);
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={`py-2 px-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                                selectedTime === slot
                                  ? 'border-primary bg-primary text-on-primary shadow-md'
                                  : 'border-outline-variant bg-white hover:border-primary/50 text-on-surface'
                              }`}
                            >
                              {displayTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Note Input */}
          {selectedDentist && selectedTime && (
            <div className="pt-2 animate-fade-in">
              <label className="block text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ghi chú triệu chứng (Không bắt buộc)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Răng bên phải hàm dưới bị ê buốt khi uống nước lạnh từ 2 tuần nay..."
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-md focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-6 py-3 border border-outline text-on-surface rounded-xl font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-2">
              <Icon name="arrow_back" />
              Quay lại
            </button>
            <button
              disabled={!selectedDentist || !selectedTime}
              onClick={() => {
                if (!checkRateLimit(patientPhone)) return;
                if (!checkDuplicate(patientPhone, selectedDate, selectedTime)) return;
                setStep(4);
                setSubmitError('');
              }}
              className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              Tiếp theo
              <Icon name="arrow_forward" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Xác nhận hoặc Thành công */}
      {step === 4 && !isBooked && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Xác nhận thông tin lịch hẹn</h3>

          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            {/* Summary header */}
            <div className="bg-primary p-6 text-on-primary">
              <div className="flex items-center gap-3">
                <Icon name="event_available" className="text-3xl" />
                <div>
                  <p className="font-bold text-headline-sm">Lịch hẹn sắp xếp</p>
                  <p className="text-sm opacity-80">Vui lòng kiểm tra kỹ trước khi xác nhận</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {[
                { icon: 'person', label: 'Bệnh nhân', value: patientName },
                { icon: 'dentistry', label: 'Dịch vụ', value: serviceSel?.name || '' },
                { icon: 'schedule', label: 'Thời lượng dự kiến', value: `${serviceSel?.durationMin} phút` },
                { icon: 'stethoscope', label: 'Bác sĩ phụ trách', value: dentistSel?.name || '' },
                { icon: 'meeting_room', label: 'Phòng khám', value: dentistSel?.room || '' },
                { icon: 'calendar_today', label: 'Ngày khám', value: selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '' },
                { icon: 'access_time', label: 'Giờ khám', value: selectedTime },
                { icon: 'payments', label: 'Chi phí ước tính', value: `₫${serviceSel?.price.toLocaleString()}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 py-3 border-b border-outline-variant/50 last:border-0">
                  <div className="w-9 h-9 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container shrink-0">
                    <Icon name={item.icon} className="text-[18px]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-on-surface-variant">{item.label}</p>
                    <p className="font-bold text-on-surface">{item.value}</p>
                  </div>
                </div>
              ))}
              {note && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                  <Icon name="sticky_note_2" className="text-amber-600 text-[20px] shrink-0" />
                  <p className="text-sm text-amber-800">{note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 flex gap-3 border border-outline-variant">
            <Icon name="info" className="text-secondary shrink-0" />
            <p className="text-xs text-on-surface-variant">
              Bạn sẽ nhận SMS xác nhận lịch hẹn trong vòng 5 phút. Vui lòng đến trước 10 phút và mang theo CCCD/Thẻ thành viên nếu có.
            </p>
          </div>

          {submitError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 flex gap-3 text-sm">
              <Icon name="error" className="shrink-0 text-red-600" />
              <div>
                <p className="font-bold">Lỗi đặt lịch</p>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(3)} className="px-6 py-3 border border-outline text-on-surface rounded-xl font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-2">
              <Icon name="arrow_back" />
              Sửa thông tin
            </button>
            <button
              disabled={submittingAppt}
              onClick={handleConfirm}
              className="px-8 py-3 bg-secondary text-on-secondary rounded-xl font-bold disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              {submittingAppt ? (
                <Icon name="progress_activity" className="animate-spin text-[18px]" />
              ) : (
                <Icon name="check_circle" />
              )}
              {submittingAppt ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
            </button>
          </div>
        </div>
      )}

      {/* Success screen */}
      {step === 4 && isBooked && (
        <div className="text-center py-8 space-y-4 animate-fade-in bg-white rounded-2xl border border-outline-variant shadow-sm max-w-xl mx-auto mt-4 p-6">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto shadow-md">
            <Icon name="check_circle" className="text-4xl text-on-secondary" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Đặt lịch thành công!</h3>
            <p className="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
              Lịch hẹn của bạn với <strong>{dentistSel?.name}</strong> lúc <strong>{selectedTime ? formatSlotTime(selectedTime) : ''}</strong> ({formatLocalDateStr(selectedDate)}) đã được xác nhận.
            </p>
          </div>
          
          <div className="mt-4 p-4 border-2 border-dashed border-primary/40 rounded-xl inline-block bg-primary/5">
            <p className="text-xs font-bold text-primary mb-2 uppercase">Mã QR Check-in của bạn</p>
            <div className="bg-white p-2 rounded-lg shadow-sm w-fit mx-auto border border-outline-variant">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookedApptId}`} alt="QR Code" className="w-32 h-32" />
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2 font-medium">Lưu lại mã này hoặc đưa cho lễ tân khi đến khám</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4 inline-block text-left w-full border border-outline-variant">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Thông tin tóm tắt</p>
            <div className="space-y-1.5 text-sm text-on-surface">
              <p className="flex items-center gap-2"><Icon name="dentistry" className="text-[16px] text-primary" /> {serviceSel?.name}</p>
              <p className="flex items-center gap-2"><Icon name="stethoscope" className="text-[16px] text-primary" /> {dentistSel?.name} — {dentistSel?.room}</p>
              <p className="flex items-center gap-2"><Icon name="event" className="text-[16px] text-primary" /> {formatLocalDateStr(selectedDate)} lúc {selectedTime ? formatSlotTime(selectedTime) : ''}</p>
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Icon name="add_circle" className="text-[18px]" />
              Đặt lịch hẹn khác
            </button>
          </div>
        </div>
      )}

      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
          phoneNumber={patientPhone}
          dentistId={selectedDentist}
          startTime={selectedTime}
          serviceId={selectedService}
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
