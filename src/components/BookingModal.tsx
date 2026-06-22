import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Icon } from './Icon';

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
  const { services, dentists, patients, addAppointment } = useClinic();
  
  const [patientName, setPatientName] = useState(defaultPatientName);
  const [patientPhone, setPatientPhone] = useState(defaultPatientPhone);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  
  const initialDentistId = dentists.find(d => d.name === defaultDentistName)?.id || '';
  const [selectedDentistId, setSelectedDentistId] = useState(initialDentistId);
  
  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('');

  // Auto-fill patient name if phone exists
  const existingPatient = patients.find(p => p.phone === patientPhone.trim());
  useEffect(() => {
    if (existingPatient && !defaultPatientName && patientName === '') {
      setPatientName(existingPatient.name);
    }
  }, [existingPatient, defaultPatientName, patientName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone || !selectedServiceId || !selectedDentistId || !timeSlot || !date) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    const service = services.find(s => s.id === selectedServiceId);
    const dentist = dentists.find(d => d.id === selectedDentistId);

    if (!service || !dentist) return;

    addAppointment({
      patientId: existingPatient ? existingPatient.id : `P-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName,
      patientPhone,
      serviceName: service.name,
      dentistId: dentist.id,
      dentistName: dentist.name,
      time: `${date} @ ${timeSlot}`
    });

    alert('Đăng ký lịch hẹn thành công!');
    
    // Reset form
    setPatientName('');
    setPatientPhone('');
    setSelectedServiceId('');
    setSelectedDentistId('');
    setTimeSlot('');
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
            <Icon name="calendar_add_on" />
            Tạo Lịch Hẹn Khám
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors" type="button">
            <Icon name="close" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            
            {/* LEFT COLUMN: Patient Info & Service */}
            <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar border-r border-outline-variant space-y-5 bg-white">
              
              <div className="space-y-4">
                <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                  <Icon name="person" className="text-primary" /> Thông tin bệnh nhân
                </h4>
                
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
                      onChange={(e) => setPatientPhone(e.target.value)}
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
                        {s.name} — {s.price.toLocaleString('vi-VN')}₫
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">
                    Ngày khám *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Doctor & Time */}
            <div className="w-full md:w-1/2 p-6 bg-surface-container-lowest overflow-y-auto custom-scrollbar space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-3">
                  Chọn Khung giờ *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
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
              <Icon name="event_available" />
              Đăng Ký Hẹn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

