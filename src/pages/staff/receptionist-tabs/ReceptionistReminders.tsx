import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { BookingModal } from '../../../components/BookingModal';

// ─── TASK INTERFACES ───────────────────────────────────────────────
interface LatePatientTask {
  id: string;
  patientName: string;
  time: string;
  minsLate: number;
  phone: string;
  resolved: boolean;
}

interface NoShowTask {
  id: string;
  patientName: string;
  missedDate: string;
  service: string;
  phone: string;
  resolved: boolean;
  cancelReason?: string;
}


export const ReceptionistReminders: React.FC = () => {
  const {
    appointments,
    queue,
    shiftChangeNotifications,
    resolveShiftConflict_Update,
    resolveShiftConflict_Cancel,
    cancelAppointment,
  } = useClinic();

  const { showConfirm, showAlert } = useConfirm();

  const [hideDoneNotifs, setHideDoneNotifs] = useState(false);
  const [changingDoctorTaskId, setChangingDoctorTaskId] = useState<string | null>(null);

  // Helper to format today
  const todayStr = useMemo(() => {
    const padZero = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    return `${padZero(now.getDate())}/${padZero(now.getMonth() + 1)}/${now.getFullYear()}`;
  }, []);

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Persistent local storage resolved tasks
  const [resolvedIds, setResolvedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('goodsmile_resolved_reminders') || '[]');
    } catch {
      return [];
    }
  });

  const [rebookModal, setRebookModal] = useState<{
    isOpen: boolean;
    patientName?: string;
    patientPhone?: string;
    taskId?: string;
    taskType?: 'late' | 'noshow';
  }>({ isOpen: false });

  const handleOpenRebook = (patientName: string, patientPhone: string, taskId?: string, taskType?: 'late' | 'noshow') => {
    setRebookModal({
      isOpen: true,
      patientName,
      patientPhone,
      taskId,
      taskType,
    });
  };

  const handleCloseRebook = () => {
    if (rebookModal.taskId) {
      if (rebookModal.taskType === 'late') {
        handleResolveLate(rebookModal.taskId);
      } else if (rebookModal.taskType === 'noshow') {
        handleResolveNoShow(rebookModal.taskId);
      }
    }
    setRebookModal({ isOpen: false });
  };

  const handleResolveLate = (id: string) => {
    handleResolve(id);
  };

  const handleResolveNoShow = (id: string) => {
    handleResolve(id);
  };

  const handleCancelByStaff = async (id: string, patientName: string, taskType: 'late' | 'noshow') => {
    const isConfirmed = await showConfirm({
      title: 'Xác nhận hủy lịch hẹn',
      message: `Bạn có chắc chắn muốn hủy lịch hẹn của bệnh nhân ${patientName}? Lịch hẹn sẽ được cập nhật sang trạng thái ĐÃ HỦY và lưu vết lịch sử.`,
      type: 'error',
      confirmLabel: 'Xác nhận hủy lịch',
      cancelLabel: 'Bỏ qua',
    });

    if (isConfirmed) {
      await cancelAppointment(id, 'Hủy bởi lễ tân CSKH sau khi liên hệ');
      if (taskType === 'late') {
        handleResolveLate(id);
      } else {
        handleResolveNoShow(id);
      }
      await showAlert({
        title: 'Đã hủy lịch hẹn',
        message: `Lịch hẹn của bệnh nhân ${patientName} đã được chuyển sang trạng thái Đã hủy thành công.`,
        type: 'success',
      });
    }
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const [filterDate, setFilterDate] = useState<string>(todayIso);

  const filterDateFormatted = useMemo(() => {
    if (!filterDate) return todayStr;
    const parts = filterDate.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return todayStr;
  }, [filterDate, todayStr]);

  const handleResolve = (id: string) => {
    const next = [...resolvedIds, id];
    setResolvedIds(next);
    localStorage.setItem('goodsmile_resolved_reminders', JSON.stringify(next));
  };

  // 1. Late patients today / selected date
  const latePatientsList = useMemo(() => {
    const list: LatePatientTask[] = [];
    const now = new Date();

    for (const a of appointments) {
      if (a.status !== 'Confirmed') continue; // Chỉ hiển thị Confirmed đang trễ (NoShow được xử lý tại mục CSKH riêng)

      // Check if resolved
      if (resolvedIds.includes(a.id)) continue;

      // Determine date
      let apptDateStr = todayStr;
      let timeStr = a.time;
      if (a.time.includes('@')) {
        apptDateStr = a.time.split('@')[0].trim();
        timeStr = a.time.split('@')[1].trim();
      }

      if (apptDateStr !== filterDateFormatted) continue;

      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) continue;

      let hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const ampm = match[3];
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }

      const apptTime = new Date();
      apptTime.setHours(hours, mins, 0, 0);

      const diffMins = Math.max(0, Math.floor((now.getTime() - apptTime.getTime()) / 60000));

      // Check if not checked in
      const checkedIn = queue.some(q => q.patientId === a.patientId && q.status !== 'Completed');

      if (diffMins >= 15 && !checkedIn) {
        list.push({
          id: a.id,
          patientName: a.patientName,
          time: timeStr,
          minsLate: diffMins || 15,
          phone: a.patientPhone,
          resolved: false,
        });
      }
    }
    return list;
  }, [appointments, queue, todayStr, filterDateFormatted, resolvedIds]);

  // 2. NoShow — Cần CSKH liên hệ (hiển thị TẤT CẢ ngày, không lọc theo date picker)
  const noShowsList = useMemo(() => {
    const list: NoShowTask[] = [];

    for (const a of appointments) {
      if (resolvedIds.includes(a.id)) continue;
      if (a.status !== 'NoShow') continue; // Chỉ lấy NoShow (lỡ hẹn chưa được CSKH xử lý)

      let apptDateStr = todayStr;
      let timeStr = a.time;
      if (a.time.includes('@')) {
        apptDateStr = a.time.split('@')[0].trim();
        timeStr = a.time.split('@')[1].trim();
      }

      const displayDate = apptDateStr === todayStr ? 'Hôm nay' : apptDateStr;

      list.push({
        id: a.id,
        patientName: a.patientName,
        missedDate: `${displayDate} lúc ${timeStr}`,
        service: a.serviceName,
        phone: a.patientPhone,
        resolved: false,
        cancelReason: a.cancelReason,
      });
    }
    return list;
  }, [appointments, todayStr, resolvedIds]);


  // ─── Lọc & Tìm kiếm (Filters) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = (searchParams.get('subTab') || 'all') as 'all' | 'shift' | 'late' | 'noshow';

  const setTaskFilter = (val: 'all' | 'shift' | 'late' | 'noshow') => {
    setSearchParams(prev => {
      prev.set('subTab', val);
      return prev;
    });
  };

  // Lọc dữ liệu dựa trên SearchQuery (Tên KH / SĐT / Tên BS)
  const query = searchQuery.toLowerCase();

  const filteredShiftNotifs = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'shift') return [];
    return (shiftChangeNotifications || []).filter(n => {
      // Chỉ hiển thị các yêu cầu đổi ca / trực thay CÓ BỆNH NHÂN BỊ ẢNH HƯỞNG LỊCH HẸN (> 0 ca trùng)
      if (!n.affectedItems || n.affectedItems.length === 0) return false;

      if (!query) return true;
      return (
        n.originalDentistName.toLowerCase().includes(query) ||
        n.newDentistName.toLowerCase().includes(query) ||
        (n.affectedItems && n.affectedItems.some(i => i.patientName.toLowerCase().includes(query) || i.patientPhone.includes(query)))
      );
    });
  }, [shiftChangeNotifications, taskFilter, query]);

  const filteredLate = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'late') return [];
    return latePatientsList.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [latePatientsList, taskFilter, query]);

  const filteredNoShows = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'noshow') return [];
    return noShowsList.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [noShowsList, taskFilter, query]);

  return (
    <div className="p-stack-lg animate-in fade-in duration-200">

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          {[
            { id: 'all', label: 'Tất cả công việc' },
            { id: 'shift', label: 'BS Đổi ca / Trực thay' },
            { id: 'late', label: 'Khách trễ hẹn' },
            { id: 'noshow', label: 'Cần CSKH liên hệ' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTaskFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${taskFilter === f.id ? 'bg-primary text-white shadow-md' : 'bg-surface-container hover:bg-slate-200 text-on-surface-variant'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bộ lọc Ngày (Mặc định Hôm nay) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-outline-variant/60 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
            <Icon name="calendar_today" className="text-primary text-sm shrink-0" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0">Ngày:</span>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="bg-transparent font-extrabold outline-none cursor-pointer text-xs text-slate-800"
            />
          </div>
          {filterDate !== todayIso && (
            <button
              onClick={() => setFilterDate(todayIso)}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Hôm nay
            </button>
          )}

          {/* Ô Tìm kiếm */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm tên KH, SĐT, Tên BS..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION: Bác sĩ đổi lịch / Nhờ trực thay ── */}
      {filteredShiftNotifs.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 mt-2">
            <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Icon name="published_with_changes" className="text-[18px]" />
            </span>
            <span>Bác sĩ đổi lịch / Nhờ trực thay</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-xs">
              {filteredShiftNotifs.length}
            </span>
          </h3>

          <div className="flex flex-col gap-4">
            {filteredShiftNotifs.map(notif => {
              const cleanDoctorName = (name: string) => {
                if (!name) return 'Bác sĩ';
                const cleaned = name.replace(/^(bác sĩ|bs\.?)\s+/ig, '').trim();
                return `BS. ${cleaned}`;
              };

              const origName = cleanDoctorName(notif.originalDentistName);
              const newName = cleanDoctorName(notif.newDentistName);

              const shiftTypeInfo = notif.shiftType === 'Morning'
                ? { label: 'Ca Sáng (08:00 - 14:00)', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'wb_sunny' }
                : notif.shiftType === 'Afternoon'
                  ? { label: 'Ca Chiều (14:00 - 20:00)', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'wb_twilight' }
                  : { label: 'Cả Ngày (08:00 - 20:00)', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'schedule' };

              return (
                <div key={notif.id} className="p-4 sm:p-5 rounded-2xl border border-purple-200/90 bg-gradient-to-br from-white via-purple-50/20 to-purple-50/40 shadow-sm hover:shadow-md transition-all space-y-4">

                  {/* Top Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                        <Icon name="swap_horiz" className="text-purple-600 text-[16px]" />
                        Yêu cầu Bàn giao / Trực thay
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono shadow-2xs">
                        <Icon name="calendar_today" className="text-[14px] text-slate-400" />
                        {notif.shiftDate}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-xs font-bold ${shiftTypeInfo.bg}`}>
                        <Icon name={shiftTypeInfo.icon} className="text-[14px]" />
                        {shiftTypeInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Transfer Visual Flow Diagram */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center bg-white p-4 rounded-xl border border-purple-100/90 shadow-2xs">
                    {/* Origin Doctor */}
                    <div className="sm:col-span-3 flex items-center gap-3 p-2.5 bg-purple-50/50 rounded-xl border border-purple-100/60">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {origName.replace('BS. ', '').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bác sĩ bàn giao</p>
                        <p className="font-extrabold text-sm text-slate-800 truncate">{origName}</p>
                      </div>
                    </div>

                    {/* Transfer Indicator Arrow */}
                    <div className="sm:col-span-1 flex flex-col items-center justify-center text-purple-600 py-1">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shadow-2xs">
                        <Icon name="arrow_forward" className="text-lg rotate-90 sm:rotate-0" />
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase tracking-wider">Chuyển</span>
                    </div>

                    {/* Target Doctor */}
                    <div className="sm:col-span-3 flex items-center gap-3 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {newName.replace('BS. ', '').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bác sĩ nhận ca</p>
                        <p className="font-extrabold text-sm text-slate-900 truncate">{newName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient Conflicts status */}
                  {notif.affectedItems && notif.affectedItems.length > 0 ? (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <Icon name="warning" className="text-amber-500 text-[16px]" />
                          Bệnh nhân bị ảnh hưởng lịch khám ({notif.affectedItems.length}):
                        </p>
                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Cần xử lý
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {notif.affectedItems.map((item, idx) => (
                          <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">
                                {item.patientName}{' '}
                                <span className="font-semibold text-slate-500 text-xs font-mono">({item.patientPhone})</span>
                              </p>
                              <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                                <Icon name="medical_services" className="text-[13px] text-slate-400" />
                                {item.serviceName} • <span className="font-bold text-slate-700">{item.time}</span>
                              </p>
                            </div>

                            {item.resolved ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
                                <Icon name="check_circle" className="text-emerald-600 text-[15px]" />
                                {item.resolvedAction === 'cancelled' ? 'Đã hủy lịch' : `Đã chuyển sang ${newName}`}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => resolveShiftConflict_Update(notif.id, item.appointmentId)}
                                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <Icon name="person_add" className="text-[15px]" />
                                  Đổi sang {newName}
                                </button>
                                <button
                                  onClick={() => resolveShiftConflict_Cancel(notif.id, item.appointmentId)}
                                  className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 active:scale-95 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-slate-200"
                                >
                                  Hủy lịch
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Icon name="check_circle" className="text-emerald-600 text-[18px] shrink-0" />
                        <span>Không có bệnh nhân nào bị ảnh hưởng lịch hẹn trong ca trực này.</span>
                      </div>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        ✓ An toàn
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION: Khách trễ hẹn (Confirmed + chưa check-in ≥15p) ── */}
      {filteredLate.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-red-100 text-error flex items-center justify-center">
              <Icon name="alarm_off" className="text-[18px]" />
            </span>
            <span>Khách trễ hẹn hôm nay</span>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold text-xs">
              {filteredLate.length}
            </span>
          </h3>
          <div className="flex flex-col gap-3">
            {filteredLate.map(task => (
              <div key={task.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${task.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-error/30 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${task.resolved ? 'bg-slate-200 text-slate-500' : 'bg-error-container text-error'}`}>
                    <Icon name={task.resolved ? "check_circle" : "alarm_on"} className="text-[20px]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{task.patientName}</p>
                    <p className="text-xs text-error font-medium mt-0.5">Trễ {task.minsLate} phút (Lịch: {task.time})</p>
                  </div>
                </div>
                {!task.resolved && (
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`tel:${task.phone.replace(/\s/g, '')}`} className="px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1">
                      <Icon name="call" className="text-[14px]" />
                      Gọi
                    </a>
                    <button
                      onClick={() => handleOpenRebook(task.patientName, task.phone, task.id, 'late')}
                      className="px-3 py-2 bg-[#005eb8] text-white rounded-xl text-xs font-bold hover:bg-[#00478d] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Icon name="edit_calendar" className="text-[14px]" />
                      Đặt lại lịch
                    </button>
                    <button
                      onClick={() => handleCancelByStaff(task.id, task.patientName, 'late')}
                      className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-1 cursor-pointer"
                      title="Xác nhận bệnh nhân muốn hủy lịch hẹn này"
                    >
                      <Icon name="cancel" className="text-[14px]" />
                      Khách xác nhận hủy
                    </button>
                    <button onClick={() => handleResolveLate(task.id)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors text-slate-700 cursor-pointer" title="Đã xong">
                      <Icon name="check" className="text-[14px]" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION: Khách lỡ hẹn — Cần CSKH liên hệ ── */}
      {filteredNoShows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 mt-2">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Icon name="person_off" className="text-[18px]" />
              </span>
              <span>Khách lỡ hẹn — Cần CSKH liên hệ</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                {filteredNoShows.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1">
              <Icon name="info" className="text-[13px]" />
              Hiển thị tất cả ngày — Gọi xác nhận → Đặt lại hoặc Hủy hẳn
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {filteredNoShows.map(task => (
              <div key={task.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="flex items-stretch">
                  {/* Dải màu trái */}
                  <div className="w-1.5 shrink-0 bg-amber-400" />
                  <div className="flex-1 p-4">
                    {/* Row 1: Patient info + phone */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Icon name="person_off" className="text-[20px] text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-on-surface">{task.patientName}</p>
                            <span className="text-[10px] font-mono text-on-surface-variant bg-slate-100 px-1.5 py-0.5 rounded">{task.id}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              <Icon name="schedule" className="text-[10px]" />
                              Lỡ hẹn
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            <Icon name="calendar_today" className="text-[11px] inline mr-0.5 align-middle text-amber-500" />
                            {task.missedDate}
                            <span className="mx-1.5 text-slate-300">·</span>
                            {task.service}
                          </p>
                        </div>
                      </div>
                      {/* Nút gọi nhanh */}
                      <a
                        href={`tel:${task.phone.replace(/\s/g, '')}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all"
                      >
                        <Icon name="call" className="text-[14px]" />
                        {task.phone}
                      </a>
                    </div>

                    {/* Row 2: Thông tin hệ thống */}
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                      <Icon name="info" className="text-orange-400 text-[14px] mt-0.5 shrink-0" />
                      <p className="text-xs text-orange-800 leading-relaxed">
                        <span className="font-bold">Hệ thống ghi nhận: </span>
                        {task.cancelReason || 'Bệnh nhân không check-in sau 15 phút kể từ giờ hẹn.'}
                      </p>
                    </div>

                    {/* Row 3: Nút hành động */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenRebook(task.patientName, task.phone, task.id, 'noshow')}
                        className="px-3.5 py-2 bg-[#005eb8] text-white rounded-xl text-xs font-bold hover:bg-[#00478d] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Icon name="edit_calendar" className="text-[14px]" />
                        Đặt lại lịch
                      </button>
                      <button
                        onClick={() => handleCancelByStaff(task.id, task.patientName, 'noshow')}
                        className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Sau khi liên hệ, khách xác nhận muốn hủy hẳn lịch hẹn này"
                      >
                        <Icon name="cancel" className="text-[14px]" />
                        Khách xác nhận hủy
                      </button>
                      <button
                        onClick={() => handleResolveNoShow(task.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer flex items-center gap-1"
                        title="Đã liên hệ xong, không cần xử lý thêm"
                      >
                        <Icon name="check" className="text-[14px]" />
                        Đã xử lý
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trạng thái trống ── */}
      {filteredShiftNotifs.length === 0 && filteredLate.length === 0 && filteredNoShows.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
          <Icon name="task_alt" className="text-6xl mb-3 text-slate-300" />
          <p className="font-bold text-base text-slate-500">Tuyệt vời!</p>
          <p className="text-sm mt-1">Không có công việc nào cần xử lý lúc này.</p>
        </div>
      )}

      {/* Modal đặt lại lịch hẹn cho bệnh nhân lỡ hẹn/trễ hẹn */}
      <BookingModal
        isOpen={rebookModal.isOpen}
        onClose={handleCloseRebook}
        defaultPatientName={rebookModal.patientName}
        defaultPatientPhone={rebookModal.patientPhone}
      />
    </div>
  );
};
