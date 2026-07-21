import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { CheckInModal } from '../../../components/CheckInModal';
import { useConfirm } from '../../../context/ConfirmContext';

const STATUS_CONFIG = {
  Waiting:   { label: 'Đang chờ',  bg: 'bg-amber-50',              border: 'border-amber-300',      badge: 'bg-amber-100 text-amber-800',                        dot: 'bg-amber-500',  priority: 2 },
  'In Chair':{ label: 'Đang khám', bg: 'bg-primary-container/20',  border: 'border-primary/40',     badge: 'bg-primary-container text-on-primary-container',     dot: 'bg-primary',    priority: 1 },
  Completed: { label: 'Hoàn tất',  bg: 'bg-surface-container-low', border: 'border-outline-variant',badge: 'bg-surface-container text-on-surface-variant',       dot: 'bg-outline',    priority: 3 },
};

export const ReceptionistQueue: React.FC = () => {
  const { queue, patients, dentists } = useClinic();
  const { showAlert } = useConfirm();

  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Waiting' | 'In Chair' | 'Completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDentistId, setFilterDentistId] = useState('all');

  const filteredQueue = queue
    .filter(q => {
      // 1. Status Filter
      if (filterStatus !== 'all' && q.status !== filterStatus) return false;
      
      // 2. Dentist Filter
      if (filterDentistId !== 'all' && q.dentistId !== filterDentistId) return false;
      
      // 3. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const p = patients.find(pt => pt.id === q.patientId);
        const nameMatch = q.patientName.toLowerCase().includes(term);
        const phoneMatch = p?.phone.toLowerCase().includes(term);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pa = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.priority ?? 9;
      const pb = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG]?.priority ?? 9;
      
      // Khác trạng thái -> Xếp theo priority (In Chair -> Waiting -> Completed)
      if (pa !== pb) return pa - pb;
      
      // Cùng trạng thái Waiting -> Ưu tiên chờ lâu nhất (waitTimeMin giảm dần)
      if (a.status === 'Waiting' && b.status === 'Waiting') {
        return (b.waitTimeMin || 0) - (a.waitTimeMin || 0);
      }
      return 0;
    });

  const waitingCount  = queue.filter(q => q.status === 'Waiting').length;
  const inChairCount  = queue.filter(q => q.status === 'In Chair').length;
  const completedCount= queue.filter(q => q.status === 'Completed').length;
  const avgWait = queue.filter(q => q.status === 'Waiting').reduce((s, q) => s + q.waitTimeMin, 0) / (waitingCount || 1);

  const stats: Array<{ label: string; value: number | string; icon: string; color: string; pulse?: boolean }> = [
    { label: 'Đang chờ',        value: waitingCount,             icon: 'hourglass_top',   color: 'text-amber-700 bg-amber-50 border-amber-200',             pulse: true },
    { label: 'Đang khám',       value: inChairCount,             icon: 'medical_services',color: 'text-primary bg-primary-container border-primary/20',      pulse: true },
    { label: 'Hoàn tất hôm nay',value: completedCount,           icon: 'task_alt',        color: 'text-secondary bg-secondary-container border-secondary/20' },
    { label: 'Chờ TB',          value: `${avgWait.toFixed(0)} phút`, icon: 'avg_pace',    color: 'text-on-surface bg-surface-container border-outline-variant' },
  ];

  const [now] = useState(new Date());
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-stack-lg">
      {/* ── Header ── */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Hàng chờ trực tiếp</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Quản lý hàng chờ phòng khám theo thời gian thực •
            <span className="inline-flex items-center gap-1 ml-2 text-secondary font-bold">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse inline-block" />
              {timeStr}
            </span>
          </p>
        </div>
        <button
          id="btn-checkin-queue"
          onClick={() => setShowCheckinModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
        >
          <Icon name="how_to_reg" />
          Check-in bệnh nhân
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
            <div className="relative shrink-0">
              <Icon name={s.icon} className="text-[26px]" />
              {s.pulse && typeof s.value === 'number' && s.value > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar: Filters & Search ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-5 items-start lg:items-center justify-between bg-surface-container-low p-3 rounded-2xl border border-outline-variant">
        
        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all' as const,       label: `Tất cả (${queue.length})` },
            { key: 'Waiting' as const,   label: `Đang chờ (${waitingCount})` },
            { key: 'In Chair' as const,  label: `Đang khám (${inChairCount})` },
            { key: 'Completed' as const, label: `Hoàn tất (${completedCount})` },
          ].map(f => (
            <button
              key={f.key}
              id={`btn-queue-filter-${f.key}`}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterStatus === f.key
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-white border-outline-variant text-on-surface-variant hover:border-primary/40 hover:bg-surface-container'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Dentist Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT bệnh nhân..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow bg-white"
            />
          </div>
          <select
            value={filterDentistId}
            onChange={(e) => setFilterDentistId(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 rounded-xl border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white cursor-pointer"
          >
            <option value="all">Tất cả Bác sĩ</option>
            {dentists.map(d => (
              <option key={d.id} value={d.id}>{d.name.replace('Bác sĩ ', 'BS. ')} ({d.room})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Queue Table ── */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase">
                {['#', 'Bệnh nhân', 'Bác sĩ phụ trách', 'Phòng', 'Check-in', 'Thời gian', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredQueue.map((item, idx) => {
                const conf = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Waiting;
                const patient = patients.find(p => p.id === item.patientId);
                return (
                  <tr key={item.id} className={`hover:bg-surface-container-low transition-colors ${item.status === 'Completed' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${conf.badge}`}>{idx + 1}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold shrink-0">
                          {item.patientName.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{item.patientName}</p>
                          <p className="text-xs text-on-surface-variant">{patient?.phone || item.patientId}</p>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {item.serviceName && (
                              <span className="text-[10px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded font-bold">{item.serviceName}</span>
                            )}
                            {patient && patient.criticalAllergy !== 'Không' && (
                              <span className="text-[10px] bg-error-container text-error px-1.5 py-0.5 rounded-full font-bold">⚠ {patient.criticalAllergy}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-on-surface">{item.dentistName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm bg-surface-container px-2 py-0.5 rounded font-bold text-on-surface-variant">{item.room}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{item.checkInTime}</td>
                    <td className="px-4 py-3">
                      {item.status === 'Waiting' && (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                          item.waitTimeMin > 30 ? 'bg-error-container text-on-error-container animate-pulse border border-error/20' :
                          item.waitTimeMin > 15 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {item.waitTimeMin > 30 && <Icon name="warning" className="text-[14px]" />}
                          ⏳ {item.waitTimeMin} phút
                        </span>
                      )}
                      {item.status === 'In Chair' && (
                        <span className="text-xs text-primary font-bold animate-pulse">⏱ {item.elapsedTimeMin ?? 0} phút</span>
                      )}
                      {item.status === 'Completed' && (
                        <span className="text-xs text-on-surface-variant">✓ Xong</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${conf.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} ${item.status !== 'Completed' ? 'animate-pulse' : ''}`} />
                        {conf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            await showAlert({
                              title: 'Chi tiết lượt khám',
                              message: `Bệnh nhân: ${item.patientName}\nPhòng: ${item.room}\nBác sĩ: ${item.dentistName}${item.serviceName ? `\nDịch vụ: ${item.serviceName}` : ''}`,
                              type: 'info'
                            });
                          }}
                          className="px-2.5 py-1.5 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Icon name="visibility" className="text-[16px]" />
                        </button>
                        {item.status === 'Waiting' && (
                          <button
                            onClick={async () => {
                              await showAlert({
                                title: 'Thông báo',
                                message: `Đã thông báo gọi loa bệnh nhân: ${item.patientName}`,
                                type: 'success'
                              });
                            }}
                            className="px-2.5 py-1.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                            title="Gọi loa thông báo"
                          >
                            <Icon name="campaign" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredQueue.length === 0 && (
            <div className="text-center py-16">
              <Icon name="queue_play_next" className="text-[72px] text-outline/40" />
              <p className="text-on-surface-variant mt-4">Không có bệnh nhân nào trong hàng chờ</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Dentist room load overview ── */}
      <div className="mt-6 bg-white rounded-2xl border border-outline-variant shadow-sm p-5">
        <h4 className="font-headline-sm text-headline-sm mb-4 flex items-center gap-2">
          <Icon name="meeting_room" className="text-primary" />
          Tải lượng phòng khám theo bác sĩ
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dentists.map(d => {
            const dQueue = queue.filter(q => q.dentistId === d.id && q.status !== 'Completed');
            const inChair = dQueue.some(q => q.status === 'In Chair');
            const currentPatient = dQueue.find(q => q.status === 'In Chair');
            return (
              <div key={d.id} className={`rounded-xl border p-4 ${inChair ? 'border-primary/30 bg-primary-container/10' : 'border-outline-variant bg-surface-container-low'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${inChair ? 'bg-primary animate-pulse' : dQueue.length > 0 ? 'bg-amber-500' : 'bg-outline'}`} />
                  <p className="text-xs font-bold text-on-surface-variant uppercase">{d.room}</p>
                </div>
                <p className="text-sm font-bold text-on-surface truncate">{d.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{d.role.split('&')[0]}</p>
                {currentPatient && (
                  <p className="text-[10px] text-primary font-bold mt-1 truncate">🦷 {currentPatient.patientName}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs font-bold ${inChair ? 'text-primary' : dQueue.length > 0 ? 'text-amber-700' : 'text-secondary'}`}>
                    {inChair ? '🟢 Đang khám' : dQueue.length > 0 ? `⏳ ${dQueue.length} chờ` : '⚪ Rảnh'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CheckInModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        title="Đón tiếp & Check-in"
      />
    </div>
  );
};
