import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { Appointment, ShiftChangeNotification, ClinicLog } from '../../../types/clinic';

type TimeFilter = 'today' | 'yesterday' | '7days' | '30days' | 'all';
type CategoryTab = 'cancelled' | 'completed' | 'shifts';

export const ReceptionistHistory: React.FC = () => {
  const { appointments, shiftChangeNotifications, logs, dentists, queue } = useClinic();

  // Active Category & Filters
  const [activeTab, setActiveTab] = useState<CategoryTab>('cancelled');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDentist, setSelectedDentist] = useState<string>('all');
  const [cancelTypeFilter, setCancelTypeFilter] = useState<string>('all');

  // Helper: Parse appointment date safely
  const parseAppointmentDate = (timeStr: string): Date => {
    const now = new Date();
    if (!timeStr) return now;

    if (timeStr.includes('@')) {
      const [datePart, timePart] = timeStr.split('@').map(s => s.trim());
      const parts = datePart.split('/').map(Number);
      const times = timePart ? timePart.split(':').map(Number) : [0, 0];
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0], times[0] || 0, times[1] || 0);
      }
    } else if (timeStr.includes('/')) {
      const parts = timeStr.split('/').map(Number);
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } else if (timeStr.includes(':')) {
      const [hh, min] = timeStr.split(':').map(Number);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 0, min || 0);
    }
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? now : d;
  };

  // Helper: Match date with selected time filter
  const isDateInFilter = (dateObj: Date, filter: TimeFilter): boolean => {
    if (filter === 'all') return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 3600 * 24));

    if (filter === 'today') return diffDays === 0;
    if (filter === 'yesterday') return diffDays === 1;
    if (filter === '7days') return diffDays >= 0 && diffDays <= 7;
    if (filter === '30days') return diffDays >= 0 && diffDays <= 30;
    return true;
  };

  // Helper: Detect who cancelled
  const getCancelCategory = (reason?: string) => {
    if (!reason) return { label: 'Bệnh nhân tự hủy', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'person_off' };
    const r = reason.toLowerCase();
    if (r.includes('tự động') || r.includes('15 phút') || r.includes('trễ')) {
      return { label: 'Tự động hủy (Trễ 15p)', badge: 'bg-red-100 text-red-800 border-red-200', icon: 'timer_off' };
    }
    if (r.includes('lễ tân') || r.includes('tiếp đón') || r.includes('nhân viên')) {
      return { label: 'Lễ tân hủy', badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'support_agent' };
    }
    return { label: 'Bệnh nhân tự hủy', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'person_off' };
  };

  // Filtered Cancelled Appointments
  const cancelledAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'Cancelled') return false;
      const apptDate = parseAppointmentDate(a.time);
      if (!isDateInFilter(apptDate, timeFilter)) return false;

      if (selectedDentist !== 'all' && a.dentistId !== selectedDentist) return false;

      if (cancelTypeFilter !== 'all') {
        const cat = getCancelCategory(a.cancelReason);
        if (cancelTypeFilter === 'patient' && !cat.label.includes('Bệnh nhân')) return false;
        if (cancelTypeFilter === 'reception' && !cat.label.includes('Lễ tân')) return false;
        if (cancelTypeFilter === 'auto' && !cat.label.includes('Tự động')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.patientName.toLowerCase().includes(q);
        const matchPhone = a.patientPhone.includes(q);
        const matchDentist = a.dentistName.toLowerCase().includes(q);
        const matchReason = (a.cancelReason || '').toLowerCase().includes(q);
        const matchService = a.serviceName.toLowerCase().includes(q);
        return matchName || matchPhone || matchDentist || matchReason || matchService;
      }

      return true;
    });
  }, [appointments, timeFilter, selectedDentist, cancelTypeFilter, searchQuery]);

  // Filtered Completed Appointments
  const completedAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'Completed') return false;
      const apptDate = parseAppointmentDate(a.time);
      if (!isDateInFilter(apptDate, timeFilter)) return false;
      if (selectedDentist !== 'all' && a.dentistId !== selectedDentist) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.patientName.toLowerCase().includes(q);
        const matchPhone = a.patientPhone.includes(q);
        const matchDentist = a.dentistName.toLowerCase().includes(q);
        const matchService = a.serviceName.toLowerCase().includes(q);
        return matchName || matchPhone || matchDentist || matchService;
      }

      return true;
    });
  }, [appointments, timeFilter, selectedDentist, searchQuery]);

  // Filtered Doctor Shift Changes & Logs
  const filteredShiftChanges = useMemo(() => {
    const notifs = shiftChangeNotifications.filter(n => {
      const d = n.createdAt ? new Date(n.createdAt) : (n.shiftDate ? new Date(n.shiftDate) : new Date());
      if (!isDateInFilter(d, timeFilter)) return false;

      if (selectedDentist !== 'all') {
        if (n.originalDentistId !== selectedDentist && n.newDentistId !== selectedDentist) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrig = n.originalDentistName.toLowerCase().includes(q);
        const matchNew = n.newDentistName.toLowerCase().includes(q);
        return matchOrig || matchNew;
      }

      return true;
    });

    const shiftLogs = logs.filter(l => {
      const isShiftMsg = l.message.toLowerCase().includes('ca') ||
                         l.message.toLowerCase().includes('đổi') ||
                         l.message.toLowerCase().includes('hủy') ||
                         l.message.toLowerCase().includes('bác sĩ');
      if (!isShiftMsg) return false;

      if (searchQuery.trim()) {
        return l.message.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    return { notifs, shiftLogs };
  }, [shiftChangeNotifications, logs, timeFilter, selectedDentist, searchQuery]);

  // Summary Counters
  const totalCancelledCount = useMemo(() => {
    return appointments.filter(a => a.status === 'Cancelled' && isDateInFilter(parseAppointmentDate(a.time), timeFilter)).length;
  }, [appointments, timeFilter]);

  const totalCompletedCount = useMemo(() => {
    return appointments.filter(a => a.status === 'Completed' && isDateInFilter(parseAppointmentDate(a.time), timeFilter)).length;
  }, [appointments, timeFilter]);

  const totalShiftChangesCount = useMemo(() => {
    return shiftChangeNotifications.filter(n => {
      const d = n.createdAt ? new Date(n.createdAt) : new Date();
      return isDateInFilter(d, timeFilter);
    }).length;
  }, [shiftChangeNotifications, timeFilter]);

  return (
    <div className="p-container-padding-desktop space-y-6 animate-in fade-in duration-200 font-sans">
      
      {/* ── HEADER BANNER ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="history" className="text-2xl" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">Lịch sử Tiếp đón &amp; Nhật ký Phòng khám</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tra cứu chi tiết lịch hẹn đã hủy, bệnh nhân đã khám và lịch sử đổi/hủy ca làm việc của Bác sĩ.
            </p>
          </div>
        </div>

        {/* TIME FILTER BUTTONS */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 gap-1 overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'yesterday', label: 'Hôm qua' },
            { id: '7days', label: '7 ngày qua' },
            { id: '30days', label: '30 ngày qua' },
            { id: 'all', label: 'Tất cả' },
          ].map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeFilter(tf.id as TimeFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                timeFilter === tf.id
                  ? 'bg-white text-primary shadow-sm border border-primary/20 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI STATS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Hủy lịch */}
        <div 
          onClick={() => setActiveTab('cancelled')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'cancelled'
              ? 'bg-red-50/60 border-red-300 shadow-md ring-2 ring-red-400/20'
              : 'bg-white border-outline-variant hover:border-red-200'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-400">Lịch hẹn bị hủy</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Icon name="event_busy" className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">{totalCancelledCount}</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Icon name="info" className="text-xs text-red-500" />
            {timeFilter === 'today' ? 'Trong hôm nay' : timeFilter === 'yesterday' ? 'Trong ngày hôm qua' : timeFilter === '7days' ? 'Trong 7 ngày qua' : timeFilter === '30days' ? 'Trong 30 ngày qua' : 'Toàn bộ hệ thống'}
          </p>
        </div>

        {/* Card 2: Khám thành công */}
        <div 
          onClick={() => setActiveTab('completed')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-50/60 border-emerald-300 shadow-md ring-2 ring-emerald-400/20'
              : 'bg-white border-outline-variant hover:border-emerald-200'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-400">Đã khám hoàn tất</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Icon name="task_alt" className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalCompletedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Icon name="check_circle" className="text-xs text-emerald-500" />
            {timeFilter === 'today' ? 'Trong hôm nay' : timeFilter === 'yesterday' ? 'Trong ngày hôm qua' : timeFilter === '7days' ? 'Trong 7 ngày qua' : timeFilter === '30days' ? 'Trong 30 ngày qua' : 'Toàn bộ hệ thống'}
          </p>
        </div>

        {/* Card 3: Bác sĩ đổi ca / Hủy ca */}
        <div 
          onClick={() => setActiveTab('shifts')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'shifts'
              ? 'bg-amber-50/60 border-amber-300 shadow-md ring-2 ring-amber-400/20'
              : 'bg-white border-outline-variant hover:border-amber-200'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-400">Bác sĩ Đổi / Hủy ca</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Icon name="swap_horiz" className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{totalShiftChangesCount}</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Icon name="notifications_active" className="text-xs text-amber-500" />
            Lịch đổi / chuyển giao ca làm việc
          </p>
        </div>

      </div>

      {/* ── CATEGORY TAB SWITCHER & SEARCH FILTERS ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm space-y-4">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'cancelled'
                  ? 'bg-white text-red-600 shadow-sm border border-red-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="event_busy" className="text-sm" />
              Lịch sử Hủy lịch ({cancelledAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="task_alt" className="text-sm" />
              Lịch sử Đã khám ({completedAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'shifts'
                  ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="swap_horiz" className="text-sm" />
              Lịch sử BS Đổi/Hủy ca ({filteredShiftChanges.notifs.length})
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Icon name="search" className="absolute left-3 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Tìm tên BN, sđt, bác sĩ, lý do..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <Icon name="close" className="text-xs" />
                </button>
              )}
            </div>

            {/* Doctor Filter */}
            <select
              value={selectedDentist}
              onChange={e => setSelectedDentist(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả Bác sĩ</option>
              {dentists.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Cancellation Type Filter (Only for Cancelled tab) */}
            {activeTab === 'cancelled' && (
              <select
                value={cancelTypeFilter}
                onChange={e => setCancelTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả loại hủy</option>
                <option value="patient">Bệnh nhân tự hủy</option>
                <option value="reception">Lễ tân hủy</option>
                <option value="auto">Tự động hủy (Trễ 15p)</option>
              </select>
            )}
          </div>
        </div>

        {/* ── TAB CONTENT 1: LỊCH SỬ HỦY LỊCH ── */}
        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Bệnh nhân</th>
                    <th className="px-4 py-3">Lịch hẹn &amp; Dịch vụ</th>
                    <th className="px-4 py-3">Bác sĩ phụ trách</th>
                    <th className="px-4 py-3">Phân loại hủy</th>
                    <th className="px-4 py-3">Lý do hủy chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {cancelledAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                        <Icon name="event_available" className="text-4xl block mx-auto mb-2 opacity-40 text-emerald-500" />
                        Không có lịch hẹn bị hủy nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    cancelledAppointments.map(appt => {
                      const cancelCat = getCancelCategory(appt.cancelReason);
                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-800">{appt.patientName}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{appt.patientPhone}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-primary">{appt.serviceName}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Icon name="schedule" className="text-xs text-slate-400" />
                              {appt.time}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-700">{appt.dentistName}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cancelCat.badge}`}>
                              <Icon name={cancelCat.icon} className="text-xs" />
                              {cancelCat.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="text-slate-700 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px] leading-relaxed">
                              {appt.cancelReason || 'Không ghi nhận lý do'}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT 2: LỊCH SỬ ĐÃ KHÁM ── */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Bệnh nhân</th>
                    <th className="px-4 py-3">Thời gian &amp; Dịch vụ</th>
                    <th className="px-4 py-3">Bác sĩ khám</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {completedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400 italic">
                        <Icon name="medical_services" className="text-4xl block mx-auto mb-2 opacity-40 text-slate-400" />
                        Không tìm thấy lượt khám hoàn tất nào trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    completedAppointments.map(appt => (
                      <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-800">{appt.patientName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{appt.patientPhone}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{appt.serviceName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Icon name="event" className="text-xs text-slate-400" />
                            {appt.time}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-700">{appt.dentistName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Icon name="check_circle" className="text-xs text-emerald-600" />
                            Khám hoàn tất
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT 3: LỊCH SỬ BÁC SĨ ĐỔI CA / HỦY CA ── */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            
            {/* Shift Change Requests List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Icon name="swap_horiz" className="text-primary text-sm" />
                Lịch sử Hoán đổi &amp; Chuyển giao ca trực của Bác sĩ
              </h4>

              {filteredShiftChanges.notifs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs italic">
                  Không có lịch sử đổi ca bác sĩ nào trong mốc thời gian đã chọn.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredShiftChanges.notifs.map(n => {
                    const createdStr = n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : n.shiftDate;
                    const shiftTypeLabel = n.shiftType === 'Morning' ? 'Ca Sáng' : n.shiftType === 'Afternoon' ? 'Ca Chiều' : 'Ca Cả Ngày';

                    const cleanDoctorName = (name: string) => {
                      if (!name) return 'Bác sĩ';
                      const cleaned = name.replace(/^(bác sĩ|bs\.?)\s+/ig, '').trim();
                      return `BS. ${cleaned}`;
                    };

                    return (
                      <div key={n.id} className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/50 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                              <Icon name="swap_horiz" className="text-lg" />
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">
                                {cleanDoctorName(n.originalDentistName)} <span className="text-amber-600 font-black">➔</span> {cleanDoctorName(n.newDentistName)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                Ca trực ngày <strong>{n.shiftDate}</strong> ({shiftTypeLabel})
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Khởi tạo: {createdStr}
                          </span>
                        </div>

                        {/* Affected appointments */}
                        {n.affectedItems && n.affectedItems.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <Icon name="warning" className="text-xs text-amber-600" />
                              Lịch hẹn bị ảnh hưởng ({n.affectedItems.length} bệnh nhân):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {n.affectedItems.map((item, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-extrabold text-slate-800">{item.patientName}</p>
                                    <p className="text-[10px] text-slate-500">{item.time} · {item.serviceName}</p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    item.resolvedAction === 'updated' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : item.resolvedAction === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {item.resolvedAction === 'updated' ? 'Đã đổi BS' : item.resolvedAction === 'cancelled' ? 'Đã hủy' : 'Chờ lễ tân'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


          </div>
        )}

      </div>

    </div>
  );
};
