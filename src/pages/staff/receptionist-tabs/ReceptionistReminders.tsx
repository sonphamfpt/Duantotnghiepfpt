import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

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
}


export const ReceptionistReminders: React.FC = () => {
  const { appointments, queue, shiftChangeNotifications } = useClinic();
  
  const filteredShiftNotifs = useMemo(() => {
    return (shiftChangeNotifications || []).filter(n =>
      n.affectedItems.some(item => !item.resolved)
    );
  }, [shiftChangeNotifications]);

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

  const handleResolve = (id: string) => {
    const next = [...resolvedIds, id];
    setResolvedIds(next);
    localStorage.setItem('goodsmile_resolved_reminders', JSON.stringify(next));
  };

  // 1. Late patients today
  const latePatientsList = useMemo(() => {
    const list: LatePatientTask[] = [];
    const now = new Date();
    
    for (const a of appointments) {
      if (a.status !== 'Confirmed') continue;
      
      // Check if resolved
      if (resolvedIds.includes(a.id)) continue;
      
      // Determine if today
      const isToday = !a.time.includes('@') || a.time.split('@')[0].trim() === todayStr;
      if (!isToday) continue;
      
      let timeStr = a.time;
      if (a.time.includes('@')) {
        timeStr = a.time.split('@')[1].trim();
      }
      
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
      
      const diffMins = Math.floor((now.getTime() - apptTime.getTime()) / 60000);
      
      // Check if not checked in
      const checkedIn = queue.some(q => q.patientId === a.patientId && q.status !== 'Completed');
      
      if (diffMins >= 15 && !checkedIn) {
        list.push({
          id: a.id,
          patientName: a.patientName,
          time: timeStr,
          minsLate: diffMins,
          phone: a.patientPhone,
          resolved: false,
        });
      }
    }
    return list;
  }, [appointments, queue, todayStr, resolvedIds]);

  // 2. Cancelled or missed (past confirmed) appointments
  const noShowsList = useMemo(() => {
    const list: NoShowTask[] = [];
    
    for (const a of appointments) {
      if (resolvedIds.includes(a.id)) continue;
      
      const isCancelled = a.status === 'Cancelled';
      let isMissedPast = false;
      
      if (a.status === 'Confirmed' && a.time.includes('@')) {
        const datePart = a.time.split('@')[0].trim();
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts.map(Number);
          const apptDate = new Date(y, m - 1, d);
          if (apptDate.getTime() < todayMidnight.getTime()) {
            isMissedPast = true;
          }
        }
      }
      
      if (isCancelled || isMissedPast) {
        list.push({
          id: a.id,
          patientName: a.patientName,
          missedDate: a.time.includes('@') ? a.time.split('@')[0].trim() : 'Hôm qua',
          service: a.serviceName,
          phone: a.patientPhone,
          resolved: false,
        });
      }
    }
    return list;
  }, [appointments, todayMidnight, resolvedIds]);


  // ─── Lọc & Tìm kiếm (Filters) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = (searchParams.get('subTab') || 'all') as 'all' | 'late' | 'noshow';

  const setTaskFilter = (val: 'all' | 'late' | 'noshow') => {
    setSearchParams(prev => {
      prev.set('subTab', val);
      return prev;
    });
  };

  // Lọc dữ liệu dựa trên SearchQuery (Tên KH / SĐT)
  const query = searchQuery.toLowerCase();

  const filteredLate = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'late') return [];
    return latePatientsList.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [latePatientsList, taskFilter, query]);

  const filteredNoShows = useMemo(() => {
    if (taskFilter !== 'all' && taskFilter !== 'noshow') return [];
    return noShowsList.filter(p => p.patientName.toLowerCase().includes(query) || p.phone.includes(query));
  }, [noShowsList, taskFilter, query]);

  const handleResolveLate = (id: string) => handleResolve(id);
  const handleResolveNoShow = (id: string) => handleResolve(id);

  return (
    <div className="p-stack-lg animate-in fade-in duration-200">

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Tất cả công việc' },
            { id: 'late', label: 'Khách trễ hẹn' },
            { id: 'noshow', label: 'Khách lỡ hẹn' },
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

      {/* ── Trạng thái trống ── */}
      {filteredShiftNotifs.length === 0 && filteredLate.length === 0 && filteredNoShows.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
          <Icon name="task_alt" className="text-6xl mb-3 text-slate-300" />
          <p className="font-bold text-base text-slate-500">Tuyệt vời!</p>
          <p className="text-sm mt-1">Không có công việc nào cần xử lý lúc này.</p>
        </div>
      )}
    </div>
  );
};
