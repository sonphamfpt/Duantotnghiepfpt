import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const { dentists, shiftChangeNotifications } = useClinic();
  
  const filteredShiftNotifs = useMemo(() => {
    return (shiftChangeNotifications || []).filter(n =>
      n.affectedItems.some(item => !item.resolved)
    );
  }, [shiftChangeNotifications]);

  const [hideDoneNotifs, setHideDoneNotifs] = useState(false);
  const [latePatients, setLatePatients] = useState<LatePatientTask[]>(INITIAL_LATE_PATIENTS);
  const [noShows, setNoShows] = useState<NoShowTask[]>(INITIAL_NO_SHOWS);
  const [postCare, setPostCare] = useState<PostCareTask[]>(INITIAL_POST_CARE);
  const [changingDoctorTaskId, setChangingDoctorTaskId] = useState<string | null>(null);

  // ─── Lọc & Tìm kiếm (Filters) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = (searchParams.get('subTab') || 'all') as 'all' | 'late' | 'noshow' | 'postcare';

  const setTaskFilter = (val: 'all' | 'late' | 'noshow' | 'postcare') => {
    setSearchParams(prev => {
      prev.set('subTab', val);
      return prev;
    });
  };

  // Lọc dữ liệu dựa trên SearchQuery (Tên KH / SĐT)
  const query = searchQuery.toLowerCase();

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
