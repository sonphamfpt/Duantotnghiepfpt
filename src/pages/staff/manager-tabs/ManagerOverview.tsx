import React, { useMemo, useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { exportToExcel } from '../../../utils/exportToExcel';

export const ManagerOverview: React.FC = () => {
  const { queue, invoices, appointments, logs } = useClinic();

  // ── Đồng hồ real-time cho widget live log ──────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayLabel = now.toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Tính todayStart/End một lần (chỉ thay đổi khi qua ngày mới)
  // Không đưa `now` vào dep của todayLogs để tránh re-filter mỗi giây
  const todayStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lọc log của ngày hôm nay — chỉ re-run khi logs thay đổi
  const todayLogs = useMemo(() => {
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    return logs.filter(log => {
      const isoTime = log.createdAt;
      if (isoTime) {
        const ms = new Date(isoTime).getTime();
        if (!isNaN(ms)) {
          return ms >= todayStart && ms <= todayEnd;
        }
      }
      // Fallback: nếu log có time (HH:MM:SS) thì giữ nguyên để hiển thị
      return !!log.time;
    });
  }, [logs, todayStart]);
  // ───────────────────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    const exportData = invoices.map((i) => ({
      id: i.id,
      patientName: i.patientName,
      patientPhone: i.patientPhone,
      totalPrice: i.totalPrice,
      netPrice: i.netPrice,
      status: i.status === 'Paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
      createdAt: new Date(i.createdAt).toLocaleString('vi-VN'),
    }));

    exportToExcel(exportData, 'Bao_Cao_Tong_Quan_GoodSmile', {
      id: 'Mã hóa đơn',
      patientName: 'Tên bệnh nhân',
      patientPhone: 'Số điện thoại',
      totalPrice: 'Tổng tiền (VND)',
      netPrice: 'Thực thu (VND)',
      status: 'Trạng thái',
      createdAt: 'Ngày tạo',
    });
  };

  // Calculations
  const totalRevenue = invoices.filter((i) => i.status === 'Paid').reduce((sum, item) => sum + item.netPrice, 0);
  const activeQueueCount = queue.filter((q) => q.status !== 'Completed').length;

  // Hóa đơn Pending quá 24h tính là "quá hạn"
  const overdueCount = React.useMemo(() => {
    const now = Date.now();
    return invoices.filter((i) => {
      if (i.status !== 'Pending') return false;
      const createdMs = new Date(i.createdAt).getTime();
      return (now - createdMs) > 24 * 60 * 60 * 1000;
    }).length;
  }, [invoices]);

  // Thời gian chờ trung bình từ queue thực tế
  const waitingQueue = queue.filter((q) => q.status === 'Waiting');
  const avgQueueWait = waitingQueue.length > 0
    ? Math.round(waitingQueue.reduce((sum, q) => sum + q.waitTimeMin, 0) / waitingQueue.length)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Tổng Quan Phòng Khám</h2>
          <p className="text-on-surface-variant text-xs font-semibold">
            Giám sát hiệu suất vận hành và tình trạng phần mềm hệ thống.
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
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-primary text-white font-label-md flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer text-xs font-bold shadow-sm"
          >
            <Icon name="print" className="text-[18px]" />
            In Báo Cáo
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-outline-variant flex flex-col justify-between h-32 shadow-sm border-l-4 border-l-purple-600">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Hệ thống mạng</span>
            <Icon name="terminal" className="text-purple-600" />
          </div>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">99.98%</p>
            <p className="text-[10px] text-secondary font-bold flex items-center gap-0.5">
              <Icon name="trending_up" className="text-[12px]" /> Mọi máy trạm trực tuyến
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-outline-variant flex flex-col justify-between h-32 shadow-sm border-l-4 border-l-error">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Hóa Đơn Chờ</span>
            <Icon name="receipt_long" className="text-error" />
          </div>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">
              {invoices.filter((i) => i.status === 'Pending').length} HĐ
            </p>
            <p className="text-[10px] text-error font-bold flex items-center gap-0.5">
              <Icon name="warning" className="text-[12px]" /> {overdueCount} Quá hạn thu phí
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-outline-variant flex flex-col justify-between h-32 shadow-sm border-l-4 border-l-secondary">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Tổng Doanh Thu</span>
            <Icon name="payments" className="text-secondary" />
          </div>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">₫{totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-secondary font-bold flex items-center gap-0.5">
              <Icon name="check_circle" className="text-[12px]" /> Đã ghi nhận thực thu
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-outline-variant flex flex-col justify-between h-32 shadow-sm border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Lượng khám hôm nay</span>
            <Icon name="timer" className="text-orange-500" />
          </div>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">{activeQueueCount} Ca chờ</p>
            <p className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5">
              <Icon name="schedule" className="text-[12px]" />
              {avgQueueWait > 0 ? `Chờ trung bình: ${avgQueueWait} phút` : 'Không có ca chờ'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts & System Log Console */}
      <div className="grid grid-cols-12 gap-6 min-h-[480px]">
        {/* Visual Charts */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-outline-variant p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Biểu Đồ Lượt Khám Tuần</h3>
              <p className="text-xs text-outline font-semibold">Tải lượng hoạt động của các buồng ghế khám (7 ngày gần nhất)</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary block"></span> Lịch hẹn
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-accent-pink">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-pink block"></span> Hóa đơn phát sinh
              </span>
            </div>
          </div>

          {(() => {
            const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const today = new Date();
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (6 - i));
              return d;
            });

            const weekBars = weekDays.map((day) => {
              const dayStr = day.toDateString();

              // Tính số appointments trong ngày này
              const apptCount = appointments.filter((a) => {
                if (!a.time) return false;
                try {
                  return new Date(a.time).toDateString() === dayStr;
                } catch {
                  return false;
                }
              }).length;

              // Tính số hóa đơn phát sinh trong ngày này
              const invCount = invoices.filter((inv) => {
                if (!inv.createdAt) return false;
                try {
                  return new Date(inv.createdAt).toDateString() === dayStr;
                } catch {
                  return false;
                }
              }).length;

              return {
                label: DAY_LABELS[day.getDay()],
                apptCount,
                invCount,
              };
            });

            const maxVal = Math.max(...weekBars.flatMap((b) => [b.apptCount, b.invCount]), 1);

            return (
              <div className="flex-1 w-full flex items-end gap-3 pb-4 relative h-60">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-4">
                  <div className="border-t border-outline-variant/30 w-full"></div>
                  <div className="border-t border-outline-variant/30 w-full"></div>
                  <div className="border-t border-outline-variant/30 w-full"></div>
                  <div className="border-t border-outline-variant/30 w-full"></div>
                </div>
                {weekBars.map((bar, idx) => {
                  const pct1 = Math.round((bar.apptCount / maxVal) * 100);
                  const pct2 = Math.round((bar.invCount / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex gap-1 items-end h-full">
                        <div
                          className="flex-1 bg-primary/70 rounded-t group relative cursor-pointer hover:bg-primary transition-all"
                          style={{ height: `${Math.max(pct1, 6)}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-inverse-surface text-white text-[8px] px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                            {bar.apptCount} lịch hẹn
                          </div>
                        </div>
                        <div
                          className="flex-1 bg-accent-pink/70 rounded-t group relative cursor-pointer hover:bg-accent-pink transition-all"
                          style={{ height: `${Math.max(pct2, 6)}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-inverse-surface text-white text-[8px] px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                            {bar.invCount} hóa đơn
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-outline font-bold mt-1">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Live Logs Terminal */}
        <div className="col-span-12 lg:col-span-5 bg-inverse-surface text-inverse-on-surface rounded-xl p-6 overflow-hidden flex flex-col justify-between shadow-lg border border-slate-800 h-[420px]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="font-bold text-xs uppercase text-white tracking-widest flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              Nhật Ký Live
            </h3>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-data-mono text-[9px] text-green-400 font-bold">AUTO SYNC</span>
              <span className="font-data-mono text-[9px] text-outline">{todayLabel}</span>
            </div>
          </div>

          <div className="flex-1 font-data-mono text-[10px] space-y-2.5 text-primary-fixed-dim/80 overflow-y-auto pr-2 custom-scrollbar my-2">
            {todayLogs.length > 0 ? (
              todayLogs.map((log) => {
                let typeColor = 'text-white/80';
                if (log.type === 'SUCCESS') typeColor = 'text-green-400';
                else if (log.type === 'WARN') typeColor = 'text-yellow-400';
                else if (log.type === 'ERR') typeColor = 'text-red-400';

                return (
                  <p key={log.id} className="leading-relaxed border-b border-white/5 pb-1">
                    <span className="text-secondary-fixed">[{(log as any).time || new Date((log as any).createdAt).toLocaleTimeString('vi-VN')}]</span>{' '}
                    <span className="font-bold text-white">[{log.module}]</span>{' '}
                    <span className={typeColor}>{log.message}</span>
                  </p>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-outline">
                <Icon name="event_busy" className="text-[28px] opacity-40" />
                <p className="italic text-center text-[10px] opacity-60">Chưa có hoạt động nào hôm nay.<br />{todayLabel}</p>
              </div>
            )}
          </div>

          <div className="mt-1 pt-2.5 border-t border-outline-variant/20 text-[9px] text-outline leading-normal shrink-0">
            Hệ thống đang giám sát thời gian thực các hành động Đón tiếp khách hàng, Lập bệnh án lâm sàng và Thu phí thanh toán.
          </div>
        </div>
      </div>
    </div>
  );
};
