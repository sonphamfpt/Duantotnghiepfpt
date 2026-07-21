import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Icon } from './Icon';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointmentId
}) => {
  const { dentists, appointments, rescheduleAppointment, doctorShifts } = useClinic();
  
  const [selectedDentistId, setSelectedDentistId] = useState('');
  
  const formatDateInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const day = value.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayObj = new Date();
  const minDateStr = formatDateInputValue(todayObj);
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 14); // Allow rescheduling up to 2 weeks
  const maxDateStr = formatDateInputValue(maxDateObj);

  const [date, setDate] = useState(minDateStr);
  const [timeSlot, setTimeSlot] = useState('');
  const [error, setError] = useState('');
  
  const [selectedApptId, setSelectedApptId] = useState<string>('');
  const [isGlobalMode, setIsGlobalMode] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (appointmentId) {
        setIsGlobalMode(false);
        setSelectedApptId(appointmentId);
      } else {
        setIsGlobalMode(true);
        setSelectedApptId('');
        setSelectedDentistId('');
        setDate(minDateStr);
        setTimeSlot('');
        setError('');
      }
    }
  }, [isOpen, appointmentId, minDateStr]);

  const appointment = appointments.find(a => a.id === selectedApptId);

  useEffect(() => {
    if (appointment && isOpen && !isGlobalMode) {
      setSelectedDentistId(appointment.dentistId || '');
      
      if (appointment.time.includes('@')) {
        const [dPart, tPart] = appointment.time.split('@').map(s => s.trim());
        setDate(minDateStr); 
        setTimeSlot(tPart);
      } else {
        setDate(minDateStr);
        setTimeSlot('');
      }
      setError('');
    } else if (appointment && isOpen && isGlobalMode) {
        // When user selects an appointment in global mode, auto-fill dentist
        setSelectedDentistId(appointment.dentistId || '');
        if (appointment.time.includes('@')) {
          const [dPart, tPart] = appointment.time.split('@').map(s => s.trim());
          setTimeSlot(tPart);
        } else {
          setTimeSlot('');
        }
    }
  }, [appointment, isOpen, minDateStr, isGlobalMode]);

  useEffect(() => {
    if (selectedDentistId && date) {
      const isStillOnDuty = doctorShifts.some(
        s => s.dentistId === selectedDentistId && s.date === date
      );
      if (!isStillOnDuty) {
        setSelectedDentistId('');
        setTimeSlot('');
      }
    }
  }, [date, doctorShifts, selectedDentistId]);

  if (!isOpen) return null;

  const formatLocalDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  // Anti-spam: Duplicate detection — same phone + same date + same time
  const checkDuplicate = (phone: string, dateStr: string, time: string): boolean => {
    const timeStr = `${formatLocalDateStr(dateStr)} @ ${time}`;
    const duplicate = appointments.find(
      a => a.patientPhone === phone.trim() && 
      a.time === timeStr &&
      a.status !== 'Cancelled' &&
      a.id !== appointment?.id // exclude current appointment
    );
    if (duplicate) {
      setError('Bệnh nhân đã có lịch hẹn vào khung giờ này rồi. Vui lòng chọn thời gian khác.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!appointment) {
      alert('Vui lòng chọn lịch hẹn cần dời!');
      return;
    }

    if (!selectedDentistId || !timeSlot || !date) {
      alert('Vui lòng chọn ngày, giờ và bác sĩ đầy đủ!');
      return;
    }

    if (!checkDuplicate(appointment.patientPhone, date, timeSlot)) return;

    const dentist = dentists.find(d => d.id === selectedDentistId);
    if (!dentist) return;

    // Use a simpler date format matching the input type="date" + time
    const newTimeStr = `${date} @ ${timeSlot}`;
    
    rescheduleAppointment(appointment.id, newTimeStr, dentist.id, dentist.name);
    
    // Reset and close
    onClose();
  };

  const timeSlots = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
    '10:15 AM', '11:00 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-4 text-on-primary flex justify-between items-center shrink-0">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <Icon name="edit_calendar" />
            Dời Lịch Hẹn
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors" type="button">
            <Icon name="close" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            
            {/* LEFT COLUMN: Patient Info & Date */}
            <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar border-r border-outline-variant space-y-5 bg-white">
              
              <div className="space-y-4">
                <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                  <Icon name="person" className="text-primary" /> Thông tin ca hẹn
                </h4>
                
                {isGlobalMode && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                      Chọn lịch hẹn cần dời *
                    </label>
                    <select
                      value={selectedApptId}
                      onChange={(e) => setSelectedApptId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Chọn lịch hẹn --</option>
                      {appointments
                        .filter(a => a.status === 'Confirmed')
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.patientName} - {a.time} ({a.dentistName})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {appointment ? (
                  <div className="bg-surface-container p-3 rounded-xl border border-outline-variant">
                    <p className="text-sm font-bold text-on-surface">{appointment.patientName}</p>
                    <p className="text-xs text-on-surface-variant mt-1"><Icon name="call" className="inline text-[14px]" /> {appointment.patientPhone}</p>
                    <div className="my-2 border-t border-outline-variant/50"></div>
                    <p className="text-xs text-on-surface-variant"><span className="font-bold text-on-surface">Dịch vụ:</span> {appointment.serviceName}</p>
                    <p className="text-xs text-on-surface-variant mt-1"><span className="font-bold text-on-surface">Lịch cũ:</span> {appointment.time} - {appointment.dentistName}</p>
                  </div>
                ) : (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-dashed border-outline-variant text-center">
                    <p className="text-xs text-on-surface-variant">Vui lòng chọn lịch hẹn cần dời ở trên</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                  <Icon name="medical_services" className="text-secondary" /> Lịch Dời Tới
                </h4>
                
                <div>
                  <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                    Ngày khám mới *
                  </label>
                  <input
                    type="date"
                    required
                    min={minDateStr}
                    max={maxDateStr}
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setError(''); }}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm animate-in fade-in">
                  <Icon name="gpp_bad" className="text-[20px] shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Doctor & Time */}
            <div className="w-full md:w-1/2 p-6 bg-surface-container-lowest overflow-y-auto custom-scrollbar space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-3">
                  Chọn Khung giờ mới *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => { setTimeSlot(slot); setError(''); }}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        timeSlot === slot
                          ? 'bg-secondary text-on-secondary border-secondary shadow-md scale-105'
                          : 'bg-white text-on-surface border-outline-variant hover:border-secondary/50 hover:bg-secondary/5'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-3">
                  Bác sĩ điều trị mới *
                </label>
                <div className="flex flex-col gap-2.5">
                  {(() => {
                    const activeDentists = dentists.filter(dentist => 
                      doctorShifts.some(s => s.dentistId === dentist.id && s.date === date)
                    );
                    if (activeDentists.length === 0) {
                      return (
                        <p className="text-xs text-on-surface-variant italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-outline-variant">
                          Không có bác sĩ nào trực vào ngày này. Vui lòng chọn ngày khác.
                        </p>
                      );
                    }
                    return activeDentists.map(dentist => (
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
                    ));
                  })()}
                </div>
              </div>

            </div>
          </div>

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
              className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Icon name="save" />
              Xác Nhận Dời Lịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
