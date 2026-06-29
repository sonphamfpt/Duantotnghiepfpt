import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

// ─── MOCK DATA CHO CÁC TASK MỚI ───────────────────────────────────────────────
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
}

interface PostCareTask {
  id: string;
  patientName: string;
  date: string;
  service: string;
  phone: string;
  resolved: boolean;
}

const INITIAL_LATE_PATIENTS: LatePatientTask[] = [
  { id: 'LP-1', patientName: 'Trần Văn Trễ', time: '08:00 AM', minsLate: 25, phone: '0901 123 456', resolved: false },
  { id: 'LP-2', patientName: 'Nguyễn Thị Lâu', time: '08:30 AM', minsLate: 15, phone: '0902 234 567', resolved: false },
];

const INITIAL_NO_SHOWS: NoShowTask[] = [
  { id: 'NS-1', patientName: 'Lê Quang Lỡ', missedDate: 'Hôm qua, 27/06', service: 'Khám tổng quát', phone: '0903 345 678', resolved: false },
];

const INITIAL_POST_CARE: PostCareTask[] = [
  { id: 'PC-1', patientName: 'Phạm Thu Đau', date: 'Hôm qua, 27/06', service: 'Nhổ răng khôn', phone: '0904 456 789', resolved: false },
  { id: 'PC-2', patientName: 'Vũ Đức Tủy', date: 'Hôm qua, 27/06', service: 'Điều trị tủy răng', phone: '0905 567 890', resolved: false },
];

