import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { ReceptionistShiftAlerts } from './ReceptionistShiftAlerts';
import { ReceptionistCSKH } from './ReceptionistCSKH';

type WorkTab = 'shift' | 'cskh';

export const ReceptionistWorkCenter: React.FC = () => {
  const { appointments, shiftChangeNotifications } = useClinic();

  // Đọc subTab từ URL nếu có (ví dụ: ?tab=work-center&subTab=cskh)
  const urlSubTab = new URLSearchParams(window.location.search).get('subTab');
  const [activeTab, setActiveTab] = useState<WorkTab>(
    urlSubTab === 'cskh' ? 'cskh' : 'shift'
  );

  // Đếm badge realtime
  const noShowCount = useMemo(() => {
    const resolvedCSKHIds = (() => {
      try { return JSON.parse(localStorage.getItem('goodsmile_cskh_resolved') || '[]'); }
      catch { return []; }
    })();
    return appointments.filter(a => a.status === 'NoShow' && !resolvedCSKHIds.includes(a.id)).length;
  }, [appointments]);

  const pendingShiftCount = useMemo(
    () => (shiftChangeNotifications || []).reduce((sum, n) => {
      if (!n.affectedItems) return sum;
      return sum + n.affectedItems.filter(item => !item.resolved).length;
    }, 0),
    [shiftChangeNotifications]
  );

  const tabs: { id: WorkTab; label: string; icon: string; badge?: number; color: string; activeBg: string }[] = [
    {
      id: 'shift',
      label: 'Đổi ca bác sĩ',
      icon: 'swap_horiz',
      badge: pendingShiftCount || undefined,
      color: 'text-purple-700',
      activeBg: 'bg-purple-600 text-white shadow-sm',
    },
    {
      id: 'cskh',
      label: 'CSKH lỡ hẹn',
      icon: 'phone_callback',
      badge: noShowCount || undefined,
      color: 'text-amber-700',
      activeBg: 'bg-amber-500 text-white shadow-sm',
    },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Tab Header ── */}
      <div className="px-6 pt-5 pb-0 bg-white border-b border-outline-variant/60 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <Icon name="assignment_turned_in" className="text-primary" />
              Trung tâm làm việc
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Xử lý các công việc phát sinh trong ngày làm việc của lễ tân
            </p>
          </div>

          {/* Alert badge tổng */}
          {(pendingShiftCount + noShowCount) > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
              <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
                {pendingShiftCount + noShowCount}
              </span>
              Công việc chưa xử lý
            </div>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all duration-150 border border-b-0 cursor-pointer ${
                  isActive
                    ? `${tab.activeBg} border-transparent -mb-px z-10`
                    : `bg-surface-container-low ${tab.color} border-outline-variant/40 hover:bg-surface-container-high`
                }`}
              >
                <Icon name={tab.icon} className="text-[18px]" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black px-1 leading-none ${
                    isActive
                      ? 'bg-white/30 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfdfe]">
        {activeTab === 'shift' && <ReceptionistShiftAlerts />}
        {activeTab === 'cskh' && <ReceptionistCSKH />}
      </div>
    </div>
  );
};
