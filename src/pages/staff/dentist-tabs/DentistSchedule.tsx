import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';

// ─── Constants & Helpers ───────────────────────────────────────────────────────

const SHIFT_CONFIG = {
  Morning: { label: 'Ca sáng', time: '08:00 – 14:00', color: 'bg-sky-50 border-sky-200 text-sky-800', dot: 'bg-sky-400', dotRing: 'ring-sky-200' },
  Afternoon: { label: 'Ca chiều', time: '14:00 – 20:00', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-400', dotRing: 'ring-emerald-200' },
  Full: { label: 'Cả ngày', time: '08:00 – 20:00', color: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-400', dotRing: 'ring-amber-200' },
};

const DENTIST_ACCENT: Record<string, string> = {
  'D-01': 'border-l-blue-500',
  'D-02': 'border-l-emerald-500',
  'D-03': 'border-l-purple-500',
  'D-04': 'border-l-pink-500',
  'D-05': 'border-l-amber-500',
  'D-06': 'border-l-teal-500',
  'D-07': 'border-l-indigo-500',
};

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const fmt = (d: Date): string => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const TODAY = fmt(new Date());

// Helper: Kiểm tra ca trực có đủ điều kiện hoán đổi / nhờ trực thay (bắt đầu sau ít nhất 12 tiếng)
const isShiftEligibleForSwap = (shift?: { date: string; shiftType: string } | null): boolean => {
  if (!shift || !shift.date) return false;
  const [y, m, d] = shift.date.split('-').map(Number);
  const startHour = shift.shiftType === 'Afternoon' ? 14 : 8;
  const shiftStartMs = new Date(y, m - 1, d, startHour, 0, 0).getTime();
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  return shiftStartMs - Date.now() >= TWELVE_HOURS_MS;
};

// Helper: Kiểm tra 2 ca trực có bị trùng ca/xung đột thời gian không
const isShiftOverlapping = (shift1: { date: string; shiftType: string }, shift2: { date: string; shiftType: string }): boolean => {
  if (shift1.date !== shift2.date) return false;
  if (shift1.shiftType === 'Full' || shift2.shiftType === 'Full') return true;
  return shift1.shiftType === shift2.shiftType;
};

// Helper: Kiểm tra một lịch hẹn có thuộc đúng ngày & khung giờ ca trực được chọn không
const isApptInShift = (apptTimeStr: string, shiftDateStr: string, shiftType: string): boolean => {
  if (!apptTimeStr || !shiftDateStr) return false;

  let datePart = apptTimeStr;
  let timePart = '';
  if (apptTimeStr.includes('@')) {
    const parts = apptTimeStr.split('@');
    datePart = parts[0].trim();
    timePart = parts[1].trim();
  }

  const [y, m, d] = shiftDateStr.split('-');
  const shiftDateDDMMYYYY = `${d}/${m}/${y}`;

  const isSameDate = (datePart === shiftDateStr || datePart === shiftDateDDMMYYYY);
  if (!isSameDate) return false;

  if (timePart) {
    const match = timePart.match(/^(\d{1,2}):/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (shiftType === 'Morning') {
        if (hour < 8 || hour >= 14) return false;
      } else if (shiftType === 'Afternoon') {
        if (hour < 14 || hour >= 20) return false;
      }
    }
  }

  return true;
};

export interface DentistScheduleProps {
  dentistId?: string;
}

export const DentistSchedule: React.FC<DentistScheduleProps> = ({ dentistId: dentistIdProp }) => {
  const { user } = useAuth();
  const dentistId = dentistIdProp || user?.id || '';
  const { doctorShifts, dentists, appointments, swapShifts, transferShift } = useClinic();

  const matchId = (id1?: string, id2?: string) => {
    if (!id1 || !id2) return false;
    if (id1 === id2) return true;
    const num1 = id1.replace(/\D/g, '');
    const num2 = id2.replace(/\D/g, '');
    return num1 !== '' && num1 === num2;
  };

  // State quản lý tuần
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [filterDentistId, setFilterDentistId] = useState<string>('ALL');

  // Selected shift & Modal state
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [actionType, setActionType] = useState<'swap' | 'transfer'>('swap');
  const [editFilterDentistId, setEditFilterDentistId] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('');
  const [targetDentistId, setTargetDentistId] = useState('');

  // Conflict modal
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: 'swap' | 'transfer';
    conflictAppts: typeof appointments;
    newDentistName: string;
    pendingSwapTargetId?: string;
    pendingTransferDentistId?: string;
  } | null>(null);

  // Loading state & Toast
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [successToast, setSuccessToast] = useState<{ title: string; message: string } | null>(null);

  const currentDentist = dentists.find(d => d.id === dentistId);

  // Calculate week range
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { dayNum: d.getDate(), dateStr: fmt(d), dayOfWeek: DAY_NAMES[d.getDay()], month: d.getMonth() + 1 };
  });

  const weekStartStr = fmt(weekStart);
  const weekEndStr = fmt(weekEnd);

  const filteredShifts = doctorShifts.filter(s => {
    const inWeek = s.date >= weekStartStr && s.date <= weekEndStr;
    const byDentist = filterDentistId === 'ALL' || s.dentistId === filterDentistId;
    return inWeek && byDentist;
  });

  const goToPrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const goToNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const goToToday = () => setWeekStart(getMonday(new Date()));

  const todayShifts = doctorShifts.filter(s => s.date === TODAY);

  // Đưa Bác sĩ đang đăng nhập lên ĐẦU TIÊN
  const sortedDentists = React.useMemo(() => {
    return [...dentists].sort((a, b) => {
      if (a.id === dentistId) return -1;
      if (b.id === dentistId) return 1;
      return 0;
    });
  }, [dentists, dentistId]);

  // Stats
  const totalShiftsThisWeek = filteredShifts.length;
  const dentistShiftCounts = sortedDentists.map(d => ({
    ...d,
    count: filteredShifts.filter(s => s.dentistId === d.id).length
  }));

  const selectedShift = selectedShiftId ? doctorShifts.find(s => s.id === selectedShiftId) : null;

  // Open modal for selected shift
  const openActionModal = (shiftId: string) => {
    const shift = doctorShifts.find(s => s.id === shiftId);
    if (shift && !matchId(shift.dentistId, dentistId)) {
      alert('Bạn chỉ được phép đổi hoặc xin trực thay cho ca trực của chính mình!');
      return;
    }
    setSelectedShiftId(shiftId);
    setActionType('swap');
    setTargetShiftId('');
    setTargetDentistId('');
    setEditFilterDentistId('');
    setShowSwapModal(true);
  };

  // Submit action (Swap or Transfer)
  const handleConfirmAction = async () => {
    if (!selectedShiftId) return;

    const sourceShift = doctorShifts.find(s => s.id === selectedShiftId);
    if (sourceShift && sourceShift.date < TODAY) {
      alert('Ca trực trong quá khứ đã hoàn thành, không thể chỉnh sửa hoặc đổi ca!');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      if (actionType === 'swap') {
        if (!targetShiftId || targetShiftId === selectedShiftId) {
          alert('Vui lòng chọn ca trực khác để hoán đổi!');
          setIsSubmittingEdit(false);
          return;
        }

        const targetShift = doctorShifts.find(s => s.id === targetShiftId);
        if (sourceShift) {
          const sourceConflictAppts = appointments.filter(a =>
            a.dentistId === sourceShift.dentistId &&
            a.status !== 'Cancelled' && a.status !== 'Completed' &&
            isApptInShift(a.time, sourceShift.date, sourceShift.shiftType)
          );

          const targetConflictAppts = targetShift
            ? appointments.filter(a =>
                a.dentistId === targetShift.dentistId &&
                a.status !== 'Cancelled' && a.status !== 'Completed' &&
                isApptInShift(a.time, targetShift.date, targetShift.shiftType)
              )
            : [];

          const conflictAppts = [...sourceConflictAppts, ...targetConflictAppts];

          if (conflictAppts.length > 0) {
            setConflictData({
              action: 'swap',
              conflictAppts,
              newDentistName: targetShift?.dentistName || 'Bác sĩ khác',
              pendingSwapTargetId: targetShiftId,
            });
            setShowConflictModal(true);
            setIsSubmittingEdit(false);
            return;
          }
        }
        const res = await swapShifts(selectedShiftId, targetShiftId);
        if (res && (res as any).error) {
          alert((res as any).error);
        } else {
          setSuccessToast({
            title: 'Hoán đổi ca trực thành công!',
            message: 'Ca trực đã được hoán đổi. Hệ thống tự động thông báo danh sách bệnh nhân bị ảnh hưởng đến Bộ phận Lễ tân.'
          });
          setShowSwapModal(false);
          setSelectedShiftId(null);
          setTargetShiftId('');
          setTargetDentistId('');
        }

      } else if (actionType === 'transfer') {
        if (!targetDentistId) {
          alert('Vui lòng chọn bác sĩ nhận ca trực!');
          setIsSubmittingEdit(false);
          return;
        }

        if (sourceShift) {
          const conflictAppts = appointments.filter(a =>
            a.dentistId === sourceShift.dentistId &&
            a.status !== 'Cancelled' && a.status !== 'Completed' &&
            isApptInShift(a.time, sourceShift.date, sourceShift.shiftType)
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
            setIsSubmittingEdit(false);
            return;
          }
        }
        const res = await transferShift(selectedShiftId, targetDentistId);
        if (res && res.error) {
          alert(res.error);
        } else {
          setSuccessToast({
            title: 'Nhờ trực thay thành công!',
            message: 'Ca trực đã được chuyển giao và thông báo tự động đã gửi đến Bộ phận Lễ tân.'
          });
          setShowSwapModal(false);
          setSelectedShiftId(null);
          setTargetShiftId('');
          setTargetDentistId('');
        }
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Confirm Conflict Handler
  const handleConfirmConflict = async () => {
    if (!selectedShiftId || !conflictData) return;
    const conflictIds = conflictData.conflictAppts.map(a => a.id);

    setIsSubmittingEdit(true);
    try {
      if (conflictData.action === 'swap' && conflictData.pendingSwapTargetId) {
        const res = await swapShifts(selectedShiftId, conflictData.pendingSwapTargetId, conflictIds);
        if (res && (res as any).error) {
          alert((res as any).error);
          return;
        }
        setSuccessToast({
          title: 'Hoán đổi ca trực thành công!',
          message: 'Ca trực đã được hoán đổi. Thông báo danh sách bệnh nhân bị ảnh hưởng đã được gửi đến Lễ tân để hỗ trợ liên hệ.'
        });
      } else if (conflictData.action === 'transfer' && conflictData.pendingTransferDentistId) {
        const res = await transferShift(selectedShiftId, conflictData.pendingTransferDentistId, conflictIds);
        if (res && res.error) {
          alert(res.error);
          return;
        }
        setSuccessToast({
          title: 'Nhờ trực thay thành công!',
          message: 'Ca trực đã được chuyển giao. Thông báo danh sách bệnh nhân bị ảnh hưởng đã được gửi đến Lễ tân để hỗ trợ liên hệ.'
        });
      }

      setShowConflictModal(false);
      setConflictData(null);
      setShowSwapModal(false);
      setSelectedShiftId(null);
      setTargetShiftId('');
      setTargetDentistId('');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-outline-variant shadow-sm">
        <div>
          <h2 className="font-bold text-headline-sm text-on-surface flex items-center gap-2">
            <Icon name="calendar_month" className="text-primary" />
            Lịch Làm Việc Bác Sĩ
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Xem lịch làm việc cá nhân &amp; khoa phòng, hoán đổi ca trực hoặc nhờ đồng nghiệp trực thay
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={goToPrevWeek}
              className="px-3 py-2 hover:bg-slate-50 text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors border-r border-outline-variant"
              title="Tuần trước"
            >
              <Icon name="chevron_left" className="text-lg" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-bold text-on-surface hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
            >
              {weekDays[0].dayNum.toString().padStart(2, '0')}/{weekDays[0].month.toString().padStart(2, '0')} – {weekDays[6].dayNum.toString().padStart(2, '0')}/{weekDays[6].month.toString().padStart(2, '0')}/{weekStart.getFullYear()}
            </button>
            <button
              onClick={goToNextWeek}
              className="px-3 py-2 hover:bg-slate-50 text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors border-l border-outline-variant"
              title="Tuần sau"
            >
              <Icon name="chevron_right" className="text-lg" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={goToToday}
            className="px-4 py-2.5 bg-white border border-outline-variant hover:bg-purple-50 hover:text-purple-700 text-on-surface rounded-xl font-bold text-xs cursor-pointer transition-all shadow-sm"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* ── Today Banner ── */}
      {todayShifts.length > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
            Trực hôm nay – {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </p>
          <div className="flex flex-wrap gap-3">
            {todayShifts.map(shift => {
              const conf = SHIFT_CONFIG[shift.shiftType as keyof typeof SHIFT_CONFIG];
              const doc = dentists.find(d => d.id === shift.dentistId);
              const isMine = shift.dentistId === dentistId;
              return (
                <div key={shift.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-all ${isMine ? 'bg-white/30 border-white/60 ring-2 ring-white/50 font-bold' : 'bg-white/20 border-white/30'}`}>
                  {doc?.avatar && (
                    <img src={doc.avatar} alt={doc.name} className="w-7 h-7 rounded-full object-cover border border-white/50 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-black">
                      {shift.dentistName.replace('Bác sĩ ', 'BS. ')}
                    </p>
                    <p className="text-[10px] opacity-80">{shift.room} · {conf?.label} ({conf?.time})</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── LEFT Sidebar ── */}
        <div className="col-span-12 lg:col-span-3 space-y-4">

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-3">
            <p className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider">Thống kê tuần này</p>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-lg">
                {totalShiftsThisWeek}
              </div>
              <div>
                <p className="text-xs font-bold text-purple-900">Tổng ca trực toàn khoa</p>
                <p className="text-[10px] text-purple-700">Trong tuần đã chọn</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {dentistShiftCounts.map(d => {
                const isMine = d.id === dentistId;
                return (
                  <div key={d.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${isMine ? 'bg-purple-100/60 font-bold border border-purple-200' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={d.avatar} alt={d.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                      <span className={`text-[11px] truncate ${isMine ? 'text-purple-950 font-black' : 'text-on-surface font-bold'}`}>
                        {d.name.replace('Bác sĩ ', 'BS. ')}
                      </span>
                    </div>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${d.count > 0 ? (isMine ? 'bg-purple-600 text-white shadow-2xs' : 'bg-purple-100 text-purple-700') : 'bg-slate-100 text-slate-400'}`}>
                      {d.count} ca
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Doctor filter */}
          <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-3">
            <p className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider">Lọc xem bác sĩ</p>
            <div className="space-y-1.5">
              <button
                onClick={() => setFilterDentistId('ALL')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDentistId === 'ALL'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
                  }`}
              >
                <Icon name="groups" className="text-sm" />
                Tất cả bác sĩ
              </button>
              {sortedDentists.map(doc => {
                return (
                  <button
                    key={doc.id}
                    onClick={() => setFilterDentistId(doc.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-l-4 ${DENTIST_ACCENT[doc.id] || 'border-l-outline-variant'} ${filterDentistId === doc.id
                        ? 'bg-surface-container border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
                      }`}
                  >
                    <img src={doc.avatar} alt={doc.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                    <span className="truncate">{doc.name.replace('Bác sĩ ', 'BS. ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quy chế card */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <h5 className="font-bold flex items-center gap-1">
              <Icon name="warning" className="text-amber-600 text-[16px]" />
              Quy chế đổi ca trực
            </h5>
            <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed text-[10px] text-amber-800">
              <li>Yêu cầu đổi ca cần thực hiện trước thời điểm bắt đầu ít nhất <strong>12 tiếng</strong>.</li>
              <li>Bác sĩ nhận ca phải còn trống khung giờ tương ứng.</li>
              <li>Sau khi đổi ca thành công, hệ thống tự động thông báo danh sách bệnh nhân bị ảnh hưởng đến Bộ phận Lễ tân.</li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT Main Content: Weekly Matrix Table ── */}
        <div className="col-span-12 lg:col-span-9">


          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-outline-variant text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-36">Bác Sĩ</th>
                  {weekDays.map(day => {
                    const isToday = day.dateStr === TODAY;
                    const isWeekend = day.dayOfWeek === 'Thứ Bảy' || day.dayOfWeek === 'Chủ Nhật';
                    return (
                      <th
                        key={day.dateStr}
                        className={`py-3 px-2 text-center border-l border-outline-variant/30 ${isToday ? 'bg-purple-50 text-purple-600' : isWeekend ? 'text-red-400' : ''}`}
                      >
                        <div>{day.dayOfWeek}</div>
                        <div className="text-[10px] font-bold opacity-70 mt-0.5">{day.dayNum.toString().padStart(2, '0')}/{day.month.toString().padStart(2, '0')}</div>
                        {isToday && <div className="text-[8px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full mt-0.5 inline-block">HÔM NAY</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {sortedDentists
                  .filter(d => filterDentistId === 'ALL' || d.id === filterDentistId)
                  .map(doc => {
                    const isMineRow = doc.id === dentistId;
                    return (
                      <tr key={doc.id} className={`transition-colors ${isMineRow ? 'bg-purple-50/50 border-l-4 border-l-purple-600 font-bold shadow-2xs' : 'hover:bg-slate-50/50'}`}>
                        {/* Doctor column */}
                        <td className={`px-4 py-3 border-r ${isMineRow ? 'bg-purple-100/60 border-r-purple-300' : 'bg-slate-50/30 border-r-outline-variant/60'}`}>
                          <div className="flex items-center gap-2.5">
                            <img src={doc.avatar} alt={doc.name} className={`w-8 h-8 rounded-full object-cover shrink-0 ${isMineRow ? 'border-2 border-purple-500 shadow-xs' : 'border border-slate-200'}`} />
                            <div>
                              <p className={`font-extrabold text-xs ${isMineRow ? 'text-purple-950 font-black' : 'text-on-surface'}`}>
                                {doc.name.replace('Bác sĩ ', 'BS. ')}
                              </p>
                              <p className={`text-[10px] ${isMineRow ? 'text-purple-700 font-bold' : 'text-on-surface-variant'}`}>{doc.room}</p>
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {weekDays.map(day => {
                          const shifts = filteredShifts.filter(s => s.dentistId === doc.id && s.date === day.dateStr);
                          const isToday = day.dateStr === TODAY;

                          return (
                            <td key={day.dateStr} className={`p-2 border-l border-outline-variant/30 align-top min-w-[110px] ${isMineRow ? (isToday ? 'bg-purple-100/40' : 'bg-purple-50/30') : (isToday ? 'bg-purple-50/20' : '')}`}>
                              {shifts.length === 0 ? (
                                <div className="h-10 border border-transparent rounded-xl" />
                              ) : (
                                <div className="space-y-1.5">
                                  {shifts.map(shift => {
                                    const cfg = SHIFT_CONFIG[shift.shiftType as keyof typeof SHIFT_CONFIG];
                                    const isMyShift = matchId(shift.dentistId, dentistId);
                                    const isEligible = isShiftEligibleForSwap(shift);

                                    return (
                                      <div key={shift.id} className="space-y-1">
                                        <button
                                          onClick={() => isMyShift && openActionModal(shift.id)}
                                          disabled={!isMyShift}
                                          className={`w-full text-left p-2 border rounded-xl text-[10px] font-bold transition-all border-l-4 ${DENTIST_ACCENT[shift.dentistId] || ''} ${cfg?.color || ''} ${selectedShiftId === shift.id ? 'ring-2 ring-purple-400 shadow-md' : 'shadow-sm'} ${isMyShift ? 'cursor-pointer hover:shadow' : 'cursor-default opacity-85'}`}
                                          title={isMyShift ? 'Bấm để đổi ca hoặc nhờ trực thay' : `Ca trực của ${doc.name}`}
                                        >
                                          <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg?.dot || ''}`} />
                                              <span className="font-extrabold">{cfg?.label}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between text-[9px] opacity-75">
                                            <span>{shift.room}</span>
                                            {isMyShift && (
                                              <span className={`text-[8px] font-semibold ${isEligible ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                                {isEligible ? 'Đổi ca' : '< 12h'}
                                              </span>
                                            )}
                                          </div>
                                        </button>
                                        

                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Swap / Transfer Modal ── */}
      {showSwapModal && selectedShift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => { setShowSwapModal(false); setSelectedShiftId(null); }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="swap_horiz" />
                Quản Lý Đổi Ca làm việc
              </h3>
              <button onClick={() => { setShowSwapModal(false); setSelectedShiftId(null); }} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Shift info summary */}
              <div className="p-3.5 bg-slate-50 border border-outline-variant rounded-xl text-xs space-y-1">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ca trực hiện tại:</p>
                <p className="font-bold text-slate-800 text-sm">
                  {selectedShift.dentistName} ({selectedShift.room})
                </p>
                <p className="text-slate-600">
                  Ngày: <strong>{selectedShift.date}</strong> · Loại ca: <strong>{SHIFT_CONFIG[selectedShift.shiftType as keyof typeof SHIFT_CONFIG]?.label} ({SHIFT_CONFIG[selectedShift.shiftType as keyof typeof SHIFT_CONFIG]?.time})</strong>
                </p>
              </div>

              {/* Action selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Hình thức đổi ca</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setActionType('swap'); setTargetShiftId(''); }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${actionType === 'swap' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-outline-variant text-slate-600 hover:bg-slate-50'}`}
                  >
                    🔄 Hoán đổi ca trực (2 bên)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionType('transfer'); setTargetDentistId(''); }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${actionType === 'transfer' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-outline-variant text-slate-600 hover:bg-slate-50'}`}
                  >
                    👤 Nhờ trực thay (1 bên)
                  </button>
                </div>
              </div>

              {/* Ineligible warning banner */}
              {!isShiftEligibleForSwap(selectedShift) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <Icon name="error" className="text-red-500 text-[18px] shrink-0" />
                  <span>Ca trực này đang diễn ra hoặc còn dưới 12 tiếng mới tới giờ bắt đầu. Theo quy định, không thể thực hiện hoán đổi hoặc nhờ trực thay.</span>
                </div>
              )}

              {/* Action specific fields */}
              {actionType === 'swap' && (
                <div className="space-y-4">
                  {/* Field 1: Doctor Filter */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      1. Lọc theo bác sĩ muốn hoán đổi ca (Không bắt buộc)
                    </label>
                    <select
                      value={editFilterDentistId}
                      onChange={e => {
                        setEditFilterDentistId(e.target.value);
                        setTargetShiftId('');
                      }}
                      disabled={!isShiftEligibleForSwap(selectedShift)}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Tất cả bác sĩ (Hiển thị toàn bộ ca hợp lệ) --</option>
                      {dentists
                        .filter(d => d.id !== selectedShift.dentistId && d.status !== 'Inactive')
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.role.split('&')[0]})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Field 2: Target Shift */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      2. Chọn ca trực muốn hoán đổi (Đủ điều kiện &ge; 12 tiếng) *
                    </label>
                    <select
                      value={targetShiftId}
                      onChange={e => setTargetShiftId(e.target.value)}
                      disabled={!isShiftEligibleForSwap(selectedShift)}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn ca trực khác --</option>
                      {doctorShifts
                        .filter(s => {
                          if (s.dentistId === selectedShift.dentistId) return false;
                          if (editFilterDentistId && s.dentistId !== editFilterDentistId) return false;
                          if (!isShiftEligibleForSwap(s)) return false;
                          if (s.date === selectedShift.date && s.shiftType === selectedShift.shiftType) return false;

                          const doc1HasOverlapOnTargetDate = doctorShifts.some(other =>
                            other.id !== selectedShift.id &&
                            other.dentistId === selectedShift.dentistId &&
                            isShiftOverlapping(other, s)
                          );
                          if (doc1HasOverlapOnTargetDate) return false;

                          const doc2HasOverlapOnOriginDate = doctorShifts.some(other =>
                            other.id !== s.id &&
                            other.dentistId === s.dentistId &&
                            isShiftOverlapping(other, selectedShift)
                          );
                          if (doc2HasOverlapOnOriginDate) return false;

                          return true;
                        })
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.dentistName} ({s.room}) - {s.date} ({SHIFT_CONFIG[s.shiftType as keyof typeof SHIFT_CONFIG]?.label})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {actionType === 'transfer' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn bác sĩ nhận ca *</label>
                  <select
                    value={targetDentistId}
                    onChange={e => setTargetDentistId(e.target.value)}
                    disabled={!isShiftEligibleForSwap(selectedShift)}
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn bác sĩ --</option>
                    {dentists
                      .filter(d => {
                        if (d.id === selectedShift.dentistId) return false;
                        if (d.status === 'Inactive') return false;
                        const hasOverlappingShift = doctorShifts.some(s => {
                          if (s.dentistId !== d.id || s.date !== selectedShift.date) return false;
                          if (selectedShift.shiftType === 'Full' || s.shiftType === 'Full') return true;
                          return s.shiftType === selectedShift.shiftType;
                        });
                        return !hasOverlappingShift;
                      })
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.role.split('&')[0]})</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-end gap-2 shrink-0">
              <button
                onClick={() => { setShowSwapModal(false); setSelectedShiftId(null); }}
                className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmittingEdit || !isShiftEligibleForSwap(selectedShift)}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingEdit ? (
                  <>
                    <Icon name="progress_activity" className="text-[16px] animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Icon name="check_circle" className="text-[16px]" />
                    Xác nhận đổi ca
                  </>
                )}
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
                Cảnh báo: Ca trực có lịch hẹn bệnh nhân!
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
                  {conflictData.conflictAppts.length} lịch hẹn bị ảnh hưởng
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
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Cần liên hệ</span>
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
                disabled={isSubmittingEdit}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingEdit ? (
                  <>
                    <Icon name="progress_activity" className="text-[16px] animate-spin" />
                    Đang gửi thông báo...
                  </>
                ) : (
                  <>
                    <Icon name="notifications_active" className="text-[16px]" />
                    Xác nhận &amp; Thông báo lễ tân
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM UI SUCCESS NOTIFICATION MODAL ── */}
      {successToast && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Icon name="check_circle" className="text-3xl font-extrabold" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-800 text-base">{successToast.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {successToast.message}
              </p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/70 p-3.5 rounded-2xl text-left flex items-start gap-2 text-xs text-emerald-900">
              <Icon name="notifications_active" className="text-emerald-600 text-base shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đã tự động đồng bộ Lễ tân:</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Bộ phận Lễ tân tiếp đón đã nhận được thông báo này trực tiếp trên hệ thống.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSuccessToast(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                Đồng ý &amp; Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
