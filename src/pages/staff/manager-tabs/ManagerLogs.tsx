import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { exportToExcel } from '../../../utils/exportToExcel';

interface SystemLog {
  logId: string;
  module: 'RECEPTION' | 'DENTIST' | 'CASHIER' | 'SYSTEM' | 'AUTH';
  logType: 'INFO' | 'SUCCESS' | 'WARN' | 'ERR';
  message: string;
  actorUserId: string | null;
  actorName: string;
  createdAt: string;
}

const MODULE_OPTIONS = ['TẤT CẢ', 'RECEPTION', 'DENTIST', 'CASHIER', 'SYSTEM', 'AUTH'] as const;
const TYPE_OPTIONS = ['TẤT CẢ', 'INFO', 'SUCCESS', 'WARN', 'ERR'] as const;

const getLogTypeMeta = (type: string) => {
  switch (type) {
    case 'SUCCESS': return { color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500', icon: 'check_circle' };
    case 'WARN':    return { color: 'text-amber-700 bg-amber-50 border-amber-200',  dot: 'bg-amber-500',  icon: 'warning' };
    case 'ERR':     return { color: 'text-red-700 bg-red-50 border-red-200',        dot: 'bg-red-500',    icon: 'error' };
    default:        return { color: 'text-blue-700 bg-blue-50 border-blue-200',     dot: 'bg-blue-400',   icon: 'info' };
  }
};

const getModuleMeta = (module: string) => {
  switch (module) {
    case 'RECEPTION': return { color: 'bg-orange-100 text-orange-800', label: 'Tiếp đón' };
    case 'DENTIST':   return { color: 'bg-primary/10 text-primary',    label: 'Bác sĩ' };
    case 'CASHIER':   return { color: 'bg-amber-100 text-amber-800',   label: 'Thu ngân' };
    case 'AUTH':      return { color: 'bg-purple-100 text-purple-800', label: 'Xác thực' };
    default:          return { color: 'bg-slate-100 text-slate-700',   label: 'Hệ thống' };
  }
};

export const ManagerLogs: React.FC = () => {
  // Dùng logs đã load sẵn trong ClinicContext — không cần gọi API riêng
  const { logs: contextLogs, refreshAllData } = useClinic();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('TẤT CẢ');
  const [typeFilter, setTypeFilter] = useState<string>('TẤT CẢ');
  const [dateFilter, setDateFilter] = useState<string>('TODAY');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Map logs từ ClinicContext sang interface SystemLog
  const logs = useMemo(() => {
    return contextLogs.map((l: any) => ({
      logId: l.id || l.logId || '',
      module: l.module || 'SYSTEM',
      logType: l.type || l.logType || 'INFO',
      message: l.message || '',
      actorUserId: l.actorUserId || null,
      actorName: l.actorName || l.actor || '',
      createdAt: l.createdAt || new Date().toISOString(),
    })) as SystemLog[];
  }, [contextLogs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
  };

  // Tính thống kê
  const totalLogs = logs.length;
  const errCount = logs.filter(l => (l.logType || (l as any).type) === 'ERR').length;
  const warnCount = logs.filter(l => (l.logType || (l as any).type) === 'WARN').length;
  const successCount = logs.filter(l => (l.logType || (l as any).type) === 'SUCCESS').length;

  // Lọc
  const filtered = logs.filter(log => {
    const logModule = log.module || 'SYSTEM';
    const logType = log.logType || (log as any).type || 'INFO';
    const actor = log.actorName || (log as any).actor || '';

    const matchModule = moduleFilter === 'TẤT CẢ' || logModule === moduleFilter;
    const matchType = typeFilter === 'TẤT CẢ' || logType === typeFilter;
    const matchSearch = search === '' ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      actor.toLowerCase().includes(search.toLowerCase());

    // Lọc theo ngày
    let matchDate = true;
    const rawTime = log.createdAt || (log as any).time;
    let logMs = 0;
    if (rawTime) {
      if (/^\d{2}:\d{2}:\d{2}$/.test(rawTime)) {
        const todayStr = new Date().toISOString().split('T')[0];
        logMs = new Date(`${todayStr}T${rawTime}`).getTime();
      } else {
        logMs = new Date(rawTime).getTime();
      }
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    if (dateFilter === 'TODAY') {
      matchDate = logMs >= todayStart && logMs <= todayEnd;
    } else if (dateFilter === 'YESTERDAY') {
      const yestStart = todayStart - 24 * 60 * 60 * 1000;
      matchDate = logMs >= yestStart && logMs < todayStart;
    } else if (dateFilter === '7DAYS') {
      const sevenDaysStart = todayStart - 6 * 24 * 60 * 60 * 1000;
      matchDate = logMs >= sevenDaysStart && logMs <= todayEnd;
    } else if (dateFilter === '30DAYS') {
      const thirtyDaysStart = todayStart - 29 * 24 * 60 * 60 * 1000;
      matchDate = logMs >= thirtyDaysStart && logMs <= todayEnd;
    } else if (dateFilter === 'CUSTOM' && customDate) {
      const [cYear, cMonth, cDay] = customDate.split('-').map(Number);
      const customStart = new Date(cYear, cMonth - 1, cDay).getTime();
      const customEnd = customStart + 24 * 60 * 60 * 1000 - 1;
      matchDate = logMs >= customStart && logMs <= customEnd;
    }

    return matchModule && matchType && matchSearch && matchDate;
  });

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = () => setPage(1);

  const formatTime = (input?: string | SystemLog) => {
    if (!input) return '—';
    const raw = typeof input === 'string' ? input : (input.createdAt || (input as any).time);
    if (!raw) return '—';
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) {
      const todayStr = new Date().toLocaleDateString('vi-VN');
      return `${todayStr} ${raw}`;
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const handleExportExcel = () => {
    const exportData = filtered.map((log) => ({
      logId: log.logId,
      createdAt: formatTime(log.createdAt),
      module: log.module,
      logType: log.logType,
      message: log.message,
      actorName: log.actorName || 'Hệ thống',
    }));

    exportToExcel(exportData, 'Nhat_Ky_He_Thong_GoodSmile', {
      logId: 'ID bản ghi',
      createdAt: 'Thời gian',
      module: 'Mô đun',
      logType: 'Loại nhật ký',
      message: 'Nội dung',
      actorName: 'Nhân viên thực hiện',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Nhật Ký Hệ Thống</h2>
          <p className="text-on-surface-variant text-xs font-semibold mt-0.5">
            Theo dõi toàn bộ hoạt động của nhân viên trong hệ thống phòng khám.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-lg bg-green-700 text-white font-label-md flex items-center gap-2 hover:bg-green-800 transition-colors cursor-pointer text-xs font-bold shadow-sm"
          >
            <Icon name="description" className="text-[18px]" />
            Xuất File Excel
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg bg-primary text-white font-label-md flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer text-xs font-bold disabled:opacity-50"
          >
            <Icon name={isRefreshing ? 'progress_activity' : 'refresh'} className={`text-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng bản ghi', value: totalLogs, color: 'border-l-slate-500', textColor: 'text-slate-700', icon: 'receipt_long' },
          { label: 'Thành công', value: successCount, color: 'border-l-green-500', textColor: 'text-green-700', icon: 'check_circle' },
          { label: 'Cảnh báo', value: warnCount, color: 'border-l-amber-500', textColor: 'text-amber-700', icon: 'warning' },
          { label: 'Lỗi hệ thống', value: errCount, color: 'border-l-red-500', textColor: 'text-red-700', icon: 'error' },
        ].map((card) => (
          <div key={card.label} className={`bg-white p-4 rounded-xl border border-outline-variant shadow-sm border-l-4 ${card.color}`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">{card.label}</span>
              <Icon name={card.icon} className={`text-[18px] ${card.textColor}`} />
            </div>
            <p className={`text-2xl font-extrabold mt-2 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
          <input
            type="text"
            placeholder="Tìm theo nội dung log hoặc tên nhân viên..."
            value={search}
            onChange={e => { setSearch(e.target.value); handleFilterChange(); }}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary bg-surface-container-low"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); handleFilterChange(); }}
            className="border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none bg-surface-container-low cursor-pointer"
          >
            <option value="TODAY">Hôm nay</option>
            <option value="YESTERDAY">Hôm qua</option>
            <option value="7DAYS">7 ngày qua</option>
            <option value="30DAYS">30 ngày qua</option>
            <option value="ALL">Tất cả thời gian</option>
            <option value="CUSTOM">Tùy chọn ngày...</option>
          </select>

          {dateFilter === 'CUSTOM' && (
            <input
              type="date"
              value={customDate}
              onChange={e => { setCustomDate(e.target.value); handleFilterChange(); }}
              className="border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none bg-surface-container-low cursor-pointer"
            />
          )}
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <Icon name="filter_list" className="text-outline text-[18px] shrink-0" />
          <select
            value={moduleFilter}
            onChange={e => { setModuleFilter(e.target.value); handleFilterChange(); }}
            className="border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none bg-surface-container-low cursor-pointer"
          >
            {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); handleFilterChange(); }}
          className="border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none bg-surface-container-low cursor-pointer"
        >
          {TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>
              {t === 'TẤT CẢ' ? 'Tất cả loại' : t}
            </option>
          ))}
        </select>

        {/* Result count */}
        <span className="text-xs text-outline font-semibold whitespace-nowrap">
          {filtered.length} kết quả
        </span>
      </div>

      {/* ── Log Table ── */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-outline">
            <Icon name="search_off" className="text-[40px]" />
            <p className="text-sm font-semibold">Không tìm thấy bản ghi nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-outline-variant/50">
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Thời gian</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Module</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Loại</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Nội dung</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Nhân viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {paginated.map((log) => {
                  const typeMeta = getLogTypeMeta(log.logType || (log as any).type);
                  const modMeta = getModuleMeta(log.module);
                  return (
                    <tr key={log.logId || (log as any).id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thời gian */}
                      <td className="px-4 py-3 font-data-mono text-[10px] text-outline whitespace-nowrap">
                        {formatTime(log)}
                      </td>

                      {/* Module */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${modMeta.color}`}>
                          {modMeta.label}
                        </span>
                      </td>

                      {/* Loại log */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${typeMeta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dot}`} />
                          {log.logType}
                        </span>
                      </td>

                      {/* Nội dung */}
                      <td className="px-4 py-3 text-on-surface font-semibold max-w-xs">
                        <span className="line-clamp-2">{log.message}</span>
                      </td>

                      {/* Nhân viên */}
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {log.actorName || <span className="italic text-outline">Hệ thống</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/50 bg-slate-50/50">
            <span className="text-xs text-outline font-semibold">
              Trang {page} / {totalPages} &nbsp;·&nbsp; {filtered.length} bản ghi
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Icon name="chevron_left" className="text-[16px]" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      p === page
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-outline-variant text-on-surface-variant hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Icon name="chevron_right" className="text-[16px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
