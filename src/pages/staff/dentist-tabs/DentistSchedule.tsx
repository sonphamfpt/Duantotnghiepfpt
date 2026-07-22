import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';

const SHIFT_TYPES = {
  Morning: { label: 'Ca sáng', color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100/70', time: '08:00 - 14:00' },
  Afternoon: { label: 'Ca chiều', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70', time: '14:00 - 20:00' },
  Full: { label: 'Cả ngày', color: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70', time: '08:00 - 20:00' }
};

export interface DentistScheduleProps {
  dentistId?: string;
}

export const DentistSchedule: React.FC<DentistScheduleProps> = ({ dentistId: dentistIdProp }) => {
  const { user } = useAuth();
  const dentistId = dentistIdProp || user?.id || '';
  const { doctorShifts, dentists, appointments, swapShifts, transferShift } = useClinic();

  // Swap / Transfer Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [actionType, setActionType] = useState<'swap' | 'transfer'>('swap');
  const [originShiftId, setOriginShiftId] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('');
  const [targetDentistId, setTargetDentistId] = useState('');

  // Form interactive selection state (giống Form đặt lịch)
  const [formDentistId, setFormDentistId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formShiftType, setFormShiftType] = useState<'Morning' | 'Afternoon' | 'Full'>('Morning');

  // Conflict modal
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: 'swap' | 'transfer';
    conflictAppts: typeof appointments;
    newDentistName: string;
    pendingSwapTargetId?: string;
    pendingTransferDentistId?: string;
  } | null>(null);

  // Dùng ngày thực tế, không hardcode
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateStr = tomorrowDate.toISOString().slice(0, 10);

  // Mini calendar — tháng/năm động
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const calendarLabel = new Date(calendarDate.year, calendarDate.month, 1)
    .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    .replace(/^./, s => s.toUpperCase());

  const daysInMonth = new Date(calendarDate.year, calendarDate.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarDate.year, calendarDate.month, 1).getDay();
  const calendarOffset = firstDayOfWeek;

  const prevCalendarMonth = () => setCalendarDate(prev => {
    if (prev.month === 0) return { year: prev.year - 1, month: 11 };
    return { year: prev.year, month: prev.month - 1 };
  });
  const nextCalendarMonth = () => setCalendarDate(prev => {
    if (prev.month === 11) return { year: prev.year + 1, month: 0 };
    return { year: prev.year, month: prev.month + 1 };
  });

  const currentDentist = dentists.find(d => d.id === dentistId);
  const dentistName = currentDentist?.name || 'Bác sĩ';

  // Helper: Kiểm tra ca trực có đủ điều kiện đổi ca (bắt đầu sau ít nhất 12 tiếng)
  const isShiftEligibleForSwap = React.useCallback((shift: { date: string; shiftType: string }) => {
    if (!shift.date) return false;
    const [y, m, d] = shift.date.split('-').map(Number);
    const startHour = shift.shiftType === 'Afternoon' ? 14 : 8;
    const shiftStartMs = new Date(y, m - 1, d, startHour, 0, 0).getTime();
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    return shiftStartMs - Date.now() >= TWELVE_HOURS_MS;
  }, []);

  // Tất cả ngày có ca trong tuyển lịch (cho calendar highlight)
  const myShiftDates = React.useMemo(() =>
    doctorShifts.filter(s => s.dentistId === dentistId).map(s => s.date),
    [doctorShifts, dentistId]
  );

  // Ca sắp tới (từ hôm nay trở đi) — sắp xếp tăng dần
  const myShifts = React.useMemo(() =>
    doctorShifts
      .filter(s => s.dentistId === dentistId && s.date >= todayDateStr)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [doctorShifts, dentistId, todayDateStr]
  );

  // Ca làm việc của tôi ĐỦ ĐIỀU KIỆN đổi/chuyển (>= 12 tiếng)
  const eligibleMyShifts = React.useMemo(() =>
    myShifts.filter(s => isShiftEligibleForSwap(s)),
    [myShifts, isShiftEligibleForSwap]
  );

  // Ca trực của bác sĩ khác ĐỦ ĐIỀU KIỆN hoán đổi (>= 12 tiếng & KHÔNG xung đột trùng ngày trực)
  const swapTargets = React.useMemo(() => {
    if (!originShiftId) return [];
    const originShift = doctorShifts.find(s => s.id === originShiftId);
    if (!originShift) return [];

    return doctorShifts.filter(target => {
      // 1. Phải là bác sĩ khác
      if (target.dentistId === dentistId) return false;
      // 2. Phải đủ 12 tiếng nữa mới bắt đầu
      if (!isShiftEligibleForSwap(target)) return false;

      // 3. Nếu khác ngày: Bác sĩ hiện tại chưa có ca nào vào ngày của ca đích
      if (target.date !== originShift.date) {
        const myShiftOnTargetDate = doctorShifts.some(s => s.dentistId === dentistId && s.date === target.date);
        if (myShiftOnTargetDate) return false;
      }

      // 4. Bác sĩ ca đích chưa có ca nào vào ngày của ca gốc
      if (target.date !== originShift.date) {
        const targetDentistShiftOnOriginDate = doctorShifts.some(s => s.dentistId === target.dentistId && s.date === originShift.date);
        if (targetDentistShiftOnOriginDate) return false;
      }

      return true;
    });
  }, [doctorShifts, dentistId, originShiftId, isShiftEligibleForSwap]);

  // Bác sĩ ĐỦ ĐIỀU KIỆN nhận chuyển ca (chưa có ca trực vào ngày của ca gốc)
  const eligibleTransferDentists = React.useMemo(() => {
    if (!originShiftId) return dentists.filter(d => d.id !== dentistId);
    const originShift = doctorShifts.find(s => s.id === originShiftId);
    if (!originShift) return dentists.filter(d => d.id !== dentistId);

    return dentists.filter(d => {
      if (d.id === dentistId) return false;
      const hasShiftOnDate = doctorShifts.some(s => s.dentistId === d.id && s.date === originShift.date);
      return !hasShiftOnDate;
    });
  }, [dentists, doctorShifts, dentistId, originShiftId]);

  const openSwapForShift = (shiftId: string) => {
    setOriginShiftId(shiftId);
    setActionType('swap');
    setShowSwapModal(true);
  };

  const handleConfirmAction = () => {
    if (!originShiftId) {
      alert('Vui lòng chọn ca làm việc gốc!');
      return;
    }

    const originShift = doctorShifts.find(s => s.id === originShiftId);

    if (actionType === 'swap') {
      if (!targetShiftId) {
        alert('Vui lòng chọn ca làm việc muốn đổi!');
        return;
      }
      if (originShiftId === targetShiftId) {
        alert('Không thể đổi ca làm việc với chính nó!');
        return;
      }

      // Kiểm tra conflict lịch hẹn của ca gốc
      if (originShift) {
        const conflictAppts = appointments.filter(a =>
          a.dentistId === originShift.dentistId &&
          a.status !== 'Cancelled' && a.status !== 'Completed'
        );
        const targetShift = doctorShifts.find(s => s.id === targetShiftId);
        if (conflictAppts.length > 0) {
          setConflictData({
            action: 'swap',
            conflictAppts,
            newDentistName: targetShift?.dentistName || 'Bác sĩ khác',
            pendingSwapTargetId: targetShiftId,
          });
          setShowConflictModal(true);
          return;
        }
      }
      swapShifts(originShiftId, targetShiftId);
      alert('Gửi yêu cầu hoán đổi ca trực thành công! Ca trực đã được cập nhật.');

    } else if (actionType === 'transfer') {
      if (!targetDentistId) {
        alert('Vui lòng chọn bác sĩ nhận ca trực!');
        return;
      }
      if (originShift && originShift.dentistId === targetDentistId) {
        alert('Bác sĩ nhận ca phải khác bác sĩ hiện tại của ca trực!');
        return;
      }

      // Kiểm tra conflict lịch hẹn của ca gốc
      if (originShift) {
        const conflictAppts = appointments.filter(a =>
          a.dentistId === originShift.dentistId &&
          a.status !== 'Cancelled' && a.status !== 'Completed'
        );
        const newDentist = dentists.find(d => d.id === targetDentistId);
        if (conflictAppts.length > 0) {
          setConflictData({
            action: 'transfer',
            conflictAppts,
            newDentistName: newDentist?.name || 'Bác sĩ mới',
            pendingTransferDentistId: targetDentistId,
          });
          setShowConflictModal(true);
          return;
        }
      }
      transferShift(originShiftId, targetDentistId);
      alert('Chuyển giao ca trực thành công! Lịch làm việc đã được cập nhật.');
    }

    // Reset and close
    setShowSwapModal(false);
    setOriginShiftId('');
    setTargetShiftId('');
    setTargetDentistId('');
    setFormDentistId('');
  };

  // ── Confirm Conflict Handler ──
  const handleConfirmConflict = () => {
    if (!originShiftId || !conflictData) return;
    const conflictIds = conflictData.conflictAppts.map(a => a.id);

    if (conflictData.action === 'swap' && conflictData.pendingSwapTargetId) {
      swapShifts(originShiftId, conflictData.pendingSwapTargetId, conflictIds);
    } else if (conflictData.action === 'transfer' && conflictData.pendingTransferDentistId) {
      transferShift(originShiftId, conflictData.pendingTransferDentistId, conflictIds);
    }

    setShowConflictModal(false);
    setConflictData(null);
    setShowSwapModal(false);
    setOriginShiftId('');
    setTargetShiftId('');
    setTargetDentistId('');
    setFormDentistId('');
    alert('Đã đổi ca và gửi thông báo đến lễ tân thành công! Lễ tân sẽ liên hệ bệnh nhân.');
  };

  return (
    <div className="p-container-padding-desktop grid grid-cols-12 gap-6 animate-in fade-in duration-200">
      
      {/* CỘT TRÁI (Sidebar) */}
      <div className="col-span-12 lg:col-span-3 space-y-6">
        
        {/* Mini Calendar View — Tháng/Năm động */}
        <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">{calendarLabel}</h4>
            <div className="flex gap-1.5">
              <button type="button" onClick={prevCalendarMonth}>
                <Icon name="chevron_left" className="text-sm text-slate-500 cursor-pointer hover:text-primary transition-colors" />
              </button>
              <button type="button" onClick={nextCalendarMonth}>
                <Icon name="chevron_right" className="text-sm text-slate-500 cursor-pointer hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
          
          {/* Mini Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-y-2 text-center text-[10px] font-bold">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
              <span key={day} className="text-slate-400 font-extrabold">{day}</span>
            ))}
            {/* Ô trống đầu tháng theo ngày thực tế */}
            {Array.from({ length: calendarOffset }, (_, i) => (
              <span key={`blank-${i}`} className="py-1" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const m = (calendarDate.month + 1).toString().padStart(2, '0');
              const dateStr = `${calendarDate.year}-${m}-${day.toString().padStart(2, '0')}`;
              const isToday = dateStr === todayDateStr;
              const hasShift = myShiftDates.includes(dateStr);
              return (
                <div key={day} className="flex flex-col items-center justify-center relative py-1">
                  <span 
                    className={`rounded-full flex items-center justify-center mx-auto w-6 h-6 text-xs transition-all ${
                      isToday 
                        ? 'bg-primary text-white font-black shadow-sm' 
                        : hasShift
                        ? 'bg-primary/10 text-primary border border-primary/20 font-bold'
                        : 'text-slate-800 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    {day}
                  </span>
                  {hasShift && !isToday && (
                    <span className="absolute bottom-0.5 w-1 h-1 bg-primary rounded-full"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2 font-sans">
          <h5 className="font-bold flex items-center gap-1">
            <Icon name="warning" className="text-amber-600 text-[16px]" />
            Quy chế đổi ca trực
          </h5>
          <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed text-[10px] text-amber-800">
            <li>Yêu cầu đổi ca làm việc cần gửi trước thời điểm bắt đầu ít nhất <strong>12 tiếng</strong>.</li>
            <li>Cần có sự đồng ý trực thay của bác sĩ nhận ca.</li>
            <li>Bác sĩ không được có 2 ca trực trong cùng một ngày.</li>
          </ul>
        </div>

      </div>

      {/* KHU VỰC CHÍNH */}
      <div className="col-span-12 lg:col-span-9 space-y-4">
        
        {/* Header Card: Lịch làm việc cá nhân */}
        <div className="bg-white rounded-2xl border border-outline-variant p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name="calendar_today" className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Lịch làm việc của tôi</h3>
              <p className="text-xs text-slate-500">
                Xin chào {dentistName}, chúc bạn một ngày làm việc hiệu quả!
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (eligibleMyShifts.length > 0) {
                setOriginShiftId(eligibleMyShifts[0].id);
              }
              setActionType('swap');
              setShowSwapModal(true);
            }}
            className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all"
          >
            <Icon name="swap_horiz" className="text-[16px]" />
            Đăng ký đổi ca trực
          </button>
        </div>

        {/* Personalized Schedule Main Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-in fade-in duration-300">
          {/* Left inside: Today shift and stats */}
          <div className="md:col-span-4 space-y-4">
            
            {/* Today shift card */}
            {(() => {
              const todayShift = doctorShifts.find(s => s.dentistId === dentistId && s.date === todayDateStr);
              const conf = todayShift ? SHIFT_TYPES[todayShift.shiftType as keyof typeof SHIFT_TYPES] : null;
              return (
                <div className={`rounded-2xl p-5 text-white shadow-md border ${
                  todayShift 
                    ? 'bg-gradient-to-br from-primary to-[#003a73] border-primary/20' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-85 mb-1">Lịch trực hôm nay</p>
                  <p className="text-xs font-medium opacity-75">{new Date(todayDateStr).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  
                  {todayShift ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl border border-white/25 w-fit">
                        <Icon name="schedule" className="text-sm" />
                        <span className="text-xs font-bold">{conf?.label} ({conf?.time})</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl border border-white/25 w-fit">
                        <Icon name="meeting_room" className="text-sm" />
                        <span className="text-xs font-bold">{todayShift.room}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center py-2 space-y-2">
                      <Icon name="bedtime" className="text-3xl opacity-60 animate-pulse" />
                      <p className="text-xs font-bold opacity-90">Hôm nay bạn không có ca trực</p>
                      <p className="text-[10px] opacity-75">Hãy nghỉ ngơi chuẩn bị cho ca tiếp theo nhé!</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Shift Stats Card */}
            <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-3 font-sans">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Thống kê ca trực</h4>
              {(() => {
                const myTotalShifts = doctorShifts.filter(s => s.dentistId === dentistId).length;
                const myMorningShifts = doctorShifts.filter(s => s.dentistId === dentistId && (s.shiftType === 'Morning' || s.shiftType === 'Full')).length;
                const myAfternoonShifts = doctorShifts.filter(s => s.dentistId === dentistId && (s.shiftType === 'Afternoon' || s.shiftType === 'Full')).length;
                return (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-outline-variant/60">
                      <p className="text-lg font-black text-primary">{myTotalShifts}</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Tổng ca</p>
                    </div>
                    <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100">
                      <p className="text-lg font-black text-sky-700">{myMorningShifts}</p>
                      <p className="text-[9px] font-bold text-sky-600 mt-0.5">Ca Sáng</p>
                    </div>
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                      <p className="text-lg font-black text-emerald-700">{myAfternoonShifts}</p>
                      <p className="text-[9px] font-bold text-emerald-600 mt-0.5">Ca Chiều</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right inside: Agenda List (Concise view) */}
          <div className="md:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-4 font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-800">Ca trực sắp tới</h4>
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  {myShifts.length} ca sắp tới
                </span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {myShifts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-xs">
                    <Icon name="event_available" className="text-3xl opacity-30 mb-2 block" />
                    Không có ca trực nào sắp tới.
                  </div>
                ) : (
                  myShifts.map(shift => {
                    const conf = SHIFT_TYPES[shift.shiftType as keyof typeof SHIFT_TYPES];
                    const isShiftToday = shift.date === todayDateStr;
                    const isShiftTomorrow = shift.date === tomorrowDateStr;
                    const dateObj = new Date(shift.date + 'T00:00:00');
                    const dayOfWeekStr = dateObj.getDay() === 0 ? 'Chủ Nhật' : `Thứ ${dateObj.getDay() + 1}`;
                    const formattedDate = `${dayOfWeekStr}, ${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                    const eligible = isShiftEligibleForSwap(shift);

                    return (
                      <div 
                        key={shift.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isShiftToday 
                            ? 'bg-blue-50/20 border-primary shadow-sm' 
                            : isShiftTomorrow
                            ? 'bg-amber-50 border-amber-300 shadow-sm'
                            : 'bg-white border-outline-variant/65 hover:border-slate-300'
                        }`}
                      >
                        {/* Left: Date details */}
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-black shrink-0 ${
                            isShiftToday ? 'bg-primary text-white shadow-sm' 
                            : isShiftTomorrow ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className="uppercase text-[8px] opacity-80">{dayOfWeekStr.replace('Thứ ', 'T')}</span>
                            <span className="text-xs font-black">{dateObj.getDate()}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-xs font-bold ${
                                isShiftToday ? 'text-primary' 
                                : isShiftTomorrow ? 'text-amber-700'
                                : 'text-slate-800'
                              }`}>
                                {formattedDate}
                              </p>
                              {isShiftToday && (
                                <span className="text-[9px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">Hôm nay</span>
                              )}
                              {isShiftTomorrow && (
                                <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">⚠️ Ngày mai</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Icon name="meeting_room" className="text-slate-400 text-xs" />
                              <span className="text-[10px] text-slate-500 font-bold">{shift.room}</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Shift type details */}
                        <div className="flex items-center">
                          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${conf.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {conf.label} ({conf.time})
                          </span>
                        </div>

                        {/* Right: Quick actions */}
                        <div className="flex gap-2 justify-end">
                          <button
                            disabled={!eligible}
                            onClick={() => openSwapForShift(shift.id)}
                            title={!eligible ? 'Ca trực quá hạn hoặc bắt đầu trong dưới 12 tiếng, không thể đổi/chuyển ca' : ''}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                              eligible
                                ? 'border border-primary/20 hover:border-primary text-primary hover:bg-primary/5 cursor-pointer active:scale-95'
                                : 'border border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <Icon name="swap_horiz" className="text-[14px]" />
                            {eligible ? 'Đăng ký đổi ca' : 'Quá hạn đổi ca'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SWAP / TRANSFER WORK SHIFTS MODAL */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="swap_horiz" />
                Đăng Ký Đổi Ca Làm Việc Bác Sĩ
              </h3>
              <button 
                onClick={() => setShowSwapModal(false)} 
                className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
              {/* Swap or Transfer Selector Tab */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-outline-variant/40 gap-1.5 select-none">
                <button
                  type="button"
                  onClick={() => { setActionType('swap'); setTargetShiftId(''); setTargetDentistId(''); setFormDentistId(''); }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    actionType === 'swap' 
                      ? 'bg-white text-primary shadow-sm border border-primary/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon name="swap_horiz" className="text-base" />
                  Hoán đổi ca trực (Đổi chéo)
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('transfer'); setTargetShiftId(''); setTargetDentistId(''); setFormDentistId(''); }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    actionType === 'transfer' 
                      ? 'bg-white text-primary shadow-sm border border-primary/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon name="person_add" className="text-base" />
                  Nhờ trực thay (Chuyển ca)
                </button>
              </div>

              {/* FORM SECTION 1: Ca gốc của tôi */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="assignment" className="text-primary text-base" />
                    1. Chọn ca trực của bạn muốn thay đổi *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Icon name="check_circle" className="text-[12px]" /> Real-time Validated
                  </span>
                </div>

                <select
                  value={originShiftId}
                  onChange={e => { setOriginShiftId(e.target.value); setTargetShiftId(''); setTargetDentistId(''); }}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer shadow-sm"
                >
                  <option value="">-- Chọn ca trực của bạn (Đủ điều kiện &ge; 12 tiếng) --</option>
                  {eligibleMyShifts.map(s => {
                    const typeLabel = SHIFT_TYPES[s.shiftType as keyof typeof SHIFT_TYPES]?.label;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.dentistName} ({s.room}) — Ngày {s.date} ({typeLabel})
                      </option>
                    );
                  })}
                </select>

                {/* Card hiển thị chi tiết Ca Gốc đã chọn */}
                {(() => {
                  const selShift = doctorShifts.find(s => s.id === originShiftId);
                  if (!selShift) return null;
                  const conf = SHIFT_TYPES[selShift.shiftType as keyof typeof SHIFT_TYPES];
                  return (
                    <div className="bg-white rounded-xl border border-primary/20 p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          <Icon name="event" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Ngày {selShift.date} · {conf?.label} ({conf?.time})
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Phòng làm việc: <strong>{selShift.room}</strong>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg shrink-0">
                        Ca trực gốc
                      </span>
                    </div>
                  );
                })()}

                {eligibleMyShifts.length === 0 && (
                  <p className="text-[11px] text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                    <Icon name="warning" className="text-amber-600 text-sm" />
                    Bạn không có ca trực nào sắp tới đủ điều kiện đổi ca (yêu cầu gửi trước ít nhất 12 tiếng).
                  </p>
                )}
              </div>

              {/* FORM SECTION 2: Form chọn Bác sĩ & Bảng Lịch Trực Real-time của Bác sĩ được chọn */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="badge" className="text-primary text-base" />
                    2. Chọn bác sĩ đối ứng &amp; Xem lịch trực Real-time *
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {actionType === 'swap' ? 'Chế độ Hoán Đổi' : 'Chế độ Trực Thay'}
                  </span>
                </div>

                {/* Sub-step A: Danh sách Thẻ Bác sĩ */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    A. Chọn bác sĩ đối ứng *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(actionType === 'swap' 
                      ? dentists.filter(d => d.id !== dentistId)
                      : eligibleTransferDentists
                    ).map(d => {
                      const isSelected = formDentistId === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            setFormDentistId(d.id);
                            if (actionType === 'transfer') setTargetDentistId(d.id);
                            setTargetShiftId('');
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                            isSelected
                              ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/30'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-primary font-bold">
                              <Icon name="check_circle" className="text-sm" />
                            </div>
                          )}
                          <p className="font-extrabold text-xs text-slate-800 pr-4">{d.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">{d.role.split('&')[0]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-step B: BẢNG LỊCH TRỰC CHÍNH THỨC CỦA BÁC SĨ ĐƯỢC CHỌN (Real-time Schedule Board) */}
                {formDentistId && (() => {
                  const selectedDoctorObj = dentists.find(d => d.id === formDentistId);
                  const doctorUpcomingShifts = doctorShifts
                    .filter(s => s.dentistId === formDentistId && s.date >= todayDateStr)
                    .sort((a, b) => a.date.localeCompare(b.date));

                  return (
                    <div className="space-y-3 pt-3 border-t border-slate-200/80 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Icon name="calendar_view_week" className="text-primary text-base" />
                          {actionType === 'swap' 
                            ? `Lịch làm việc của Bác sĩ ${selectedDoctorObj?.name || ''} (Bấm chọn ca để hoán đổi)` 
                            : `Lịch làm việc sắp tới của Bác sĩ ${selectedDoctorObj?.name || ''}`}
                        </label>
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                          {doctorUpcomingShifts.length} ca trực
                        </span>
                      </div>

                      {doctorUpcomingShifts.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 italic text-center">
                          Bác sĩ này hiện chưa có ca trực nào sắp tới trong hệ thống.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          {doctorUpcomingShifts.map(s => {
                            const conf = SHIFT_TYPES[s.shiftType as keyof typeof SHIFT_TYPES];
                            const isSelected = targetShiftId === s.id;
                            const isEligible = isShiftEligibleForSwap(s);
                            const isValidSwapTarget = swapTargets.some(t => t.id === s.id);

                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  if (actionType === 'swap' && isValidSwapTarget) {
                                    setTargetShiftId(s.id);
                                    setFormDate(s.date);
                                    setFormShiftType(s.shiftType as any);
                                  }
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/30 cursor-pointer'
                                    : actionType === 'swap' && isValidSwapTarget
                                    ? 'bg-white border-slate-200 hover:border-primary cursor-pointer hover:shadow-sm'
                                    : 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {s.date.split('-')[2]}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">
                                      Ngày {s.date} · {conf?.label} ({conf?.time})
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                      Phòng: <strong>{s.room}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  {isSelected ? (
                                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1">
                                      <Icon name="check" className="text-xs" /> Đã chọn đổi
                                    </span>
                                  ) : actionType === 'swap' && isValidSwapTarget ? (
                                    <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                                      Bấm chọn ca này
                                    </span>
                                  ) : actionType === 'swap' ? (
                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">
                                      {!isEligible ? '< 12h' : 'Trùng ngày trực'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                                      Lịch đã xếp
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* LIVE SUMMARY / EXCHANGE PREVIEW FLOW */}
              {originShiftId && (targetShiftId || targetDentistId) && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2.5 animate-in fade-in zoom-in-95">
                  <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="preview" className="text-sm" />
                    Xác nhận luồng đổi lịch Real-time
                  </h4>

                  {(() => {
                    const orig = doctorShifts.find(s => s.id === originShiftId);
                    const origConf = orig ? SHIFT_TYPES[orig.shiftType as keyof typeof SHIFT_TYPES] : null;

                    if (actionType === 'swap') {
                      const targ = doctorShifts.find(s => s.id === targetShiftId);
                      const targConf = targ ? SHIFT_TYPES[targ.shiftType as keyof typeof SHIFT_TYPES] : null;
                      if (!orig || !targ) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ca gốc của bạn chuyển sang:</p>
                            <p className="font-bold text-slate-800 mt-1">{targ.dentistName}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Ngày {orig.date} ({origConf?.label})</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Bạn sẽ nhận ca mới từ:</p>
                            <p className="font-bold text-slate-800 mt-1">{targ.dentistName}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Ngày {targ.date} ({targConf?.label})</p>
                          </div>
                        </div>
                      );
                    } else {
                      const targDentist = dentists.find(d => d.id === targetDentistId);
                      if (!orig || !targDentist) return null;

                      return (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Ca trực được chuyển giao hoàn toàn cho:</p>
                          <p className="font-bold text-primary mt-1 text-sm">{targDentist.name}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Ngày {orig.date} · {origConf?.label} ({origConf?.time}) · {orig.room}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowSwapModal(false)}
                className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow active:scale-95 transition-all"
              >
                <Icon name="check_circle" className="text-[16px]" />
                Xác nhận đổi ca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflict Confirm Modal ── */}
      {showConflictModal && conflictData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => { setShowConflictModal(false); setConflictData(null); }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-amber-500 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="warning" />
                Lưu ý: Ca trực này có lịch hẹn bệnh nhân!
              </h3>
              <button onClick={() => { setShowConflictModal(false); setConflictData(null); }} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Shift change summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="text-amber-800 font-bold mb-1 flex items-center gap-1.5">
                  <Icon name="swap_horiz" className="text-[16px]" />
                  {conflictData.action === 'transfer' ? 'Bạn đang nhờ trực thay' : 'Bạn đang hoán đổi ca trực'}
                </p>
                <p className="text-amber-700 text-xs">
                  Bác sĩ thay thế: <strong>{conflictData.newDentistName}</strong>
                </p>
              </div>

              {/* Affected appointments list */}
              <div>
                <p className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon name="event_busy" className="text-amber-500 text-sm" />
                  {conflictData.conflictAppts.length} lịch hẹn của bạn bị ảnh hưởng
                </p>
                <div className="space-y-2">
                  {conflictData.conflictAppts.map(appt => (
                    <div key={appt.id} className="flex items-center gap-3 bg-slate-50 border border-outline-variant rounded-xl p-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Icon name="person" className="text-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-on-surface">{appt.patientName}</p>
                        <p className="text-xs text-on-surface-variant">{appt.time} · {appt.serviceName}</p>
                        <p className="text-xs text-primary font-semibold">{appt.patientPhone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
                <Icon name="info" className="text-[16px] text-blue-500 shrink-0 mt-0.5" />
                <p>
                  Sau khi xác nhận, <strong>lễ tân sẽ nhận thông báo</strong> và gọi điện trực tiếp đến từng bệnh nhân để thông báo thay đổi bác sĩ và xác nhận lịch hẹn.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-end gap-2 shrink-0">
              <button
                onClick={() => { setShowConflictModal(false); setConflictData(null); }}
                className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Hủy thao tác
              </button>
              <button
                onClick={handleConfirmConflict}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
              >
                <Icon name="notifications_active" className="text-[16px]" />
                Xác nhận &amp; Thông báo lễ tân
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