export const ReceptionistReminders: React.FC = () => {
  const { shiftChangeNotifications, resolveShiftConflict_Update, resolveShiftConflict_Cancel, dentists } = useClinic();
  
  const [hideDoneNotifs, setHideDoneNotifs] = useState(false);
  const [latePatients, setLatePatients] = useState<LatePatientTask[]>(INITIAL_LATE_PATIENTS);
  const [noShows, setNoShows] = useState<NoShowTask[]>(INITIAL_NO_SHOWS);
  const [postCare, setPostCare] = useState<PostCareTask[]>(INITIAL_POST_CARE);
  const [changingDoctorTaskId, setChangingDoctorTaskId] = useState<string | null>(null);

  // ─── Lọc & Tìm kiếm (Filters) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'shift' | 'late' | 'noshow' | 'postcare'>('all');

  // Lọc dữ liệu dựa trên SearchQuery (Tên KH / SĐT)
  const query = searchQuery.toLowerCase();
  
  const filteredShiftNotifs = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'shift') return [];
    return shiftChangeNotifications.map(notif => ({
      ...notif,
      affectedItems: notif.affectedItems.filter(item => 
        item.patientName.toLowerCase().includes(query) || item.patientPhone.includes(query)
      )
    })).filter(notif => notif.affectedItems.length > 0);
  }, [shiftChangeNotifications, taskFilter, query]);

  const filteredLate = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'late') return [];
    return latePatients.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [latePatients, taskFilter, query]);

  const filteredNoShows = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'noshow') return [];
    return noShows.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [noShows, taskFilter, query]);

  const filteredPostCare = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'postcare') return [];
    return postCare.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [postCare, taskFilter, query]);

  const handleResolveLate = (id: string) => setLatePatients(prev => prev.map(p => p.id === id ? { ...p, resolved: true } : p));
  const handleResolveNoShow = (id: string) => setNoShows(prev => prev.map(p => p.id === id ? { ...p, resolved: true } : p));
  const handleResolvePostCare = (id: string) => setPostCare(prev => prev.map(p => p.id === id ? { ...p, resolved: true } : p));

  return (
    <div className="p-stack-lg animate-in fade-in duration-200">

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Tất cả công việc' },
            { id: 'shift', label: 'Đổi ca bác sĩ' },
            { id: 'late', label: 'Khách trễ hẹn' },
            { id: 'noshow', label: 'Khách lỡ hẹn' },
            { id: 'postcare', label: 'Chăm sóc sau khám' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTaskFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                taskFilter === f.id ? 'bg-primary text-white shadow-md' : 'bg-surface-container hover:bg-slate-200 text-on-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm tên KH, SĐT..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* ── SECTION: Thông báo đổi ca bác sĩ (nhất thiết hiển thị trước) ── */}
      {shiftChangeNotifications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="relative">
                <Icon name="notifications_active" className="text-amber-500 text-[22px]" />
                {shiftChangeNotifications.some(n => n.affectedItems.some(i => !i.resolved)) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                )}
              </span>
              Thông báo đổi ca bác sĩ
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {shiftChangeNotifications.filter(n => n.affectedItems.some(i => !i.resolved)).length} chưa xử lý
              </span>
            </h3>
            <button
              onClick={() => setHideDoneNotifs(h => !h)}
              className="text-xs text-on-surface-variant font-bold hover:text-primary cursor-pointer flex items-center gap-1"
            >
              <Icon name={hideDoneNotifs ? 'visibility' : 'visibility_off'} className="text-[14px]" />
              {hideDoneNotifs ? 'Hiển đã xử lý' : 'Ẩn đã xử lý'}
            </button>
          </div>

          {shiftChangeNotifications
            .filter(n => hideDoneNotifs ? n.affectedItems.some(i => !i.resolved) : true)
            .map(notif => {
              const allResolved = notif.affectedItems.every(i => i.resolved);
              const resolvedCount = notif.affectedItems.filter(i => i.resolved).length;
              const totalCount = notif.affectedItems.length;
              const shiftLabel = notif.shiftType === 'Morning' ? 'Ca sáng (08:00–12:00)' :
                notif.shiftType === 'Afternoon' ? 'Ca chiều (14:00–17:00)' : 'Cả ngày';
              const dateFormatted = new Date(notif.shiftDate + 'T00:00:00').toLocaleDateString('vi-VN', {
                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
              });
              return (
                <div
                  key={notif.id}
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    allResolved
                      ? 'border-slate-200 bg-slate-50 opacity-70'
                      : 'border-amber-200 bg-white'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`px-5 py-3.5 flex items-center justify-between ${
                    allResolved ? 'bg-slate-100' : 'bg-amber-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        allResolved ? 'bg-slate-200 text-slate-500' : 'bg-amber-200 text-amber-700'
                      }`}>
                        <Icon name="swap_horiz" className="text-[18px]" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">
                          {notif.originalDentistName.replace('Bác sĩ ', 'BS. ')}
                          <span className="mx-1.5 text-amber-500">→</span>
                          {notif.newDentistName.replace('Bác sĩ ', 'BS. ')}
                        </p>
                        <p className="text-xs text-on-surface-variant">{shiftLabel} · {dateFormatted}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {allResolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full">
                          <Icon name="check_circle" className="text-[13px]" />
                          Hoàn tất
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full animate-pulse">
                          <Icon name="pending" className="text-[13px]" />
                          {resolvedCount}/{totalCount} đã xử lý
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {!allResolved && (
                    <div className="h-1 bg-amber-100">
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Affected appointments list */}
                  <div className="divide-y divide-outline-variant/60">
                    {notif.affectedItems.map((item, idx) => (
                      <div
                        key={item.appointmentId}
                        className={`px-5 py-4 flex items-center gap-4 ${
                          item.resolved ? 'bg-slate-50/50' : 'hover:bg-amber-50/30'
                        } transition-colors`}
                      >
                        {/* Index bubble */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          item.resolved ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Patient info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-on-surface">{item.patientName}</p>
                          <p className="text-xs text-on-surface-variant">{item.time} · {item.serviceName}</p>
                          <a
                            href={`tel:${item.patientPhone.replace(/\s/g, '')}`}
                            className="text-xs text-primary font-bold flex items-center gap-1 mt-0.5 hover:underline"
                          >
                            <Icon name="call" className="text-[12px]" />
                            {item.patientPhone}
                          </a>
                        </div>

                        {/* Action buttons or resolved badge */}
                        {item.resolved ? (
                          <div className="shrink-0 text-right">
                            {item.resolvedAction === 'updated' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1.5 rounded-xl">
                                <Icon name="check_circle" className="text-[13px]" />
                                Đã đổi BS mới
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-error-container text-error px-2.5 py-1.5 rounded-xl">
                                <Icon name="cancel" className="text-[13px]" />
                                Đã hủy lịch
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => resolveShiftConflict_Update(notif.id, item.appointmentId)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <Icon name="check_circle" className="text-[13px]" />
                              Đồng ý — Đổi BS mới
                            </button>
                            <button
                              onClick={() => resolveShiftConflict_Cancel(notif.id, item.appointmentId)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-error text-error hover:bg-error-container rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                            >
                              <Icon name="cancel" className="text-[13px]" />
                              Từ chối — Hủy lịch
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Divider between shift notifs and send reminders */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Gửi nhắc lịch</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>
        </div>
      )}

      {/* ── SECTION: Khách trễ hẹn ── */}
      {filteredLate.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <Icon name="alarm_off" className="text-error" />
            Khách trễ hẹn (Quá 15 phút)
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
                    <a href={`tel:${task.phone.replace(/\s/g, '')}`} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                      <Icon name="call" className="text-[14px]" />
                      Gọi
                    </a>
                    <button onClick={() => handleResolveLate(task.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors text-slate-700">
                      Xong
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION: Khách lỡ hẹn / Hủy lịch ── */}
      {filteredNoShows.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 mt-4">
            <Icon name="event_busy" className="text-amber-500" />
            Khách lỡ hẹn / Hủy lịch
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNoShows.map(task => (
              <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-amber-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-on-surface">{task.patientName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{task.missedDate} • {task.service}</p>
                  </div>
                  {task.resolved && <Icon name="check_circle" className="text-green-500 text-[20px]" />}
                </div>
                {!task.resolved && (
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:${task.phone.replace(/\s/g, '')}`} className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold text-center hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5">
                      <Icon name="call" className="text-[14px]" />
                      Gọi {task.phone}
                    </a>
                    <button onClick={() => handleResolveNoShow(task.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors text-slate-700">
                      Xong
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION: Chăm sóc sau khám ── */}
      {filteredPostCare.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 mt-4">
            <Icon name="healing" className="text-teal-500" />
            Chăm sóc sau điều trị
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPostCare.map(task => (
              <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-teal-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-on-surface">{task.patientName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{task.date} • {task.service}</p>
                  </div>
                  {task.resolved && <Icon name="check_circle" className="text-green-500 text-[20px]" />}
                </div>
                {!task.resolved && (
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:${task.phone.replace(/\s/g, '')}`} className="flex-1 py-2 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold text-center hover:bg-teal-100 transition-colors flex items-center justify-center gap-1.5">
                      <Icon name="call" className="text-[14px]" />
                      Gọi hỏi thăm
                    </a>
                    <button onClick={() => handleResolvePostCare(task.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors text-slate-700">
                      Xong
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trạng thái trống ── */}
      {filteredShiftNotifs.length === 0 && filteredLate.length === 0 && filteredNoShows.length === 0 && filteredPostCare.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
          <Icon name="task_alt" className="text-6xl mb-3 text-slate-300" />
          <p className="font-bold text-base text-slate-500">Tuyệt vời!</p>
          <p className="text-sm mt-1">Không có công việc nào cần xử lý lúc này.</p>
        </div>
      )}
    </div>
  );
};
