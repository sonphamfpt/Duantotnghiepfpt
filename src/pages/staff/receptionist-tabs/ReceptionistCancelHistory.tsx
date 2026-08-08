import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const ReceptionistCancelHistory: React.FC = () => {
  const { appointments } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<'all' | 'auto' | 'manual'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'>('all');

  const todayIso = React.useMemo(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const [customDate, setCustomDate] = useState<string>(todayIso);

  // Helper trích xuất Date chính xác tuyệt đối từ appointment
  const parseAppointmentDate = (appt: any): Date => {
    // 1. Ưu tiên ISO date từ backend
    const rawStr = appt.cancelledAt || appt.createdAt || appt.startTimeIso;
    if (rawStr) {
      const d = new Date(rawStr);
      if (!isNaN(d.getTime())) return d;
    }

    // 2. Parse từ chuỗi định dạng "DD/MM/YYYY @ HH:mm" hoặc "HH:mm"
    if (appt.time) {
      if (appt.time.includes('@')) {
        const parts = appt.time.split('@');
        const dateParts = parts[0].trim().split('/');
        const timeParts = parts[1].trim().split(':');
        if (dateParts.length === 3 && timeParts.length >= 2) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const year = parseInt(dateParts[2], 10);
          const hour = parseInt(timeParts[0], 10);
          const min = parseInt(timeParts[1], 10);
          return new Date(year, month, day, hour, min);
        }
      } else if (/^\d{2}:\d{2}$/.test(appt.time.trim())) {
        const [h, m] = appt.time.trim().split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      }
    }

    return new Date();
  };

  // Helper kiểm tra ngày có nằm trong mốc lọc được chọn hay không
  const isDateInFilter = (dateObj: Date, filter: 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'): boolean => {
    if (filter === 'all') return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 3600 * 24));

    if (filter === 'today') return diffDays === 0;
    if (filter === 'yesterday') return diffDays === 1;
    if (filter === '7days') return diffDays >= 0 && diffDays <= 7;
    if (filter === '30days') return diffDays >= 0 && diffDays <= 30;
    if (filter === 'custom' && customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      const customTarget = new Date(y, m - 1, d).getTime();
      return startOfTarget === customTarget;
    }
    return true;
  };

  // Chỉ lọc ca đã được XÁC NHẬN hủy (Cancelled) — NoShow được xử lý ở tab "Nhắc việc"
  const cancelledByDate = (appointments || []).filter(a => {
    if (!a) return false;
    if (a.status !== 'Cancelled') return false;
    const dateObj = parseAppointmentDate(a);
    return isDateInFilter(dateObj, dateFilter);
  });

  // Thống kê nhanh theo mốc thời gian đang lọc
  const stats = {
    total: cancelledByDate.length,
    auto: cancelledByDate.filter(a => a.cancelReason?.includes('Tự động hủy') || a.cancelReason?.includes('đổi ca')).length,
    manual: cancelledByDate.filter(a => !a.cancelReason?.includes('Tự động hủy') && !a.cancelReason?.includes('đổi ca')).length,
  };

  // Lọc chi tiết danh sách theo lý do & tìm kiếm
  const cancelledAppointments = cancelledByDate
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
      const dateA = parseAppointmentDate(a).getTime();
      const dateB = parseAppointmentDate(b).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getCancelTypeInfo = (reason?: string) => {
    if (reason?.includes('Tự động hủy') || reason?.includes('đổi ca')) {
      return {
        label: 'Tự động hủy',
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

  const formatCancelledAt = (appt?: any) => {
    if (!appt) return 'Không rõ thời gian';
    const dateStr = appt.cancelledAt || appt.createdAt;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    }
    if (appt.time) {
      return appt.time;
    }
    return 'Vừa xong';
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
            Danh sách lịch hẹn đã được <strong>xác nhận hủy</strong> bởi lễ tân hoặc bệnh nhân.
            Bệnh nhân lỡ hẹn (NoShow) được xử lý riêng tại tab <strong>Nhắc việc → Cần CSKH liên hệ</strong>.
          </p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng ca đã xác nhận hủy',
            value: stats.total,
            icon: 'event_busy',
            color: 'text-red-700 bg-red-50 border-red-200',
          },
          {
            label: 'Hủy do bác sĩ đổi ca / nghỉ',
            value: stats.auto,
            icon: 'swap_horiz',
            color: 'text-orange-700 bg-orange-50 border-orange-200',
          },
          {
            label: 'Hủy bởi lễ tân / bệnh nhân',
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

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-slate-50 border border-outline-variant/60 hover:border-slate-400 rounded-xl px-3.5 py-2 text-xs font-bold text-on-surface-variant outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all cursor-pointer shadow-2xs font-headline text-left pr-7"
            >
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="7days">7 ngày trước</option>
              <option value="30days">30 ngày trước</option>
              <option value="custom">Chọn ngày cụ thể...</option>
              <option value="all">Tất cả lịch sử</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 border border-outline-variant/60 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-200 cursor-pointer shadow-2xs"
              />
            )}
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 bg-surface-container hover:bg-slate-200 rounded-xl text-xs font-bold text-on-surface-variant transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant/50 shrink-0"
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
                            Hủy: {formatCancelledAt(appt)}
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
                        Hủy: {formatCancelledAt(appt)}
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
