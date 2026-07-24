import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const ReceptionistCancelHistory: React.FC = () => {
  const { appointments } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<'all' | 'auto' | 'manual'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Lọc lịch hẹn đã bị hủy (Cancelled)
  const cancelledAppointments = appointments
    .filter(a => a.status === 'Cancelled')
    .filter(a => {
      if (filterReason === 'auto') {
        return a.cancelReason?.includes('Tự động hủy') || a.cancelReason?.includes('đổi ca');
      }
      if (filterReason === 'manual') {
        return !a.cancelReason?.includes('Tự động hủy') && !a.cancelReason?.includes('đổi ca');
      }
      return true;
    })
    .filter(a => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0;
      const dateB = b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Thống kê nhanh
  const allCancelled = appointments.filter(a => a.status === 'Cancelled');
  const stats = {
    total: allCancelled.length,
    auto: allCancelled.filter(a => a.cancelReason?.includes('Tự động hủy') || a.cancelReason?.includes('đổi ca')).length,
    manual: allCancelled.filter(a => !a.cancelReason?.includes('Tự động hủy') && !a.cancelReason?.includes('đổi ca')).length,
  };

  const getCancelTypeInfo = (reason?: string) => {
    if (reason?.includes('Tự động hủy') || reason?.includes('đổi ca')) {
      return {
        label: 'Tự động hủy (Đổi ca)',
        color: 'text-orange-700',
        bg: 'bg-orange-50 border-orange-200',
        icon: 'no_accounts',
      };
    }
    return {
      label: 'Hủy thủ công',
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
      icon: 'cancel',
    };
  };

  const formatCancelledAt = (dateStr?: string) => {
    if (!dateStr) return 'Không rõ thời gian';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-stack-lg space-y-6 animate-in fade-in duration-200">
      {/* ── Header ── */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <Icon name="history" className="text-red-600" />
            Lịch sử hủy lịch hẹn
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Theo dõi danh sách bệnh nhân bị hủy lịch do bác sĩ đổi ca/nghỉ hoặc hủy thủ công
          </p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng số ca đã hủy',
            value: stats.total,
            icon: 'event_busy',
            color: 'text-red-700 bg-red-50 border-red-200',
          },
          {
            label: 'Tự động hủy (Do bác sĩ nghỉ/đổi ca)',
            value: stats.auto,
            icon: 'no_accounts',
            color: 'text-orange-700 bg-orange-50 border-orange-200',
          },
          {
            label: 'Hủy thủ công (Bệnh nhân/Lễ tân hủy)',
            value: stats.manual,
            icon: 'cancel',
            color: 'text-slate-700 bg-slate-50 border-slate-200',
          },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
            <Icon name={s.icon} className="text-[28px] shrink-0" />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {[
            { id: 'all', label: `Tất cả (${stats.total})` },
            { id: 'auto', label: `Tự động hủy (${stats.auto})` },
            { id: 'manual', label: `Hủy thủ công (${stats.manual})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterReason(f.id as 'all' | 'auto' | 'manual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterReason === f.id ? 'bg-red-600 text-white shadow-md' : 'bg-surface-container hover:bg-slate-200 text-on-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 bg-surface-container hover:bg-slate-200 rounded-xl text-xs font-bold text-on-surface-variant transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant/50"
            title={sortOrder === 'newest' ? 'Đang sắp xếp: Mới nhất trước' : 'Đang sắp xếp: Cũ nhất trước'}
          >
            <Icon name={sortOrder === 'newest' ? 'arrow_downward' : 'arrow_upward'} className="text-[14px]" />
            {sortOrder === 'newest' ? 'Mới nhất' : 'Cũ nhất'}
          </button>

          {/* Search */}
          <div className="relative w-full md:w-64 shrink-0">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm tên KH, SĐT, Mã lịch hẹn..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Cancelled Appointments List ── */}
      {cancelledAppointments.length > 0 ? (
        <div className="space-y-3">
          {cancelledAppointments.map(appt => {
            const typeInfo = getCancelTypeInfo(appt.cancelReason);
            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Left accent bar */}
                  <div className={`w-1.5 shrink-0 ${
                    appt.cancelReason?.includes('Tự động hủy') ? 'bg-orange-400' : 'bg-red-400'
                  }`} />

                  <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Patient info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeInfo.bg}`}>
                          <Icon name={typeInfo.icon} className={`text-[20px] ${typeInfo.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-on-surface">{appt.patientName}</p>
                            <span className="text-[10px] font-mono text-on-surface-variant bg-slate-100 px-1.5 py-0.5 rounded">{appt.id}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {appt.time} • {appt.serviceName}
                          </p>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-on-surface">{appt.dentistName.replace('Bác sĩ ', 'BS. ')}</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">
                            <Icon name="schedule" className="text-[10px] inline mr-0.5 align-middle" />
                            Hủy: {formatCancelledAt(appt.cancelledAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          appt.cancelReason?.includes('Tự động hủy')
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <Icon name={typeInfo.icon} className="text-[11px]" />
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Cancel reason */}
                    {appt.cancelReason && (
                      <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <Icon name="info" className="text-slate-400 text-[14px] mt-0.5 shrink-0" />
                        <div className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold text-slate-800">Lý do hủy: </span>{appt.cancelReason}
                        </div>
                      </div>
                    )}

                    {/* Mobile: cancel time + dentist */}
                    <div className="sm:hidden mt-2 flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span>{appt.dentistName.replace('Bác sĩ ', 'BS. ')}</span>
                      <span>
                        <Icon name="schedule" className="text-[10px] inline mr-0.5 align-middle" />
                        Hủy: {formatCancelledAt(appt.cancelledAt)}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={`tel:${appt.patientPhone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        <Icon name="call" className="text-[13px]" />
                        {appt.patientPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
          <Icon name="event_available" className="text-6xl mb-3 text-slate-300" />
          <p className="font-bold text-base text-slate-500">Không có lịch hẹn nào bị hủy</p>
          <p className="text-sm mt-1">
            {searchQuery || filterReason !== 'all'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
              : 'Chưa có lịch hẹn nào bị hủy trong hệ thống.'}
          </p>
        </div>
      )}
    </div>
  );
};
