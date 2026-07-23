import React, { useState } from 'react';
import { Icon } from '../../components/Icon';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { BookingModal } from '../../components/BookingModal';
import { CheckInModal } from '../../components/CheckInModal';

// Tab imports
import { ReceptionistQueue } from './receptionist-tabs/ReceptionistQueue';
import { ReceptionistAppointments } from './receptionist-tabs/ReceptionistAppointments';
import { ReceptionistReminders } from './receptionist-tabs/ReceptionistReminders';
import { ReceptionistCancelHistory } from './receptionist-tabs/ReceptionistCancelHistory';


// ─── Home: Bàn tiếp nhận ──────────────────────────────────────────────────────
const ReceptionistHome: React.FC = () => {
  const { queue, appointments, dentists, shiftChangeNotifications } = useClinic();
  const navigate = useNavigate();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const [now] = useState(new Date());
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dayStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // KPI
  const waitingCount = queue.filter(q => q.status === 'Waiting').length;
  const inChairCount = queue.filter(q => q.status === 'In Chair').length;
  const completedToday = queue.filter(q => q.status === 'Completed').length;

  const todayDateStr = new Date().toLocaleDateString('vi-VN');
  const todayAppointments = appointments.filter(a => {
    const timeDate = a.time.includes('@') ? a.time.split('@')[0].trim() : todayDateStr;
    return timeDate === todayDateStr;
  });

  const confirmedAppts = todayAppointments.filter(a => a.status === 'Confirmed');
  const avgWait = waitingCount > 0
    ? (queue.filter(q => q.status === 'Waiting').reduce((s, q) => s + q.waitTimeMin, 0) / waitingCount).toFixed(0)
    : '0';

  return (
    <div className="p-container-padding-desktop space-y-6 animate-in fade-in duration-200">

      {/* ── Hero Banner ── */}
      <div className="premium-glow rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm opacity-75">{dayStr}</p>
          <h2 className="font-headline-lg text-headline-lg mt-1">{greeting}, Lễ tân! 👋</h2>
          <p className="text-sm opacity-80 mt-1">
            Hôm nay có <strong>{todayAppointments.length}</strong> lịch hẹn •{' '}
            <strong>{waitingCount}</strong> bệnh nhân đang chờ •{' '}

          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Icon name="support_agent" className="text-[130px]" />
        </div>
      </div>

      {/* ── Shift Change Alert Banner ── */}
      {(() => {
        const pendingNotifs = shiftChangeNotifications.filter(n =>
          n.affectedItems.some(item => !item.resolved)
        );
        const pendingCount = pendingNotifs.reduce(
          (sum, n) => sum + n.affectedItems.filter(item => !item.resolved).length, 0
        );
        if (pendingNotifs.length === 0) return null;
        return (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg shadow-amber-200/50">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Icon name="notifications_active" className="text-[22px]" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black animate-bounce">
                {pendingCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">
                Có {pendingCount} lịch hẹn cần xử lý do đổi ca bác sĩ
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {pendingNotifs.map(n => `${n.originalDentistName.replace('Bác sĩ ', 'BS. ')} → ${n.newDentistName.replace('Bác sĩ ', 'BS. ')}`).join(' · ')}
              </p>
            </div>
            <button
              onClick={() => navigate('?tab=reminders')}
              className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              Xem &amp; Xử lý
              <Icon name="chevron_right" className="text-[16px]" />
            </button>
          </div>
        );
      })()}

      {/* ── 2 Action Buttons Primary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          id="btn-checkin-home"
          onClick={() => setShowCheckInModal(true)}
          className="h-28 bg-primary-container text-white rounded-2xl px-6 flex items-center gap-5 hover:scale-[1.02] transition-transform shadow-xl shadow-primary-container/30 cursor-pointer text-left"
        >
          <div className="bg-white/20 p-4 rounded-xl shrink-0">
            <Icon name="how_to_reg" className="text-4xl" />
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-white">Đón Tiếp Bệnh Nhân</h3>
            <p className="text-sm opacity-80 mt-0.5">Check-in • Bệnh nhân cũ / Mới / Quét QR</p>
          </div>
        </button>

        <button
          id="btn-booking-home"
          onClick={() => setIsBookingOpen(true)}
          className="h-28 bg-tertiary-container text-white rounded-2xl px-6 flex items-center gap-5 hover:scale-[1.02] transition-transform shadow-xl shadow-tertiary-container/30 cursor-pointer text-left"
        >
          <div className="bg-white/20 p-4 rounded-xl shrink-0">
            <Icon name="calendar_add_on" className="text-4xl" />
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-white">Đặt Lịch Hẹn Mới</h3>
            <p className="text-sm opacity-80 mt-0.5">Tạo lịch khám mới cho khách hàng</p>
          </div>
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Đang chờ khám', value: waitingCount, icon: 'hourglass_top', color: 'text-amber-700 bg-amber-50 border-amber-200', pulse: waitingCount > 0 },
          { label: 'Đang khám', value: inChairCount, icon: 'medical_services', color: 'text-primary bg-primary-container border-primary/20', pulse: inChairCount > 0 },
          { label: 'Hoàn tất hôm nay', value: completedToday, icon: 'task_alt', color: 'text-secondary bg-secondary-container border-secondary/20', pulse: false },
          { label: 'Thời gian chờ TB', value: `${avgWait} phút`, icon: 'avg_pace', color: 'text-on-surface bg-surface-container border-outline-variant', pulse: false },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
            <div className="relative shrink-0">
              <Icon name={s.icon} className="text-[26px]" />
              {s.pulse && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-current rounded-full animate-ping opacity-60" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT: Pending Alert + Confirmed appointments */}
        <div className="col-span-12 lg:col-span-8 space-y-5">



          {/* Confirmed Appointments for Today */}
          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-primary flex items-center gap-2">
                <Icon name="event_available" />
                Lịch Hẹn Hôm Nay
              </h3>
              <span className="bg-primary-fixed text-primary px-3 py-1 rounded-full text-xs font-bold">
                {confirmedAppts.length} lịch hẹn
              </span>
            </div>
            {confirmedAppts.length > 0 ? (
              <div className="divide-y divide-outline-variant">
                {confirmedAppts.map(appt => (
                  <div key={appt.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                    <div className="text-center shrink-0 w-14">
                      <p className="font-bold text-primary text-sm">{appt.time}</p>
                    </div>
                    <div className="w-px h-10 bg-outline-variant shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{appt.patientName}</p>
                      <p className="text-xs text-on-surface-variant truncate">{appt.serviceName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-on-surface">{appt.dentistName.replace('Bác sĩ ', 'BS. ')}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
                        <Icon name="check_circle" className="text-[10px]" />
                        Đã xác nhận
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-on-surface-variant">
                <Icon name="event_busy" className="text-[48px] text-outline/50" />
                <p className="mt-2 text-sm">Không có lịch hẹn đã xác nhận hôm nay</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live queue mini + Dentist status */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Live Queue */}
          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-headline-sm text-secondary flex items-center gap-2">
                <Icon name="pending_actions" />
                Hàng Chờ Hiện Tại
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
                </span>
                Live
              </div>
            </div>
            <div className="divide-y divide-outline-variant max-h-64 overflow-y-auto custom-scrollbar">
              {queue.filter(q => q.status !== 'Completed').length > 0 ? (
                queue.filter(q => q.status !== 'Completed').map((item, idx) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.status === 'In Chair' ? 'bg-primary-container text-on-primary-container' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{item.patientName}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {item.serviceName ? `${item.serviceName} • ` : ''}{item.room}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${item.status === 'In Chair' ? 'text-primary animate-pulse' : 'text-amber-700'}`}>
                        {item.status === 'In Chair' ? `⏱ ${item.elapsedTimeMin ?? 0}p` : `⏳ ${item.waitTimeMin}p`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-on-surface-variant">
                  <Icon name="group" className="text-3xl text-outline/40" />
                  <p className="text-xs mt-2">Hàng chờ trống</p>
                </div>
              )}
            </div>
          </div>

          {/* Dentist room status */}
          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm p-4">
            <h4 className="font-headline-sm text-headline-sm mb-3 flex items-center gap-2 text-on-surface">
              <Icon name="meeting_room" className="text-primary" />
              Trạng thái phòng khám
            </h4>
            <div className="space-y-2">
              {dentists.map(d => {
                const dItem = queue.find(q => q.dentistId === d.id && q.status !== 'Completed');
                const inChair = dItem?.status === 'In Chair';
                const waiting = queue.filter(q => q.dentistId === d.id && q.status === 'Waiting').length;
                return (
                  <div key={d.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${inChair ? 'border-primary/30 bg-primary-container/10' : waiting > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-outline-variant bg-surface-container-low'
                    }`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${inChair ? 'bg-primary animate-pulse' : waiting > 0 ? 'bg-amber-500' : 'bg-outline'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{d.name.replace('Bác sĩ ', 'BS. ')}</p>
                      <p className="text-[10px] text-on-surface-variant">{d.room}</p>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${inChair ? 'text-primary' : waiting > 0 ? 'text-amber-700' : 'text-secondary'}`}>
                      {inChair ? '🟢 Đang khám' : waiting > 0 ? `⏳ ${waiting} chờ` : '⚪ Rảnh'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        title="Đón tiếp & Check-in bệnh nhân"
      />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
};

// ─── Main ReceptionistDashboard (Tab Router) ────────────────────────────────────
export const ReceptionistDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  switch (tab) {
    case 'queue': return <ReceptionistQueue />;
    case 'appointments': return <ReceptionistAppointments />;
    case 'reminders': return <ReceptionistReminders />;
    case 'cancel-history': return <ReceptionistCancelHistory />;

    default: return <ReceptionistHome />;
  }
};
