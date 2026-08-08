import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const ReceptionistShiftAlerts: React.FC = () => {
  const { shiftChangeNotifications, resolveShiftConflict_Update, resolveShiftConflict_Cancel } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');

  // Đếm tổng số bệnh nhân CHƯA xử lý (tất cả notification)
  const totalPending = useMemo(() => {
    return (shiftChangeNotifications || []).reduce((sum, n) => {
      if (!n.affectedItems) return sum;
      return sum + n.affectedItems.filter(item => !item.resolved).length;
    }, 0);
  }, [shiftChangeNotifications]);

  // Chỉ hiển thị notification còn bệnh nhân chưa xử lý
  // FIX BUG: khi ALL items resolved → ẩn card ngay lập tức
  const pendingNotifs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return (shiftChangeNotifications || []).filter(n => {
      if (!n.affectedItems || n.affectedItems.length === 0) return false;
      // Ẩn card khi TẤT CẢ bệnh nhân đã được xử lý xong
      if (n.affectedItems.every(item => item.resolved)) return false;
      if (!query) return true;
      return (
        n.originalDentistName.toLowerCase().includes(query) ||
        n.newDentistName.toLowerCase().includes(query) ||
        n.affectedItems.some(i =>
          i.patientName.toLowerCase().includes(query) ||
          i.patientPhone.includes(query)
        )
      );
    });
  }, [shiftChangeNotifications, searchQuery]);

  const cleanDoctorName = (name: string) => {
    if (!name) return 'Bác sĩ';
    const cleaned = name.replace(/^(bác sĩ|bs\.?)\s+/ig, '').trim();
    return `BS. ${cleaned}`;
  };

  // Empty state — tất cả đã xử lý xong
  if (totalPending === 0 && !searchQuery) {
    return (
      <div className="p-stack-lg animate-in fade-in duration-200">
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Icon name="check_circle" className="text-5xl text-emerald-500" />
          </div>
          <p className="font-bold text-lg text-slate-700">Tất cả đã xử lý xong!</p>
          <p className="text-sm mt-1 text-slate-400">
            Không có lịch hẹn nào bị ảnh hưởng bởi đổi ca bác sĩ cần xử lý.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-stack-lg space-y-6 animate-in fade-in duration-200">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <Icon name="swap_horiz" className="text-purple-600" />
            Lịch hẹn ảnh hưởng bởi đổi ca
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {totalPending > 0 ? (
              <span className="text-orange-600 font-bold flex items-center gap-1">
                <Icon name="warning" className="text-[16px]" />
                Còn {totalPending} bệnh nhân chưa được xử lý
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Icon name="check_circle" className="text-[16px]" />
                Tất cả đã xử lý xong
              </span>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm tên BS, bệnh nhân, SĐT..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Notification Cards ── */}
      {pendingNotifs.length > 0 ? (
        <div className="flex flex-col gap-5">
          {pendingNotifs.map(notif => {
            const origName = cleanDoctorName(notif.originalDentistName);
            const newName = cleanDoctorName(notif.newDentistName);
            const unresolvedCount = notif.affectedItems.filter(i => !i.resolved).length;

            const shiftTypeInfo = notif.shiftType === 'Morning'
              ? { label: 'Ca Sáng (08:00 - 14:00)', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'wb_sunny' }
              : notif.shiftType === 'Afternoon'
                ? { label: 'Ca Chiều (14:00 - 20:00)', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'wb_twilight' }
                : { label: 'Cả Ngày (08:00 - 20:00)', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'schedule' };

            return (
              <div
                key={notif.id}
                className="p-4 sm:p-5 rounded-2xl border border-purple-200/90 bg-gradient-to-br from-white via-purple-50/20 to-purple-50/40 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Top Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-xl bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                      <Icon name="swap_horiz" className="text-purple-600 text-[16px]" />
                      Yêu cầu Bàn giao / Trực thay
                    </span>
                    {unresolvedCount > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-orange-100 border border-orange-200 text-orange-800 text-xs font-extrabold flex items-center gap-1">
                        <Icon name="hourglass_top" className="text-[14px]" />
                        {unresolvedCount} bệnh nhân chưa xử lý
                      </span>
                    )}
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

                {/* Transfer Visual Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center bg-white p-4 rounded-xl border border-purple-100/90 shadow-2xs">
                  <div className="sm:col-span-3 flex items-center gap-3 p-2.5 bg-purple-50/50 rounded-xl border border-purple-100/60">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      {origName.replace('BS. ', '').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bác sĩ bàn giao</p>
                      <p className="font-extrabold text-sm text-slate-800 truncate">{origName}</p>
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex flex-col items-center justify-center text-purple-600 py-1">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shadow-2xs">
                      <Icon name="arrow_forward" className="text-lg rotate-90 sm:rotate-0" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase tracking-wider">Chuyển</span>
                  </div>
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

                {/* Affected Patients Table */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                      <Icon name="warning" className="text-amber-500 text-[16px]" />
                      Bệnh nhân bị ảnh hưởng ({notif.affectedItems.length}):
                    </p>
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {unresolvedCount} chưa xử lý · {notif.affectedItems.length - unresolvedCount} đã xong
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {notif.affectedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all duration-300 ${item.resolved ? 'opacity-35' : ''}`}
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">
                            {item.patientName}{' '}
                            <span className="font-semibold text-slate-500 text-xs font-mono">({item.patientPhone})</span>
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                            <Icon name="medical_services" className="text-[13px] text-slate-400" />
                            {item.serviceName} · <span className="font-bold text-slate-700">{item.time}</span>
                          </p>
                        </div>
                        {item.resolved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
                            <Icon name="check_circle" className="text-emerald-600 text-[15px]" />
                            {item.resolvedAction === 'cancelled' ? 'Đã hủy lịch' : `Đã chuyển → ${newName}`}
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400">
          <Icon name="search_off" className="text-5xl mb-3 text-slate-300" />
          <p className="font-bold text-slate-500">Không tìm thấy kết quả phù hợp</p>
          <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm.</p>
        </div>
      )}
    </div>
  );
};
