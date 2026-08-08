import React, { useState } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import { Icon } from '../../../components/Icon';
import { useConfirm } from '../../../context/ConfirmContext';
import { exportToExcel } from '../../../utils/exportToExcel';

// Dynamic helper to calculate patient ranking/tier based on visit frequency (number of medical records)
export const getPatientTier = (recordCount: number) => {
  if (recordCount >= 10) return { label: '💎 VIP Diamond', class: 'bg-blue-50 text-blue-700 border-blue-200', code: 'Diamond' };
  if (recordCount >= 5) return { label: '💿 VIP Platinum', class: 'bg-cyan-50 text-cyan-700 border-cyan-200', code: 'Platinum' };
  if (recordCount >= 3) return { label: '⭐ VIP Gold', class: 'bg-amber-50 text-amber-700 border-amber-200', code: 'Gold' };
  return { label: 'Thường', class: 'bg-slate-100 text-slate-700 border-slate-200', code: 'Standard' };
};

const isSamePatientId = (id1?: string | null, id2?: string | null): boolean => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim().replace(/^P-?/i, '');
  const s2 = String(id2).trim().replace(/^P-?/i, '');
  return s1 === s2;
};

export const ManagerPatients: React.FC = () => {
  const { patients, appointments, medicalRecords, invoices } = useClinic();
  const { showConfirm, showAlert } = useConfirm();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('All');
  const [filterFrequency, setFilterFrequency] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Helper stats calculation
  const getPatientStats = (patientId: string) => {
    const mrCount = medicalRecords.filter(mr => isSamePatientId(mr.patientId, patientId)).length;
    const invCount = invoices.filter(inv => isSamePatientId(inv.patientId, patientId)).length;
    const apptCount = appointments.filter(a => isSamePatientId(a.patientId, patientId) && (a.status === 'Completed' || a.status === 'Confirmed')).length;
    
    // Total visit count is maximum of recorded medical entries, invoices, or completed appointments
    const recordCount = Math.max(mrCount, invCount, apptCount);

    const patientAppointments = appointments.filter(a => isSamePatientId(a.patientId, patientId));
    const cancelCount = patientAppointments.filter(a => a.status === 'Cancelled').length;
    
    // Status lock rule: If patient is manually unlocked by manager, isLocked is false. Otherwise, locked if manually locked or cancelCount >= 3.
    const patient = patients.find(p => isSamePatientId(p.id, patientId));
    const isLocked = patient?.isUnlocked ? false : Boolean(patient?.isLocked || cancelCount >= 3);
    const isFrequent = recordCount >= 3;

    return {
      recordCount,
      cancelCount,
      isLocked,
      isFrequent
    };
  };


  // Filtered patients list
  const filteredPatients = patients.filter(patient => {
    const stats = getPatientStats(patient.id);
    const tierInfo = getPatientTier(stats.recordCount);

    // Search Query (ID, Name, Phone)
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Dynamic Tier filter
    const matchesTier = filterTier === 'All' || tierInfo.code === filterTier;

    // Frequency filter
    const matchesFrequency = 
      filterFrequency === 'All' ||
      (filterFrequency === 'Frequent' && stats.isFrequent) ||
      (filterFrequency === 'New' && !stats.isFrequent);

    // Status filter
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Locked' && stats.isLocked) ||
      (filterStatus === 'Active' && !stats.isLocked);

    return matchesSearch && matchesTier && matchesFrequency && matchesStatus;
  });

  const handleExportExcel = () => {
    const exportData = filteredPatients.map((p) => {
      const stats = getPatientStats(p.id);
      const tierObj = getPatientTier(stats.recordCount);
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        gender: (p as any).gender || 'Chưa rõ',
        recordCount: stats.recordCount,
        cancelCount: stats.cancelCount,
        balance: (p as any).balance || 0,
        tier: tierObj.code,
        status: stats.isLocked ? 'Đã bị khóa' : 'Bình thường',
      };
    });

    exportToExcel(exportData, 'Danh_Sach_Benh_Nhan_GoodSmile', {
      id: 'Mã bệnh nhân',
      name: 'Họ tên',
      phone: 'Số điện thoại',
      gender: 'Giới tính',
      recordCount: 'Số lần khám',
      cancelCount: 'Số lần hủy lịch',
      balance: 'Số dư ví (VND)',
      tier: 'Hạng thành viên',
      status: 'Trạng thái tài khoản',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700">
            <Icon name="person_search" className="text-2xl" />
          </div>
          <div>
            <h3 className="font-bold text-headline-sm text-on-surface">Quản Lý Khách Hàng</h3>
            <p className="text-xs text-on-surface-variant">Thống kê số lần khám, phân hạng VIP và quản lý khóa/mở khóa tài khoản bảo vệ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-green-700 text-white font-bold text-xs flex items-center gap-2 hover:bg-green-800 transition-colors cursor-pointer shadow-sm"
          >
            <Icon name="description" className="text-[18px]" />
            Xuất File Excel
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant bg-slate-50 border border-outline-variant/60 rounded-xl px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
            Tổng số: {patients.length} khách hàng
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
          <Icon name="filter_list" className="text-[18px] text-purple-600" />
          Bộ lọc & Tìm kiếm khách hàng
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tìm kiếm khách hàng</label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]" />
              <input
                type="text"
                placeholder="Nhập tên, số điện thoại, mã bệnh nhân..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Hạng thành viên (Khám thực tế)</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="All">Tất cả hạng (Thường & VIP)</option>
              <option value="Standard">Standard (Thường - &lt; 3 lần khám)</option>
              <option value="Gold">VIP Gold (≥ 3 lần khám)</option>
              <option value="Platinum">VIP Platinum (≥ 5 lần khám)</option>
              <option value="Diamond">VIP Diamond (≥ 10 lần khám)</option>
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tần suất đến khám</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="All">Tất cả tần suất</option>
              <option value="Frequent">Thường xuyên đến (≥ 3 lần khám)</option>
              <option value="New">Khách mới (&lt; 3 lần khám)</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Trạng thái tài khoản</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Locked">Đã khóa (Tự động/Thủ công)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
                <th className="px-6 py-4">Mã BN</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4 text-center">Số lần khám</th>
                <th className="px-6 py-4 text-center">Số lần hủy</th>
                <th className="px-6 py-4 text-center">Xếp hạng Hội viên</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-xs">
              {filteredPatients.length > 0 ? (
                filteredPatients.map(patient => {
                  const stats = getPatientStats(patient.id);
                  const tierInfo = getPatientTier(stats.recordCount);

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-purple-700">{patient.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-on-surface">{patient.name}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface-variant">{patient.phone}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-700">
                        {stats.recordCount} lần
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stats.cancelCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            0 lần
                          </span>
                        ) : stats.cancelCount >= 3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-error-container text-error border border-error/20 animate-pulse">
                            <Icon name="warning" className="text-[11px]" />
                            {stats.cancelCount} lần
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {stats.cancelCount} lần
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${tierInfo.class}`}>
                          {tierInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stats.isLocked ? (
                          <span className="inline-flex items-center gap-1 bg-error-container text-error px-2.5 py-1 rounded-full text-[10px] font-bold border border-error/20 animate-pulse">
                            <Icon name="block" className="text-[12px]" />
                            {patient.isLocked ? 'Đã khóa (Thủ công)' : 'Đã khóa (Hủy ≥ 3 lần)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-100">
                            <Icon name="check_circle" className="text-[12px]" />
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {stats.isLocked ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const isConfirmed = await showConfirm({
                                title: 'Mở khóa tài khoản',
                                message: `Bạn có chắc chắn muốn mở khóa tài khoản cho bệnh nhân ${patient.name}? Bệnh nhân sẽ có thể tiếp tục đặt lịch hẹn trực tuyến.`,
                                type: 'info',
                                confirmLabel: 'Đồng ý mở khóa',
                                cancelLabel: 'Quay lại'
                              });
                              if (isConfirmed) {
                                unlockPatient(patient.id);
                                await showAlert({
                                  title: 'Thành công',
                                  message: `Đã mở khóa tài khoản bệnh nhân ${patient.name} thành công.`,
                                  type: 'success'
                                });
                              }
                            }}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 ml-auto"
                          >
                            <Icon name="lock_open" className="text-[14px]" />
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const isConfirmed = await showConfirm({
                                title: 'Khóa tài khoản',
                                message: `Bạn có chắc chắn muốn KHÓA tài khoản của bệnh nhân ${patient.name}? Bệnh nhân sẽ KHÔNG thể tự đặt lịch hẹn trực tuyến nữa.`,
                                type: 'warning',
                                confirmLabel: 'Đồng ý khóa',
                                cancelLabel: 'Quay lại'
                              });
                              if (isConfirmed) {
                                lockPatient(patient.id);
                                await showAlert({
                                  title: 'Thành công',
                                  message: `Đã khóa tài khoản bệnh nhân ${patient.name} thành công.`,
                                  type: 'success'
                                });
                              }
                            }}
                            className="px-4 py-1.5 bg-error hover:bg-error/95 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 ml-auto"
                          >
                            <Icon name="lock" className="text-[14px]" />
                            Khóa tài khoản
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-on-surface-variant/60 font-medium">
                    Không tìm thấy khách hàng nào khớp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
