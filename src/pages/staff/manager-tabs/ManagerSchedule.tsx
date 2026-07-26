import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { exportToExcel } from '../../../utils/exportToExcel';


// ─── Constants ───────────────────────────────────────────────────────────────

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

const ALL_ROOMS = ['Phòng 102', 'Phòng 105', 'Phòng 108', 'Phòng 110'];

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// Helper: lấy ngày đầu tuần (Thứ Hai) từ một ngày bất kỳ
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Helper: format date thành YYYY-MM-DD
const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
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

// ─── Component ───────────────────────────────────────────────────────────────

export const ManagerSchedule: React.FC = () => {
  const { doctorShifts, dentists, appointments, addShift, deleteShift, swapShifts, transferShift, changeShiftRoom } = useClinic();
  const { showAlert } = useConfirm();


  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [filterDentistId, setFilterDentistId] = useState<string>('ALL');

  // Add shift modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    dentistId: '',
    date: TODAY,
    shiftType: 'Morning' as 'Morning' | 'Afternoon' | 'Full',
    room: ALL_ROOMS[0],
  });

  // Helper: Kiểm tra ca làm việc nào bị disable theo lịch đã có & real-time
  const getShiftTypeAvailability = (dentistId: string, dateStr: string) => {
    if (!dentistId || !dateStr) {
      return { Morning: false, Afternoon: false, Full: false, reasons: {} as Record<string, string> };
    }

    const existingShifts = doctorShifts.filter(s => s.dentistId === dentistId && s.date === dateStr);
    const hasMorning = existingShifts.some(s => s.shiftType === 'Morning');
    const hasAfternoon = existingShifts.some(s => s.shiftType === 'Afternoon');
    const hasFull = existingShifts.some(s => s.shiftType === 'Full');

    const isToday = dateStr === TODAY;
    const currentHour = new Date().getHours();
    const isMorningPastRealtime = isToday && currentHour >= 8;
    const isAfternoonPastRealtime = isToday && currentHour >= 14;

    const reasons: Record<string, string> = {};

    if (hasFull) {
      reasons.Morning = 'Đã có ca cả ngày';
      reasons.Afternoon = 'Đã có ca cả ngày';
      reasons.Full = 'Đã có ca cả ngày';
    } else {
      if (hasMorning) {
        reasons.Morning = 'Đã có ca sáng';
        reasons.Full = 'Đã có ca sáng';
      }
      if (hasAfternoon) {
        reasons.Afternoon = 'Đã có ca chiều';
        reasons.Full = 'Đã có ca chiều';
      }
      if (isMorningPastRealtime) {
        if (!reasons.Morning) reasons.Morning = 'Đã qua giờ bắt đầu (08:00)';
        if (!reasons.Full) reasons.Full = 'Đã qua giờ bắt đầu (08:00)';
      }
      if (isAfternoonPastRealtime) {
        if (!reasons.Afternoon) reasons.Afternoon = 'Đã qua giờ bắt đầu (14:00)';
      }
    }

    return {
      Morning: !!reasons.Morning,
      Afternoon: !!reasons.Afternoon,
      Full: !!reasons.Full,
      reasons,
    };
  };

  // Tự động chuyển shiftType chọn sẵn sang ca còn trống khi mở modal hoặc thay đổi bác sĩ/ngày
  useEffect(() => {
    if (showAddModal && addForm.dentistId && addForm.date) {
      const avail = getShiftTypeAvailability(addForm.dentistId, addForm.date);
      if (avail[addForm.shiftType]) {
        if (!avail.Morning) setAddForm(p => ({ ...p, shiftType: 'Morning' }));
        else if (!avail.Afternoon) setAddForm(p => ({ ...p, shiftType: 'Afternoon' }));
        else if (!avail.Full) setAddForm(p => ({ ...p, shiftType: 'Full' }));
      }
    }
  }, [showAddModal, addForm.dentistId, addForm.date]);

  // Detail/edit modal
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAction, setEditAction] = useState<'swap' | 'transfer' | 'change_room'>('swap');
  const [editTargetShiftId, setEditTargetShiftId] = useState('');
  const [editTargetDentistId, setEditTargetDentistId] = useState('');
  const [editFilterDentistId, setEditFilterDentistId] = useState('');
  const [editTargetRoom, setEditTargetRoom] = useState('');

  // Loading states
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Conflict modal
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: 'swap' | 'transfer';
    conflictAppts: typeof appointments;
    newDentistName: string;
    pendingSwapTargetId?: string;
    pendingTransferDentistId?: string;
  } | null>(null);

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

  // Stats
  const totalShiftsThisWeek = filteredShifts.length;
  const dentistShiftCounts = dentists.map(d => ({
    ...d,
    count: filteredShifts.filter(s => s.dentistId === d.id).length
  }));

  const selectedShift = selectedShiftId ? doctorShifts.find(s => s.id === selectedShiftId) : null;
  const selectedDentist = selectedShift ? dentists.find(d => d.id === selectedShift.dentistId) : null;

  // ── Add Shift Handler ──
  const handleAddShift = async () => {
    if (!addForm.dentistId || !addForm.date) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng chọn bác sĩ và ngày trực!', type: 'warning' });
      return;
    }

    // 1. Check past date
    if (addForm.date < TODAY) {
      showAlert({ title: 'Không hợp lệ', message: 'Không thể tạo hoặc xếp ca trực cho ngày trong quá khứ!', type: 'warning' });
      return;
    }

    // 1b. Check real-time for TODAY
    if (addForm.date === TODAY) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = addForm.shiftType === 'Afternoon' ? 14 : 8;
      if (currentHour >= startHour) {
        const shiftLabel = addForm.shiftType === 'Morning' ? 'Ca sáng (08:00)' : addForm.shiftType === 'Afternoon' ? 'Ca chiều (14:00)' : 'Ca cả ngày (08:00)';
        showAlert({
          title: 'Giờ làm việc đã diễn ra',
          message: `${shiftLabel} ngày hôm nay đã bắt đầu hoặc kết thúc (${startHour}:00). Không thể thêm ca trực mới cho khung giờ đã trôi qua!`,
          type: 'warning',
        });
        return;
      }
    }

    const dentist = dentists.find(d => d.id === addForm.dentistId);
    if (!dentist) return;

    // 2. Check doctor existing shifts on the target date
    const existingShifts = doctorShifts.filter(
      s => s.dentistId === addForm.dentistId && s.date === addForm.date
    );

    const hasMorning = existingShifts.some(s => s.shiftType === 'Morning');
    const hasAfternoon = existingShifts.some(s => s.shiftType === 'Afternoon');
    const hasFull = existingShifts.some(s => s.shiftType === 'Full');

    if (hasFull) {
      showAlert({
        title: 'Lịch trực đã đầy',
        message: `Bác sĩ ${dentist.name} đã được phân công Ca cả ngày vào ngày ${addForm.date}. Không thể xếp thêm ca nào khác!`,
        type: 'warning',
      });
      return;
    }

    if (hasMorning && hasAfternoon) {
      showAlert({
        title: 'Lịch trực đã đầy',
        message: `Bác sĩ ${dentist.name} đã có đủ cả Ca sáng và Ca chiều vào ngày ${addForm.date}. Không thể thêm ca trực nào nữa!`,
        type: 'warning',
      });
      return;
    }

    if ((hasMorning || hasAfternoon) && addForm.shiftType === 'Full') {
      const existShiftLabel = hasMorning ? 'Ca sáng' : 'Ca chiều';
      showAlert({
        title: 'Xung đột ca trực',
        message: `Bác sĩ ${dentist.name} đã có ${existShiftLabel} vào ngày ${addForm.date}. Không thể đăng ký thêm Ca cả ngày!`,
        type: 'warning',
      });
      return;
    }

    if (addForm.shiftType === 'Morning' && hasMorning) {
      showAlert({
        title: 'Trùng ca trực',
        message: `Bác sĩ ${dentist.name} đã có Ca sáng vào ngày ${addForm.date}!`,
        type: 'warning',
      });
      return;
    }

    if (addForm.shiftType === 'Afternoon' && hasAfternoon) {
      showAlert({
        title: 'Trùng ca trực',
        message: `Bác sĩ ${dentist.name} đã có Ca chiều vào ngày ${addForm.date}!`,
        type: 'warning',
      });
      return;
    }

    // 3. Check room overlap conflict (2 doctors in same room on same shift and date)
    const isRoomOccupied = doctorShifts.some(
      s => s.room === addForm.room && s.date === addForm.date && (s.shiftType === addForm.shiftType || s.shiftType === 'Full' || addForm.shiftType === 'Full')
    );
    if (isRoomOccupied) {
      showAlert({
        title: 'Xung đột phòng khám',
        message: `Phòng khám ${addForm.room} đã có bác sĩ khác đăng ký trực trong ${addForm.shiftType === 'Morning' ? 'Ca sáng' : addForm.shiftType === 'Afternoon' ? 'Ca chiều' : 'Cả ngày'} ngày ${addForm.date}. Vui lòng chọn phòng khác!`,
        type: 'warning',
      });
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await addShift({
        dentistId: addForm.dentistId,
        dentistName: dentist.name,
        date: addForm.date,
        shiftType: addForm.shiftType,
        room: addForm.room,
      });
      showAlert({ title: 'Thành công', message: `Đã thêm ca trực mới cho ${dentist.name} thành công!`, type: 'success' });
      setShowAddModal(false);
      setAddForm({ dentistId: '', date: '', shiftType: 'Morning', room: ALL_ROOMS[0] });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // ── Delete Handler ──
  const handleDeleteShift = async (shiftId: string) => {
    setIsSubmittingDelete(true);
    try {
      const res = await deleteShift(shiftId);
      setShowDeleteConfirm(null);
      setSelectedShiftId(null);
      if (res && res.error) {
        showAlert({
          title: 'Không thể xóa ca trực',
          message: res.error,
          type: 'error',
        });
      } else if (res && res.success) {
        showAlert({
          title: 'Thành công',
          message: res.message || 'Đã xóa ca trực thành công!',
          type: 'success',
        });
      }
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // ── Edit Action Handler ──
  const handleEditAction = async () => {
    if (!selectedShiftId) return;

    const sourceShift = doctorShifts.find(s => s.id === selectedShiftId);
    if (sourceShift && sourceShift.date < TODAY) {
      showAlert({ title: 'Ca trực đã hoàn tất', message: 'Ca trực trong quá khứ đã hoàn thành, không thể chỉnh sửa hoặc đổi ca!', type: 'warning' });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      if (editAction === 'swap') {

        if (!editTargetShiftId || editTargetShiftId === selectedShiftId) {
          showAlert({ title: 'Chọn ca hoán đổi', message: 'Vui lòng chọn ca trực khác để hoán đổi!', type: 'warning' });
          setIsSubmittingEdit(false);
          return;
        }

        // Kiểm tra conflict lịch hẹn của ca gốc và ca đích
        const sourceShift = doctorShifts.find(s => s.id === selectedShiftId);
        const targetShift = doctorShifts.find(s => s.id === editTargetShiftId);
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
              pendingSwapTargetId: editTargetShiftId,
            });
            setShowConflictModal(true);
            setIsSubmittingEdit(false);
            return;
          }
        }
        const res = await swapShifts(selectedShiftId, editTargetShiftId);
        if (res && res.error) {
          showAlert({ title: 'Không thể hoán đổi ca', message: res.error, type: 'error' });
        } else {
          showAlert({ title: 'Thành công', message: 'Hoán đổi ca trực thành công!', type: 'success' });
        }

      } else if (editAction === 'transfer') {
        if (!editTargetDentistId) {
          showAlert({ title: 'Chọn bác sĩ nhận ca', message: 'Vui lòng chọn bác sĩ nhận ca!', type: 'warning' });
          setIsSubmittingEdit(false);
          return;
        }

        // Kiểm tra conflict lịch hẹn của ca gốc
        const sourceShift = doctorShifts.find(s => s.id === selectedShiftId);
        if (sourceShift) {
          const conflictAppts = appointments.filter(a =>
            a.dentistId === sourceShift.dentistId &&
            a.status !== 'Cancelled' && a.status !== 'Completed' &&
            isApptInShift(a.time, sourceShift.date, sourceShift.shiftType)
          );
          const newDentist = dentists.find(d => d.id === editTargetDentistId);
          if (conflictAppts.length > 0) {
            setConflictData({
              action: 'transfer',
              conflictAppts,
              newDentistName: newDentist?.name || 'Bác sĩ mới',
              pendingTransferDentistId: editTargetDentistId,
            });
            setShowConflictModal(true);
            setIsSubmittingEdit(false);
            return;
          }
        }
        const res = await transferShift(selectedShiftId, editTargetDentistId);
        if (res && res.error) {
          showAlert({ title: 'Không thể nhờ trực thay', message: res.error, type: 'error' });
        } else {
          showAlert({ title: 'Thành công', message: 'Chuyển giao ca trực thành công!', type: 'success' });
        }
      }

      setShowEditModal(false);
      setSelectedShiftId(null);
      setEditTargetShiftId('');
      setEditTargetDentistId('');
      setEditTargetRoom('');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ── Confirm Conflict Handler ──
  const handleConfirmConflict = async () => {
    if (!selectedShiftId || !conflictData) return;
    const conflictIds = conflictData.conflictAppts.map(a => a.id);

    setIsSubmittingEdit(true);
    try {
      if (conflictData.action === 'swap' && conflictData.pendingSwapTargetId) {
        await swapShifts(selectedShiftId, conflictData.pendingSwapTargetId, conflictIds);
      } else if (conflictData.action === 'transfer' && conflictData.pendingTransferDentistId) {
        await transferShift(selectedShiftId, conflictData.pendingTransferDentistId, conflictIds);
      }

      setShowConflictModal(false);
      setConflictData(null);
      setShowEditModal(false);
      setSelectedShiftId(null);
      setEditTargetShiftId('');
      setEditTargetDentistId('');
      setEditTargetRoom('');
      showAlert({ title: 'Thành công', message: 'Đã đổi ca và gửi thông báo đến lễ tân thành công!', type: 'success' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleExportScheduleExcel = () => {
    const exportData = doctorShifts.map((s) => {
      const dentist = dentists.find((d) => d.id === s.dentistId);
      const shiftConfig = SHIFT_CONFIG[s.shiftType as keyof typeof SHIFT_CONFIG];
      return {
        id: s.id,
        date: s.date,
        dentistName: dentist?.name || s.dentistName || 'Bác sĩ',
        room: s.room || dentist?.room || 'Chưa xếp',
        shiftType: shiftConfig ? shiftConfig.label : s.shiftType,
        time: shiftConfig ? shiftConfig.time : 'Không xác định',
      };
    });

    exportToExcel(exportData, 'Lich_Lam_Viec_Bac_Si_GoodSmile', {
      id: 'Mã ca trực',
      date: 'Ngày trực',
      dentistName: 'Họ tên bác sĩ',
      room: 'Phòng khám',
      shiftType: 'Ca làm việc',
      time: 'Khung giờ',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-outline-variant shadow-sm">
        <div>
          <h2 className="font-bold text-headline-sm text-on-surface">Lịch Làm Việc Bác Sĩ</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Phân ca trực, xếp phòng khám và xử lý xung đột đổi ca thời gian thực</p>
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

          {/* Export Excel button */}
          <button
            onClick={handleExportScheduleExcel}
            className="px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all"
          >
            <Icon name="description" className="text-[16px]" />
            Xuất File Excel
          </button>

          {/* Add new shift button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-200/50 active:scale-95 cursor-pointer transition-all"
          >
            <Icon name="add_circle" className="text-[16px]" />
            Thêm ca trực mới
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
              const conf = SHIFT_CONFIG[shift.shiftType];
              const doc = dentists.find(d => d.id === shift.dentistId);
              return (
                <div key={shift.id} className="flex items-center gap-2.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                  {doc?.avatar && (
                    <img src={doc.avatar} alt={doc.name} className="w-7 h-7 rounded-full object-cover border border-white/50 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-black">{shift.dentistName.replace('Bác sĩ ', 'BS. ')}</p>
                    <p className="text-[10px] opacity-80">{shift.room} · {conf.label} ({conf.time})</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                <p className="text-xs font-bold text-purple-900">Tổng ca trực</p>
                <p className="text-[10px] text-purple-700">Trong tuần đã chọn</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {dentistShiftCounts.map(d => (
                <div key={d.id} className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={d.avatar} alt={d.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    <span className="text-[11px] font-bold text-on-surface truncate">{d.name.replace('Bác sĩ ', 'BS. ')}</span>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${d.count > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                    {d.count} ca
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor filter */}
          <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-3">
            <p className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider">Lọc bác sĩ</p>
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
              {dentists.map(doc => (
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
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-2">
            <p className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider">Chú thích</p>
            {Object.entries(SHIFT_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span>{cfg.label} ({cfg.time})</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT Main Content: Week Matrix ── */}
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
                {dentists
                  .filter(d => filterDentistId === 'ALL' || d.id === filterDentistId)
                  .map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Doctor column */}
                      <td className="px-4 py-3 bg-slate-50/30 border-r border-outline-variant/60">
                        <div className="flex items-center gap-2.5">
                          <img src={doc.avatar} alt={doc.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                          <div>
                            <p className="font-extrabold text-xs text-on-surface">{doc.name.replace('Bác sĩ ', 'BS. ')}</p>
                            <p className="text-[10px] text-on-surface-variant">{doc.room}</p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {weekDays.map(day => {
                        const shifts = filteredShifts.filter(s => s.dentistId === doc.id && s.date === day.dateStr);
                        const isToday = day.dateStr === TODAY;
                        const isPast = day.dateStr < TODAY;
                        const canAddMore = !isPast && shifts.length === 1 && shifts[0].shiftType !== 'Full';

                        return (
                          <td key={day.dateStr} className={`p-2 border-l border-outline-variant/30 align-top min-w-[110px] ${isToday ? 'bg-purple-50/20' : ''}`}>
                            {shifts.length === 0 ? (
                              !isPast ? (
                                <button
                                  onClick={() => {
                                    setAddForm({
                                      dentistId: doc.id,
                                      date: day.dateStr,
                                      shiftType: 'Morning',
                                      room: doc.room,
                                    });
                                    setShowAddModal(true);
                                  }}
                                  className="w-full py-2.5 border border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/30 hover:bg-purple-50/40 rounded-xl text-center text-[10px] text-slate-400 hover:text-purple-600 font-bold cursor-pointer select-none transition-all flex items-center justify-center gap-1 group shadow-2xs"
                                  title="Thêm ca trực mới cho ngày này"
                                >
                                  <Icon name="add" className="text-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                                  <span className="text-[9px]">Thêm ca</span>
                                </button>
                              ) : (
                                <div className="h-10 border border-transparent rounded-xl" />
                              )
                            ) : (
                              <div className="space-y-1.5">
                                {shifts.map(shift => {
                                  const cfg = SHIFT_CONFIG[shift.shiftType];
                                  return (
                                    <button
                                      key={shift.id}
                                      onClick={() => setSelectedShiftId(selectedShiftId === shift.id ? null : shift.id)}
                                      className={`w-full text-left p-2 border rounded-xl text-[10px] font-bold transition-all cursor-pointer border-l-4 ${DENTIST_ACCENT[shift.dentistId] || ''} ${cfg.color} ${selectedShiftId === shift.id ? 'ring-2 ring-purple-400 shadow-md' : 'shadow-sm hover:shadow'}`}
                                    >
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                                        <span className="font-extrabold">{cfg.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[9px] opacity-75">
                                        <Icon name="meeting_room" className="text-[11px]" />
                                        <span>{shift.room}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                                {/* Chỉ hiển thị nút thêm ca khi Bác sĩ mới có 1 ca và ngày >= hôm nay */}
                                {canAddMore && (
                                  <button
                                    onClick={() => {
                                      const nextType = shifts.some(s => s.shiftType === 'Morning') ? 'Afternoon' : 'Morning';
                                      setAddForm({
                                        dentistId: doc.id,
                                        date: day.dateStr,
                                        shiftType: nextType,
                                        room: doc.room,
                                      });
                                      setShowAddModal(true);
                                    }}
                                    className="w-full py-1 border border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-100/60 rounded-xl text-[9px] text-purple-600 font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-2xs"
                                    title="Thêm ca trực còn thiếu cho bác sĩ"
                                  >
                                    <Icon name="add_circle" className="text-[12px]" />
                                    <span>Thêm ca {shifts.some(s => s.shiftType === 'Morning') ? 'Chiều' : 'Sáng'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Shift Detail Popover ── */}
      {selectedShift && selectedDentist && !showEditModal && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedShiftId(null)}
        >
          <div
            className="bg-white rounded-2xl border border-outline-variant shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-on-surface flex items-center gap-2">
                <Icon name="info" className="text-purple-500" />
                Chi tiết ca trực
              </h3>
              <button onClick={() => setSelectedShiftId(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
              <img src={selectedDentist.avatar} alt={selectedDentist.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
              <div>
                <p className="font-bold text-on-surface">{selectedDentist.name}</p>
                <p className="text-xs text-on-surface-variant">{selectedDentist.role}</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: 'calendar_today', label: 'Ngày trực', value: new Date(selectedShift.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) },
                { icon: 'schedule', label: 'Ca làm việc', value: `${SHIFT_CONFIG[selectedShift.shiftType].label} (${SHIFT_CONFIG[selectedShift.shiftType].time})` },
                { icon: 'meeting_room', label: 'Phòng khám', value: selectedShift.room },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <Icon name={row.icon} className="text-on-surface-variant text-[18px] shrink-0" />
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">{row.label}</p>
                    <p className="font-semibold text-on-surface">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className={`grid ${selectedShift.date < TODAY ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-2`}>
              {selectedShift.date >= TODAY && (
                <button
                  onClick={() => {
                    setEditAction('swap');
                    setShowEditModal(true);
                  }}
                  className="py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Icon name="swap_horiz" className="text-[14px]" />
                  Đổi ca trực
                </button>

              )}
              <button
                onClick={() => setShowDeleteConfirm(selectedShift.id)}
                className="py-2.5 bg-error text-white rounded-xl font-bold text-xs hover:bg-error/90 cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Icon name="delete" className="text-[14px]" />
                {selectedShift.date < TODAY ? 'Xóa mềm ca trực (Ẩn)' : 'Xóa ca trực'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Add Shift Modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-purple-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="add_circle" />
                Thêm Ca Trực Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Dentist */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bác sĩ *</label>
                <select
                  value={addForm.dentistId}
                  onChange={e => setAddForm(prev => ({ ...prev, dentistId: e.target.value }))}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày trực *</label>
                <input
                  type="date"
                  min={TODAY}
                  value={addForm.date}
                  onChange={e => {
                    const selectedDate = e.target.value;
                    if (selectedDate && selectedDate < TODAY) {
                      setAddForm(prev => ({ ...prev, date: TODAY }));
                      return;
                    }
                    setAddForm(prev => ({ ...prev, date: selectedDate }));
                  }}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                />
              </div>

              {/* Shift type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Ca trực *</label>
                {(() => {
                  const avail = getShiftTypeAvailability(addForm.dentistId, addForm.date);
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(SHIFT_CONFIG) as [string, typeof SHIFT_CONFIG['Morning']][]).map(([key, cfg]) => {
                        const isDisabled = avail[key as keyof typeof avail] === true;
                        const reason = avail.reasons[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setAddForm(prev => ({ ...prev, shiftType: key as 'Morning' | 'Afternoon' | 'Full' }))}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                              isDisabled
                                ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed line-through'
                                : addForm.shiftType === key
                                ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm font-bold cursor-pointer'
                                : 'border-outline-variant bg-white text-on-surface-variant hover:border-purple-300 cursor-pointer'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full inline-block mb-1 ${isDisabled ? 'bg-slate-300' : cfg.dot}`} />
                            <p className="text-xs font-bold">{cfg.label}</p>
                            <p className="text-[9px] opacity-70">{cfg.time}</p>
                            {reason && (
                              <span className="block text-[8px] font-semibold text-red-500 mt-1 not-italic no-underline">
                                ({reason})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Room */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phòng khám *</label>
                <select
                  value={addForm.room}
                  onChange={e => setAddForm(prev => ({ ...prev, room: e.target.value }))}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                >
                  {ALL_ROOMS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAddShift}
                disabled={isSubmittingAdd}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingAdd ? (
                  <>
                    <Icon name="progress_activity" className="text-[16px] animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  <>
                    <Icon name="check_circle" className="text-[16px]" />
                    Thêm ca trực
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (Swap/Transfer/ChangeRoom) ── */}
      {showEditModal && selectedShift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => { setShowEditModal(false); setSelectedShiftId(null); }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="swap_horiz" />
                Chỉnh Sửa Ca Trực
              </h3>
              <button onClick={() => { setShowEditModal(false); setSelectedShiftId(null); }} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-outline-variant text-xs">
                <p className="font-bold text-on-surface">Ca đang chỉnh sửa:</p>
                <p className="text-on-surface-variant mt-1">
                  {selectedShift.dentistName} · {selectedShift.date} · {SHIFT_CONFIG[selectedShift.shiftType].label} · {selectedShift.room}
                </p>
              </div>

              {/* Action type selector */}
              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-outline-variant/40 gap-1">
                {[
                  { id: 'swap' as const, label: 'Hoán đổi ca' },
                  { id: 'transfer' as const, label: 'Nhờ trực thay' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEditAction(opt.id)}
                    className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${editAction === opt.id ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Warning banner if current shift is ineligible (< 12 hours) */}
              {(editAction === 'swap' || editAction === 'transfer') && !isShiftEligibleForSwap(selectedShift) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <Icon name="error" className="text-red-500 text-[18px] shrink-0" />
                  <span>Ca trực này đang diễn ra hoặc còn dưới 12 tiếng mới tới giờ bắt đầu. Theo quy định, không thể thực hiện hoán đổi hoặc nhờ trực thay.</span>
                </div>
              )}

              {/* Action-specific fields */}
              {editAction === 'swap' && (
                <div className="space-y-4">
                  {/* Field 1: Lọc Bác sĩ muốn hoán đổi ca cùng */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      1. Lọc theo bác sĩ muốn hoán đổi ca (Không bắt buộc)
                    </label>
                    <select
                      value={editFilterDentistId}
                      onChange={e => {
                        setEditFilterDentistId(e.target.value);
                        setEditTargetShiftId('');
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

                  {/* Field 2: Chọn ca trực muốn hoán đổi */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      2. Chọn ca trực muốn hoán đổi (Đủ điều kiện &ge; 12 tiếng) *
                    </label>
                    <select
                      value={editTargetShiftId}
                      onChange={e => setEditTargetShiftId(e.target.value)}
                      disabled={!isShiftEligibleForSwap(selectedShift)}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn ca trực khác --</option>
                      {doctorShifts
                        .filter(s => {
                          // 1. Phải là ca trực của bác sĩ khác
                          if (s.dentistId === selectedShift.dentistId) return false;
                          // 2. Nếu đã chọn bác sĩ cụ thể ở Field 1 -> Chỉ hiển thị ca của bác sĩ đó
                          if (editFilterDentistId && s.dentistId !== editFilterDentistId) return false;
                          // 3. Phải đủ 12 tiếng nữa mới tới giờ trực
                          if (!isShiftEligibleForSwap(s)) return false;
                          // 4. Không hoán đổi ca cùng ngày cùng loại ca
                          if (s.date === selectedShift.date && s.shiftType === selectedShift.shiftType) return false;

                          // 5. Bác sĩ ca gốc (Doctor A) chưa có ca trùng giờ/ngày vào ngày của ca đích (Target Date: s.date)
                          const doc1HasOverlapOnTargetDate = doctorShifts.some(other =>
                            other.id !== selectedShift.id &&
                            other.dentistId === selectedShift.dentistId &&
                            isShiftOverlapping(other, s)
                          );
                          if (doc1HasOverlapOnTargetDate) return false;

                          // 6. Bác sĩ ca đích (Doctor B: s.dentistId) chưa có ca trùng giờ/ngày vào ngày của ca gốc (Origin Date: selectedShift.date)
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
                            {s.dentistName} ({s.room}) - {s.date} ({SHIFT_CONFIG[s.shiftType].label})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {editAction === 'transfer' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn bác sĩ nhận ca *</label>
                  <select
                    value={editTargetDentistId}
                    onChange={e => setEditTargetDentistId(e.target.value)}
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

            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-end gap-2 shrink-0">
              <button
                onClick={() => { setShowEditModal(false); setSelectedShiftId(null); }}
                className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleEditAction}
                disabled={isSubmittingEdit || ((editAction === 'swap' || editAction === 'transfer') && !isShiftEligibleForSwap(selectedShift))}
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
                    Xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto">
                <Icon name="delete_forever" className="text-error text-3xl" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">Xóa ca trực này?</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Hành động này không thể hoàn tác. Ca trực sẽ bị xóa vĩnh viễn khỏi lịch làm việc.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDeleteShift(showDeleteConfirm)}
                  disabled={isSubmittingDelete}
                  className="flex-1 py-2.5 rounded-xl bg-error text-white font-bold text-sm hover:bg-error/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingDelete ? (
                    <>
                      <Icon name="progress_activity" className="text-[16px] animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <Icon name="delete" className="text-[16px]" />
                      Xóa ca trực
                    </>
                  )}
                </button>
              </div>
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
                  {conflictData.action === 'transfer' ? 'Chuyển giao ca trực' : 'Hoán đổi ca trực'}
                </p>
                <p className="text-amber-700 text-xs">
                  Bác sĩ trực thay thế: <strong>{conflictData.newDentistName}</strong>
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
                  Sau khi xác nhận, <strong>lễ tân sẽ nhận thông báo</strong> và gọi điện trực tiếp đến từng bệnh nhân để xác nhận. Lễ tân sẽ cập nhật bác sĩ hoặc hủy lịch tùy theo phản hồi của bệnh nhân.
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
    </div>
  );
};
