import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Icon } from './Icon';

type CheckInMode = 'existing' | 'new' | 'qr';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  title = 'Đón tiếp & Check-in',
}) => {
  const { queue, patients, dentists, services, checkInPatient, addPatient, appointments } = useClinic();

  const [mode, setMode] = useState<CheckInMode>('existing');
  const [isScanning, setIsScanning] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAge, setNewAge] = useState('1990');
  const [newGender, setNewGender] = useState('Nam');
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  const duplicatePatient = patients.find(p => p.phone === newPhone.trim());
  const selectedPatient = existingPatientId ? patients.find(p => p.id === existingPatientId) : null;
  const cancelCount = selectedPatient 
    ? appointments.filter(a => a.patientId === selectedPatient.id && a.status === 'Cancelled').length 
    : 0;
  const isLocked = cancelCount >= 3 && !selectedPatient?.isUnlocked;

  if (!isOpen) return null;

  const resetAndClose = () => {
    setMode('existing');
    setIsScanning(false);
    setExistingPatientId('');
    setSelectedDentistId('');
    setNewName('');
    setNewPhone('');
    setNewAge('1990');
    setNewGender('Nam');
    setIsSuccess(false);
    setSelectedServiceId('');
    setSearchQuery('');
    setIsDropdownOpen(false);
    onClose();
  };

  const handleScanFake = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const patient = patients.find((p) => !queue.some((q) => q.patientId === p.id && q.status !== 'Completed')) || patients[0];
      const dentist = dentists[0];
      if (patient && dentist) {
        setExistingPatientId(patient.id);
        setSelectedDentistId(dentist.id);
        setMode('existing');
        alert(`Đã quét QR thành công!\nBệnh nhân: ${patient.name}\nBác sĩ: ${dentist.name}`);
      }
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let patientId = existingPatientId;

    if (mode === 'new') {
      if (!newName.trim() || !newPhone.trim()) {
        alert('Vui lòng điền đầy đủ thông tin bệnh nhân mới!');
        return;
      }

      if (duplicatePatient) {
        alert('Số điện thoại này đã tồn tại trong hệ thống. Vui lòng check-in như bệnh nhân cũ.');
        return;
      }

      const ageNum = Number.parseInt(newAge, 10) || 0;
      const finalAge = ageNum > 1000 ? new Date().getFullYear() - ageNum : ageNum;

      const addedPatient = addPatient({
        name: newName.trim(),
        phone: newPhone.trim(),
        age: finalAge,
        gender: newGender,
        criticalAllergy: 'Không',
        condition: 'Mới khám đầu',
      });
      patientId = addedPatient.id;
    }

    if (!patientId || !selectedDentistId) {
      alert('Vui lòng chọn bệnh nhân và bác sĩ khám!');
      return;
    }

    if (isLocked) {
      alert('Tài khoản số điện thoại này đã bị khóa do hủy lịch/không đến quá 3 lần!');
      return;
    }

    const alreadyWaiting = queue.some((item) => item.patientId === patientId && item.status !== 'Completed');
    if (alreadyWaiting) {
      alert('Bệnh nhân này đã có trong hàng chờ. Vui lòng kiểm tra lại danh sách.');
      return;
    }

    checkInPatient(patientId, selectedDentistId, undefined, selectedServiceId ? services.find(s => s.id === selectedServiceId)?.name : undefined);
    setIsSuccess(true);
    setTimeout(resetAndClose, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {isSuccess ? (
          <div className="p-16 text-center space-y-4 my-auto">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <Icon name="check_circle" className="text-4xl text-on-secondary" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Check-in thành công!</h3>
            <p className="text-on-surface-variant">Bệnh nhân đã được đưa vào hàng chờ</p>
          </div>
        ) : (
          <>
            <div className="bg-primary px-6 py-4 text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
                <Icon name="how_to_reg" />
                {title}
              </h3>
              <button onClick={resetAndClose} className="hover:bg-white/20 p-1 rounded-full cursor-pointer" type="button">
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                
                {/* LEFT COLUMN: Info */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar border-r border-outline-variant space-y-5">
                  <div className="flex border border-outline-variant rounded-xl overflow-hidden shrink-0">
                    {[
                      { key: 'qr' as const, label: 'Quét QR' },
                      { key: 'existing' as const, label: 'Bệnh nhân cũ' },
                      { key: 'new' as const, label: 'Đăng ký mới' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setMode(option.key)}
                        className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                          mode === option.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {mode === 'qr' && (
                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl">
                      <div className="relative">
                        <Icon name="qr_code_scanner" className="text-[64px] text-primary" />
                        {isScanning && (
                          <div className="absolute top-0 left-0 w-full h-full border-t-2 border-secondary animate-bounce pointer-events-none" />
                        )}
                      </div>
                      <p className="font-bold text-primary mt-4 mb-2">{isScanning ? 'Đang quét...' : 'Sẵn sàng quét mã QR'}</p>
                      <p className="text-xs text-on-surface-variant text-center max-w-xs mb-4">
                        Hướng camera vào mã QR của lịch hẹn trên điện thoại của bệnh nhân.
                      </p>
                      <button
                        type="button"
                        onClick={handleScanFake}
                        disabled={isScanning}
                        className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold cursor-pointer hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 flex items-center gap-2"
                      >
                        <Icon name="camera_alt" className="text-[18px]" />
                        Giả lập quét QR
                      </button>
                    </div>
                  )}

                  {mode === 'existing' && (
                    <div className="relative">
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Tìm kiếm bệnh nhân *</label>
                      <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]" />
                        <input
                          type="text"
                          placeholder="Nhập tên hoặc số điện thoại..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsDropdownOpen(true);
                            setExistingPatientId('');
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      
                      {existingPatientId && (
                        <div className={`mt-3 p-3 rounded-xl flex flex-col gap-2 text-sm border animate-in fade-in slide-in-from-top-1 ${
                          isLocked 
                            ? 'bg-error-container text-on-error-container border-error/20' 
                            : 'bg-primary-container text-on-primary-container border-primary/20'
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold">{selectedPatient?.name}</p>
                              <p className="text-xs opacity-80 mt-0.5">{selectedPatient?.phone} • Số lần hủy: {cancelCount} lần</p>
                            </div>
                            <button type="button" onClick={() => { setExistingPatientId(''); setSearchQuery(''); }} className="hover:bg-black/10 p-1.5 rounded-full transition-colors">
                              <Icon name="close" className="text-[18px]" />
                            </button>
                          </div>
                          {isLocked && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-error border-t border-error/10 pt-2">
                              <Icon name="block" className="text-[16px]" />
                              <span>SĐT NÀY ĐÃ BỊ KHÓA: Hủy lịch/Không đến quá {cancelCount}/3 lần!</span>
                            </div>
                          )}
                        </div>
                      )}

                      {isDropdownOpen && searchQuery && !existingPatientId && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-outline-variant rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {filteredPatients.length > 0 ? (
                            filteredPatients.map(patient => (
                              <div
                                key={patient.id}
                                onClick={() => {
                                  setExistingPatientId(patient.id);
                                  setSearchQuery(patient.name);
                                  setIsDropdownOpen(false);
                                }}
                                className="p-3.5 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant last:border-0 transition-colors"
                              >
                                <p className="font-bold text-sm text-on-surface">{patient.name}</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">{patient.phone} • Thẻ: {patient.tier}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-5 text-center text-sm text-on-surface-variant">Không tìm thấy bệnh nhân</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'new' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Họ và tên *</label>
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Số điện thoại *</label>
                          <input
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="09XXXXXXXX"
                            className={`w-full bg-surface-container-low border ${duplicatePatient ? 'border-error text-error' : 'border-outline-variant'} rounded-xl px-3 py-3 text-sm outline-none transition-all`}
                          />
                          {duplicatePatient && (
                            <div className="mt-2 flex items-center justify-between bg-error-container text-on-error-container p-2.5 rounded-xl text-xs animate-in fade-in slide-in-from-top-1">
                              <span className="truncate pr-2 font-medium">SĐT đã tồn tại ({duplicatePatient.name})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMode('existing');
                                  setSearchQuery(duplicatePatient.phone);
                                  setExistingPatientId(duplicatePatient.id);
                                  setNewPhone('');
                                }}
                                className="font-bold underline cursor-pointer shrink-0"
                              >
                                Chọn cũ
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Năm sinh</label>
                          <input
                            type="number"
                            value={newAge}
                            onChange={(e) => setNewAge(e.target.value)}
                            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-3 text-sm outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Giới tính</label>
                        <div className="flex gap-2">
                          {['Nam', 'Nữ', 'Khác'].map((gender) => (
                            <button
                              key={gender}
                              type="button"
                              onClick={() => setNewGender(gender)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                newGender === gender ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                              }`}
                            >
                              {gender}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode !== 'qr' && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1.5">Dịch vụ cần khám</label>
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Chưa rõ / Tư vấn tổng quát --</option>
                        {services.filter(s => s.isActive).map((s) => (
                          <option key={s.id} value={s.id}>{s.name} — {s.price.toLocaleString('vi-VN')}₫</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Doctors */}
                <div className="w-full md:w-1/2 p-6 bg-surface-container-lowest overflow-y-auto custom-scrollbar">
                  {mode !== 'qr' ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-xs font-bold uppercase text-on-surface-variant">Bác sĩ khám chỉ định *</label>
                        <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container-high px-2 py-0.5 rounded-full">{dentists.length} bác sĩ</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {dentists.map((dentist) => {
                          const inChairQueue = queue.filter((item) => item.dentistId === dentist.id && item.status === 'In Chair');
                          const inChair = inChairQueue.length > 0;
                          const waitingQueue = queue.filter((item) => item.dentistId === dentist.id && item.status === 'Waiting')
                            .sort((a, b) => (b.waitTimeMin || 0) - (a.waitTimeMin || 0));
                          const waitingCount = waitingQueue.length;
                          
                          // Chỉ lấy các lịch hẹn của ngày hôm nay (loại bỏ các lịch hẹn chứa "Ngày mai" hoặc định dạng ngày dd/mm/yyyy)
                          const upcomingAppts = appointments.filter(a => 
                            a.dentistId === dentist.id && 
                            a.status === 'Confirmed' && 
                            !a.time.includes('Ngày mai') && 
                            !a.time.includes('/')
                          );
                          const upcomingCount = upcomingAppts.length;

                          const isSelected = selectedDentistId === dentist.id;
                          const isRecommended = !inChair && waitingCount === 0;

                          return (
                            <div
                              key={dentist.id}
                              className={`rounded-xl border-2 transition-all overflow-hidden bg-white ${
                                isSelected
                                  ? 'border-primary shadow-md'
                                  : 'border-outline-variant hover:border-primary/40'
                              }`}
                            >
                              <div
                                onClick={() => setSelectedDentistId(dentist.id)}
                                className={`p-4 cursor-pointer relative flex items-center gap-4 ${isSelected ? 'bg-primary-container/10' : ''}`}
                              >
                                {/* Left Edge Indicator for Selection */}
                                {isSelected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                                )}

                                <div className="flex-1 min-w-0 pl-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-base font-bold text-on-surface">{dentist.name}</p>
                                    {isRecommended && (
                                      <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Ưu tiên
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-on-surface-variant flex items-center gap-1">
                                    <Icon name="meeting_room" className="text-[16px]" />
                                    {dentist.room}
                                  </p>
                                </div>
                                
                                <div className="shrink-0 text-right">
                                  <div className={`text-xs font-bold py-1.5 px-3 rounded-lg inline-flex items-center gap-1.5 ${
                                    inChair 
                                      ? 'bg-error-container/50 text-error' 
                                      : waitingCount > 0 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : 'bg-secondary-container/50 text-secondary'
                                  }`}>
                                    <Icon name="circle" className={`text-[10px] ${inChair ? 'animate-pulse' : ''}`} />
                                    <span>
                                      {inChair ? `Đang khám (${waitingCount} chờ)` : waitingCount > 0 ? `${waitingCount} chờ` : 'Trống lịch'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Expanded Dashboard */}
                              {isSelected && (
                                <div className="bg-surface-container-lowest border-t border-primary/20 p-4 animate-in fade-in slide-in-from-top-2">
                                  <h5 className="text-[11px] font-bold uppercase text-primary mb-3 flex items-center gap-1.5">
                                    <Icon name="view_kanban" className="text-[14px]" />
                                    Luồng khách hôm nay
                                  </h5>
                                  
                                  <div className="space-y-3">
                                    {/* In Chair */}
                                    {inChairQueue.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant mb-1 flex items-center gap-1">
                                          <Icon name="medical_services" className="text-[12px] text-primary" /> Đang khám trên ghế
                                        </p>
                                        <div className="space-y-1.5">
                                          {inChairQueue.map(q => (
                                            <div key={q.id} className="bg-primary-container text-on-primary-container px-3 py-2 rounded-lg text-xs font-bold border border-primary/20 flex justify-between">
                                              <span>{q.patientName}</span>
                                              <span className="animate-pulse">⏱ {q.elapsedTimeMin || 0}p</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Waiting */}
                                    {waitingQueue.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant mb-1 flex items-center gap-1 mt-3">
                                          <Icon name="hourglass_top" className="text-[12px] text-amber-600" /> Đang chờ ở sảnh ({waitingCount})
                                        </p>
                                        <div className="space-y-1.5">
                                          {waitingQueue.map(q => (
                                            <div key={q.id} className="bg-amber-50 text-amber-900 px-3 py-2 rounded-lg text-xs font-bold border border-amber-200 flex justify-between items-center">
                                              <div className="flex flex-col">
                                                <span>{q.patientName}</span>
                                                {q.serviceName && <span className="text-[10px] font-medium opacity-80 mt-0.5">{q.serviceName}</span>}
                                              </div>
                                              <span>⏳ {q.waitTimeMin}p</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Upcoming (Not Checked In) */}
                                    {upcomingAppts.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant mb-1 flex items-center gap-1 mt-3">
                                          <Icon name="event_upcoming" className="text-[12px]" /> Chưa Check-in ({upcomingCount})
                                        </p>
                                        <div className="space-y-1.5">
                                          {upcomingAppts.map(a => (
                                            <div key={a.id} className="bg-surface-container-low text-on-surface-variant px-3 py-2 rounded-lg text-xs font-bold border border-outline-variant flex justify-between items-center">
                                              <div className="flex flex-col">
                                                <span>{a.patientName}</span>
                                                <span className="text-[10px] font-medium mt-0.5 text-primary">{a.serviceName}</span>
                                              </div>
                                              <span className="text-secondary">{a.time}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Empty State */}
                                    {inChairQueue.length === 0 && waitingQueue.length === 0 && upcomingAppts.length === 0 && (
                                      <div className="text-center py-5 text-xs font-medium text-on-surface-variant border border-dashed border-outline-variant rounded-xl bg-white mt-2">
                                        Bác sĩ đang hoàn toàn trống lịch.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/50">
                      <Icon name="groups" className="text-7xl mb-3" />
                      <p className="text-sm font-medium">Bác sĩ sẽ hiển thị sau khi chọn bệnh nhân</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer for Actions */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low shrink-0 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={resetAndClose} className="px-6 py-2.5 border border-outline-variant text-on-surface rounded-xl font-bold cursor-pointer hover:bg-surface-container-high transition-colors">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isLocked}
                  className={`px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                    isLocked 
                      ? 'bg-outline/25 text-on-surface-variant/45 cursor-not-allowed border border-outline/10' 
                      : 'bg-primary text-on-primary hover:opacity-90 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Icon name="how_to_reg" />
                  Xác nhận Check-in
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
