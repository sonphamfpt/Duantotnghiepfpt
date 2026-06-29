import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { BookingModal } from '../../../components/BookingModal';
import { RescheduleModal } from '../../../components/RescheduleModal';

const APPT_STATUS: Record<string, { label: string; badge: string; icon: string }> = {
  Confirmed:   { label: 'Đã xác nhận',  badge: 'bg-secondary-container text-on-secondary-container', icon: 'check_circle' },
  'In-Progress':{ label: 'Đang khám',   badge: 'bg-primary-container text-on-primary-container',     icon: 'medical_services' },
  Cancelled:   { label: 'Đã hủy',       badge: 'bg-error-container text-error',                      icon: 'cancel' },
  Completed:   { label: 'Hoàn tất',     badge: 'bg-surface-container text-on-surface-variant',       icon: 'task_alt' },
};

// ── Helpers tính ngày ──────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('vi-VN');
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('vi-VN');
};

/** Từ chuỗi giờ như "09:00 AM" hoặc "Ngày mai @ 10:00 AM", lấy ngày đính kèm.
 *  Mock data hiện tại không có trường date riêng, nên ta dùng quy ước:
 *  - Nếu time có "@ " => parse trước "@"
 *  - Ngược lại coi là hôm nay
 */
const parseDateFromTime = (time: string): string => {
  if (time.includes('@')) {
    return time.split('@')[0].trim();
  }
  return todayStr();
};

const checkIfLate = (apptTime: string): { isLate: boolean; minsLate: number } => {
  const dateStr = parseDateFromTime(apptTime);
  // Only check if it's today or yesterday (mock data sometimes uses "Hôm qua")
  if (dateStr !== todayStr() && !dateStr.includes('Hôm qua')) return { isLate: false, minsLate: 0 };
  
  let timeStr = apptTime;
  if (apptTime.includes('@')) {
    timeStr = apptTime.split('@')[1].trim();
  }
  
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { isLate: false, minsLate: 0 };
  
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';
  
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  
  const now = new Date();
  const apptDateObj = new Date();
  if (dateStr.includes('Hôm qua')) {
    apptDateObj.setDate(apptDateObj.getDate() - 1);
  }
  apptDateObj.setHours(hours, mins, 0, 0);
  
  const diffMs = now.getTime() - apptDateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins >= 15) {
    return { isLate: true, minsLate: diffMins };
  }
  return { isLate: false, minsLate: 0 };
};

