import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';

const STATUS_STYLES = {
  Waiting: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', label: 'Đang chờ', icon: 'hourglass_top' },
  'In Chair': { badge: 'bg-primary-container text-on-primary-container', dot: 'bg-primary', label: 'Đang khám', icon: 'medical_services' },
  Completed: { badge: 'bg-surface-container text-on-surface-variant', dot: 'bg-outline', label: 'Hoàn tất', icon: 'check_circle' },
};

export const DentistQueue: React.FC = () => {
  const { queue, patients, startTreatment } = useClinic();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dentistId = user?.id || 'D-04';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const dentistQueue = queue.filter(q => q.dentistId === dentistId);
  const activeQueue = dentistQueue.filter(q => q.status !== 'Completed');
  const completedToday = dentistQueue.filter(q => q.status === 'Completed');
  const isAnyInChair = activeQueue.some(q => q.status === 'In Chair');

  // Filter logic
  const filteredQueue = dentistQueue.filter(item => {
    const patient = patients.find(p => p.id === item.patientId);
    const matchesSearch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          patient?.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAction = (item: any) => {
    if (item.status === 'Waiting') {
      startTreatment(item.id);
    }
    navigate(`/dashboard/dentist?tab=workspace&queueId=${item.id}`);
  };

  return (
    <div className="p-container-padding-desktop space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Hàng chờ bác sĩ</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Quản lý lượt khám và điều trị bệnh nhân trong ca làm việc</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Đang chờ', value: activeQueue.filter(q => q.status === 'Waiting').length, icon: 'hourglass_top', color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Đang khám', value: activeQueue.filter(q => q.status === 'In Chair').length, icon: 'medical_services', color: 'text-primary bg-primary-container border-primary/20' },
          { label: 'Hoàn tất hôm nay', value: completedToday.length, icon: 'task_alt', color: 'text-secondary bg-secondary-container border-secondary/20' },
          { label: 'Tổng ca trong ngày', value: dentistQueue.length, icon: 'calendar_today', color: 'text-on-surface bg-surface-container border-outline-variant' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-4 shadow-sm ${s.color}`}>
            <Icon name={s.icon} className="text-[32px]" />
            <div>
              <p className="text-headline-md font-bold">{s.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col clinical-shadow">
        {/* Table Toolbar / Filters */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc mã bệnh nhân..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="Waiting">Đang chờ khám</option>
              <option value="In Chair">Đang khám</option>
              <option value="Completed">Đã hoàn tất</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container text-on-surface-variant font-bold text-xs uppercase tracking-wider border-b border-outline-variant">
              <tr>
                <th className="p-4 w-16 text-center">STT</th>
                <th className="p-4">Bệnh nhân</th>
                <th className="p-4">Phòng / Giờ nhận</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredQueue.map((item, idx) => {
                const patient = patients.find(p => p.id === item.patientId);
                const status = STATUS_STYLES[item.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.Completed;
                return (
                  <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="p-4 text-center font-medium text-on-surface-variant">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${item.status === 'Completed' ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-container text-primary'}`}>
                          {patient?.name.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold ${item.status === 'Completed' ? 'text-on-surface-variant' : 'text-on-surface'}`}>{patient?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-on-surface-variant font-data-mono">#{patient?.id}</span>
                            {(patient?.criticalAllergy !== 'Không' || patient?.condition !== 'Bình thường') && (
                              <div className="flex gap-1">
                                {patient?.criticalAllergy !== 'Không' && <span className="bg-error-container/50 text-error px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider">⚠ Dị ứng</span>}
                                {patient?.condition !== 'Bình thường' && <span className="bg-amber-100 text-amber-800 px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider">Bệnh nền</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-on-surface">{item.room}</p>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <Icon name="login" className="text-[14px]" />
                        {item.checkInTime}
                      </p>
                    </td>
                    <td className="p-4">
                      {item.status === 'In Chair' ? (
                        <span className="text-primary font-bold flex items-center gap-1 text-xs">
                          <Icon name="timer" className="text-[14px]" />
                          Khám {item.elapsedTimeMin || 0} phút
                        </span>
                      ) : item.status === 'Waiting' ? (
                        <span className="text-amber-700 font-medium flex items-center gap-1 text-xs">
                          <Icon name="schedule" className="text-[14px]" />
                          Chờ {item.waitTimeMin} phút
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-xs flex items-center gap-1">
                          <Icon name="done_all" className="text-[14px]" />
                          Đã khám xong
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${status.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${item.status === 'In Chair' ? 'animate-pulse' : ''}`}></span>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {item.status !== 'Completed' ? (
                        <button 
                          onClick={() => {
                            if (item.status === 'Waiting' && isAnyInChair) {
                              alert('Vui lòng hoàn tất ca khám hiện tại trước khi tiếp nhận bệnh nhân mới!');
                              return;
                            }
                            handleAction(item);
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm hover:shadow ${
                            item.status === 'Waiting' 
                              ? isAnyInChair
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-primary text-white hover:bg-primary/90' 
                              : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
                          }`}
                        >
                          <Icon
                            name={item.status === 'Waiting' ? 'play_arrow' : 'dashboard'}
                            className="text-[16px]"
                          />
                          {item.status === 'Waiting' ? 'Khám ngay' : 'Mở bàn khám'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/dashboard/dentist?tab=records`)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <Icon name="visibility" className="text-[16px]" />
                          Xem hồ sơ
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {filteredQueue.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Icon name="search_off" className="text-[48px] text-outline mb-3" />
              <p className="text-on-surface font-semibold">Không tìm thấy bệnh nhân nào</p>
              <p className="text-on-surface-variant text-sm mt-1">Vui lòng thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