export const ReceptionistAppointments: React.FC = () => {
  const { appointments, dentists, cancelAppointment, checkInPatient, doctorShifts, rescheduleAppointment } = useClinic();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [filterDentist, setFilterDentist] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDay, setViewDay] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  // Conflict resolution states
  const [resolvingApptId, setResolvingApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00 AM');
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);

  const convertDateToYmd = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) return dateStr;
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return dateStr;
  };

  const getShiftTypeFromTime = (timeStr: string): 'Morning' | 'Afternoon' => {
    return timeStr.toUpperCase().includes('PM') ? 'Afternoon' : 'Morning';
  };

  const checkShiftMismatch = (appt: any) => {
    if (appt.status !== 'Confirmed') return null;
    
    const apptDate = parseDateFromTime(appt.time);
    const dateYmd = convertDateToYmd(apptDate);
    const shiftType = getShiftTypeFromTime(appt.time);

    const hasShift = doctorShifts.some(s => 
      s.dentistId === appt.dentistId && 
      s.date === dateYmd && 
      (s.shiftType === 'Full' || s.shiftType === shiftType)
    );

    if (hasShift) return null;

    const substituteShift = doctorShifts.find(s => 
      s.date === dateYmd && 
      (s.shiftType === 'Full' || s.shiftType === shiftType)
    );

    return {
      originalDentistName: appt.dentistName,
      substituteDentistId: substituteShift ? substituteShift.dentistId : null,
      substituteDentistName: substituteShift ? substituteShift.dentistName : 'Chưa có bác sĩ trực',
      dateYmd,
      shiftType
    };
  };

  const resolvingAppt = appointments.find(a => a.id === resolvingApptId);
  const mismatch = resolvingAppt ? checkShiftMismatch(resolvingAppt) : null;

  // ── Lọc dữ liệu live từ Context ──────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    // Lọc theo ngày
    const apptDate = parseDateFromTime(a.time);
    if (viewDay === 'today' && apptDate !== todayStr()) return false;
    if (viewDay === 'tomorrow' && apptDate !== tomorrowStr()) return false;
    
    if (viewDay === 'custom') {
      if (!customDate) return false;
      const [y, m, d] = customDate.split('-');
      const formattedCustom = `${d}/${m}/${y}`;
      if (apptDate !== formattedCustom) {
        return false;
      }
    }
    // Lọc bác sĩ
    if (filterDentist !== 'all' && a.dentistId !== filterDentist) return false;
    // Lọc trạng thái
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    // Tìm kiếm
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.patientName.toLowerCase().includes(q) && !a.patientPhone.includes(q) && !a.serviceName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCheckin = (appt: typeof appointments[0]) => {
    checkInPatient(appt.patientId, appt.dentistId, undefined, appt.serviceName);
  };

  const totalAppts = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;

  const inProgressCount = appointments.filter(a => a.status === 'In-Progress').length;

  return (
    <div className="p-stack-lg">
      {/* ── Header ── */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Lịch hẹn phòng khám</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Quản lý, xác nhận và check-in lịch hẹn khám chữa bệnh</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRescheduleApptId('GLOBAL')}
            className="flex items-center gap-2 px-5 py-3 border border-outline-variant bg-white text-on-surface rounded-xl font-bold hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Icon name="edit_calendar" />
            Dời lịch
          </button>
          <button
            id="btn-new-appointment"
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <Icon name="calendar_add_on" />
            Đặt lịch hẹn mới
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Tổng lịch hẹn',  value: totalAppts,      icon: 'calendar_today',  color: 'text-on-surface bg-surface-container border-outline-variant' },
          { label: 'Đã xác nhận',    value: confirmedCount,  icon: 'check_circle',    color: 'text-secondary bg-secondary-container border-secondary/20' },
          { label: 'Đang khám',      value: inProgressCount, icon: 'medical_services',color: 'text-primary bg-primary-container border-primary/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
            <Icon name={s.icon} className="text-[26px]" />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>



      {/* ── Filters ── */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {/* Day toggle & Custom Date */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant">
            {[
              { key: 'today' as const,    label: 'Hôm nay' },
              { key: 'tomorrow' as const, label: 'Ngày mai' },
              { key: 'week' as const,     label: 'Cả tuần' },
            ].map(d => (
              <button
                key={d.key}
                id={`btn-day-filter-${d.key}`}
                onClick={() => {
                  setViewDay(d.key);
                  setCustomDate('');
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewDay === d.key ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="relative flex items-center bg-white border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            {(() => {
              const todayObj = new Date();
              return (
                <input
                  type="date"
                  min={todayObj.toISOString().split('T')[0]}
                  max={new Date(todayObj.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  value={customDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setCustomDate(val);
                      setViewDay('custom');
                    } else {
                      setCustomDate('');
                      setViewDay('today');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                    viewDay === 'custom'
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant'
                  }`}
                  title="Chọn ngày tuỳ chỉnh (Tối đa 7 ngày tới)"
                />
              );
            })()}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant" />
          <input
            placeholder="Tên, SĐT, dịch vụ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-4 py-2 bg-white border border-outline-variant rounded-xl text-xs focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none w-44"
          />
        </div>

        {/* Dentist filter */}
        <select
          value={filterDentist}
          onChange={e => setFilterDentist(e.target.value)}
          className="px-3 py-2 bg-white border border-outline-variant rounded-xl text-xs focus:outline-none cursor-pointer"
        >
          <option value="all">Tất cả bác sĩ</option>
          {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-outline-variant rounded-xl text-xs focus:outline-none cursor-pointer"
        >
          <option value="all">Mọi trạng thái</option>
          {Object.entries(APPT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Clear filters */}
        {(filterDentist !== 'all' || filterStatus !== 'all' || searchQuery) && (
          <button
            onClick={() => { setFilterDentist('all'); setFilterStatus('all'); setSearchQuery(''); }}
            className="text-xs text-on-surface-variant border border-outline-variant rounded-xl px-3 py-2 hover:bg-surface-container cursor-pointer flex items-center gap-1"
          >
            <Icon name="filter_alt_off" className="text-[14px]" />
            Xóa lọc
          </button>
        )}
      </div>

      {/* ── Appointments Table ── */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase">
                {['Giờ hẹn', 'Bệnh nhân', 'Dịch vụ', 'Bác sĩ', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((appt) => {
                const conf = APPT_STATUS[appt.status] || APPT_STATUS.Confirmed;
                return (
                  <tr
                    key={appt.id}
                    className={`hover:bg-surface-container-low transition-colors ${appt.status === 'Cancelled' ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <p className="font-bold text-primary">{appt.time}</p>
                        {(() => {
                          if (appt.status !== 'Confirmed') return null;
                          const lateInfo = checkIfLate(appt.time);
                          if (lateInfo.isLate) {
                            return (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-error-container text-error animate-pulse border border-error/20">
                                <Icon name="warning" className="text-[12px]" />
                                Trễ {lateInfo.minsLate} phút
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-on-surface text-sm">{appt.patientName}</p>
                      <p className="text-xs text-on-surface-variant">{appt.patientPhone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">{appt.serviceName}</td>
                    <td className="px-5 py-4 text-sm font-bold text-on-surface">
                      {(() => {
                        const mismatch = checkShiftMismatch(appt);
                        if (mismatch) {
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-bold text-on-surface">{appt.dentistName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingApptId(appt.id);
                                  setRescheduleDate(mismatch.dateYmd);
                                }}
                                className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-800 rounded text-[10px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-0.5 cursor-pointer animate-pulse"
                              >
                                <Icon name="warning" className="text-[12px]" />
                                Đổi ca - Cập nhật
                              </button>
                            </div>
                          );
                        }
                        return <span>{appt.dentistName}</span>;
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${conf.badge}`}>
                        <Icon name={conf.icon} className="text-[13px]" />
                        {conf.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {/* Vào khám (chỉ Confirmed) */}
                        {appt.status === 'Confirmed' && (
                          <div className="flex gap-1.5">
                            <button
                              id={`btn-checkin-${appt.id}`}
                              onClick={() => handleCheckin(appt)}
                              className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                            >
                              <Icon name="how_to_reg" className="text-[13px]" />
                              Check-in
                            </button>
                            <button
                              onClick={() => setRescheduleApptId(appt.id)}
                              className="px-2.5 py-1.5 border border-primary text-primary rounded-lg text-xs font-bold hover:bg-primary/10 cursor-pointer transition-all"
                              title="Dời lịch"
                            >
                              <Icon name="edit_calendar" className="text-[13px]" />
                            </button>
                          </div>
                        )}
                        {/* Hủy */}
                        {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                          <button
                            id={`btn-cancel-${appt.id}`}
                            onClick={() => {
                              if (window.confirm(`Hủy lịch hẹn của ${appt.patientName}?`)) {
                                cancelAppointment(appt.id);
                              }
                            }}
                            className="px-2.5 py-1.5 border border-error text-error rounded-lg text-xs font-bold hover:bg-error-container cursor-pointer transition-all"
                            title="Hủy lịch"
                          >
                            <Icon name="cancel" className="text-[13px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon name="calendar_today" className="text-[64px] text-outline/40" />
              <p className="text-on-surface-variant mt-4">Không có lịch hẹn nào phù hợp</p>
              {(filterDentist !== 'all' || filterStatus !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setFilterDentist('all'); setFilterStatus('all'); setSearchQuery(''); }}
                  className="mt-2 text-primary text-sm font-bold hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Timeline by dentist ── */}
      <div className="mt-6 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
          <Icon name="view_timeline" className="text-primary" />
          <h4 className="font-headline-sm text-headline-sm">Timeline theo phòng khám — {viewDay === 'today' ? 'Hôm nay' : viewDay === 'tomorrow' ? 'Ngày mai' : 'Cả tuần'}</h4>
        </div>
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dentists.map(d => {
            const dAppts = appointments.filter(a => a.dentistId === d.id);
            return (
              <div key={d.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">
                    {d.name.split(' ').pop()?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">{d.name.replace('Bác sĩ ', '')}</p>
                    <p className="text-[10px] text-on-surface-variant">{d.room}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dAppts.slice(0, 5).map((a, ai) => {
                    const c = APPT_STATUS[a.status] || APPT_STATUS.Confirmed;
                    return (
                      <div key={ai} className={`text-[10px] px-2 py-1.5 rounded-lg ${c.badge} flex items-center justify-between gap-1`}>
                        <span className="font-bold shrink-0">{a.time}</span>
                        <span className="truncate">{a.patientName.split(' ').pop()}</span>
                      </div>
                    );
                  })}
                  {dAppts.length === 0 && (
                    <div className="text-[10px] text-on-surface-variant italic py-2 text-center">Trống</div>
                  )}
                  {dAppts.length > 5 && (
                    <div className="text-[10px] text-primary font-bold text-center">+{dAppts.length - 5} lịch khác</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <RescheduleModal isOpen={!!rescheduleApptId} onClose={() => setRescheduleApptId(null)} appointmentId={rescheduleApptId} />

      {/* ── Resolve Shift Change Modal ── */}
      {resolvingApptId && resolvingAppt && mismatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-1.5 text-amber-800">
                <Icon name="warning" className="text-amber-600" />
                Xử Lý Lịch Hẹn Đổi Ca Trực
              </h3>
              <button
                onClick={() => setResolvingApptId(null)}
                className="hover:bg-slate-100 p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>

            {/* Conflict details */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2.5 text-xs text-on-surface">
              <div className="flex justify-between border-b border-dashed border-amber-200/60 pb-1.5">
                <span className="font-semibold text-on-surface-variant">Bệnh nhân:</span>
                <span className="font-bold">{resolvingAppt.patientName} ({resolvingAppt.patientPhone})</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-amber-200/60 pb-1.5">
                <span className="font-semibold text-on-surface-variant">Thời gian hẹn:</span>
                <span className="font-bold text-primary">{resolvingAppt.time}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-amber-200/60 pb-1.5">
                <span className="font-semibold text-on-surface-variant">Bác sĩ ban đầu:</span>
                <span className="font-bold text-slate-500 line-through">{mismatch.originalDentistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-on-surface-variant">Bác sĩ trực thay thế:</span>
                <span className="font-bold text-green-700 flex items-center gap-1">
                  <Icon name="check_circle" className="text-sm" />
                  {mismatch.substituteDentistName}
                </span>
              </div>
            </div>

            {/* Resolve Form Options */}
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider">Phương án 1: Bệnh nhân đồng ý đổi bác sĩ</h4>
                <button
                  type="button"
                  disabled={!mismatch.substituteDentistId}
                  onClick={() => {
                    if (mismatch.substituteDentistId) {
                      rescheduleAppointment(
                        resolvingAppt.id,
                        resolvingAppt.time,
                        mismatch.substituteDentistId,
                        mismatch.substituteDentistName
                      );
                      setResolvingApptId(null);
                      alert('Đã cập nhật lịch sang bác sĩ trực thay thế mới thành công!');
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    mismatch.substituteDentistId
                      ? 'bg-green-600 border-green-700 hover:bg-green-700 text-white cursor-pointer shadow'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Icon name="swap_horiz" className="text-[16px]" />
                  Xác nhận khám với {mismatch.substituteDentistName}
                </button>
              </div>

              <div className="w-full h-px bg-outline-variant my-4" />

              {/* Option 2: Reschedule */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const newFormattedDate = rescheduleDate.includes('-')
                    ? rescheduleDate.split('-').reverse().join('/')
                    : rescheduleDate;
                  const newTimeStr = `${newFormattedDate} @ ${rescheduleTime}`;
                  rescheduleAppointment(resolvingAppt.id, newTimeStr);
                  setResolvingApptId(null);
                  alert(`Đã dời lịch hẹn khám với ${resolvingAppt.dentistName} sang lúc ${newTimeStr} thành công!`);
                }}
                className="space-y-3"
              >
                <h4 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider">Phương án 2: Dời lịch hẹn (Khám bác sĩ ban đầu)</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Chọn ngày hẹn khác</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Chọn khung giờ</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {[
                        '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
                        '10:15 AM', '11:00 AM', '02:00 PM', '02:30 PM',
                        '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
                      ].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary-container transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
                >
                  <Icon name="event_repeat" className="text-[16px]" />
                  Xác nhận dời lịch sang giờ mới
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
