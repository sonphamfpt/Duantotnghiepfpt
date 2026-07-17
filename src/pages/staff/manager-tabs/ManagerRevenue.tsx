import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { ToothState } from '../../../types/clinic';

// Helper to extract date components timezone-independently
const getDateParts = (dStr: any) => {
  if (!dStr) return null;
  let str = '';
  try {
    if (dStr instanceof Date) {
      str = dStr.toISOString();
    } else if (typeof dStr === 'object') {
      str = dStr.toString();
    } else {
      str = String(dStr);
    }
  } catch (e) {
    return null;
  }

  const cleanDStr = str.includes('@') ? str.split('@')[0].trim() : str;
  let year = 2026;
  let month = 0; // 0-11
  let day = 1;
  
  if (cleanDStr.includes('/')) { // DD/MM/YYYY
    const parts = cleanDStr.split('/');
    if (parts.length === 3) {
      day = Number(parts[0]);
      month = Number(parts[1]) - 1;
      year = Number(parts[2]);
    }
  } else if (cleanDStr.includes('T')) { // ISO string
    const parts = cleanDStr.split('T')[0].split('-');
    if (parts.length === 3) {
      year = Number(parts[0]);
      month = Number(parts[1]) - 1;
      day = Number(parts[2]);
    }
  } else if (cleanDStr.includes('-')) { // YYYY-MM-DD
    const parts = cleanDStr.split('-');
    if (parts.length === 3) {
      year = Number(parts[0]);
      month = Number(parts[1]) - 1;
      day = Number(parts[2]);
    }
  }
  return { year, month, day };
};

export const ManagerRevenue: React.FC = () => {
  const { invoices, dentists, doctorShifts, medicalRecords } = useClinic();

  // Sub-tabs: 'financial' | 'timesheet'
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'timesheet'>('financial');

  // Filter states
  const [filterType, setFilterType] = useState<'day' | 'month' | 'quarter' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } catch (e) {
      return '2026-07-15';
    }
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    } catch (e) {
      return '2026-07';
    }
  });
  const [selectedQuarter, setSelectedQuarter] = useState<number>(() => {
    try {
      return Math.floor(new Date().getMonth() / 3) + 1;
    } catch (e) {
      return 3;
    }
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      return new Date().getFullYear();
    } catch (e) {
      return 2026;
    }
  });
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    } catch (e) {
      return '2026-07-01';
    }
  });
  const [endDate, setEndDate] = useState<string>(() => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } catch (e) {
      return '2026-07-15';
    }
  });

  // Unified dynamic filtering logic
  const isDateInFilter = (dateStr: string) => {
    const parts = getDateParts(dateStr);
    if (!parts) return false;
    const { year, month, day } = parts;
    const dateObj = new Date(year, month, day);

    if (filterType === 'day') {
      if (!selectedDate) return false;
      const fParts = selectedDate.split('-');
      if (fParts.length < 3) return false;
      const [fYear, fMonth, fDay] = fParts.map(Number);
      return year === fYear && month === (fMonth - 1) && day === fDay;
    }
    if (filterType === 'month') {
      if (!selectedMonth) return false;
      const fParts = selectedMonth.split('-');
      if (fParts.length < 2) return false;
      const [fYear, fMonth] = fParts.map(Number);
      return year === fYear && month === (fMonth - 1);
    }
    if (filterType === 'quarter') {
      if (year !== selectedYear) return false;
      const quarter = Math.floor(month / 3) + 1;
      return quarter === selectedQuarter;
    }
    if (filterType === 'range') {
      if (!startDate || !endDate) return false;
      const sParts = startDate.split('-');
      const eParts = endDate.split('-');
      if (sParts.length < 3 || eParts.length < 3) return false;
      const [sYear, sMonth, sDay] = sParts.map(Number);
      const [eYear, eMonth, eDay] = eParts.map(Number);
      const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0);
      const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59);
      return dateObj >= start && dateObj <= end;
    }
    return true;
  };

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => isDateInFilter(inv.createdAt));
  const paidInvoices = filteredInvoices.filter((inv) => inv.status === 'Paid' || inv.status === 'Partially Paid');

  // Revenue computations
  const netRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalServiceFee = filteredInvoices.reduce((sum, inv) => {
    if (inv.status === 'Paid') return sum + inv.totalPrice;
    if (inv.status === 'Partially Paid') {
      const ratio = inv.netPrice > 0 ? (inv.paidAmount || 0) / inv.netPrice : 0;
      return sum + Math.round(inv.totalPrice * ratio);
    }
    return sum;
  }, 0);
  const totalMemberDiscount = filteredInvoices.reduce((sum, inv) => {
    if (inv.status === 'Paid') return sum + inv.memberDiscount;
    if (inv.status === 'Partially Paid') {
      const ratio = inv.netPrice > 0 ? (inv.paidAmount || 0) / inv.netPrice : 0;
      return sum + Math.round(inv.memberDiscount * ratio);
    }
    return sum;
  }, 0);

  // Average ticket size
  const avgTicket = paidInvoices.length > 0 ? Math.round(netRevenue / paidInvoices.length) : 0;

  // Progress computations
  const monthlyTarget = 150000000; // 150M VND
  const currentProgressPercent = Math.min(Math.round((netRevenue / monthlyTarget) * 100), 100);

  // Revenue by Dentist breakdown
  const dentistRevenueMap: Record<string, { name: string; revenue: number; count: number }> = {};
  filteredInvoices.forEach((inv) => {
    const paid = inv.paidAmount || 0;
    if (paid === 0) return;
    const key = inv.dentistName || 'Không xác định';
    if (!dentistRevenueMap[key]) {
      dentistRevenueMap[key] = { name: key, revenue: 0, count: 0 };
    }
    dentistRevenueMap[key].revenue += paid;
    dentistRevenueMap[key].count += 1;
  });
  const dentistAttributions = Object.values(dentistRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((d) => ({
      ...d,
      share: netRevenue > 0 ? Math.round((d.revenue / netRevenue) * 100) : 0
    }));

  // Top services breakdown
  const serviceRevenueMap: Record<string, { category: string; quantity: number; value: number }> = {};
  filteredInvoices.forEach((inv) => {
    if ((inv.paidAmount || 0) === 0) return;
    (inv.services || []).forEach((svc) => {
      const key = svc.serviceName;
      if (!serviceRevenueMap[key]) {
        serviceRevenueMap[key] = { category: key, quantity: 0, value: 0 };
      }
      serviceRevenueMap[key].quantity += 1;
      serviceRevenueMap[key].value += svc.price;
    });
  });
  const serviceStats = Object.values(serviceRevenueMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Dentist Timesheet reporting list
  const timesheetData = dentists.map(dentist => {
    const dentistShiftsInPeriod = doctorShifts.filter(s => s.dentistId === dentist.id && isDateInFilter(s.date));
    const morningShifts = dentistShiftsInPeriod.filter(s => s.shiftType === 'Morning').length;
    const afternoonShifts = dentistShiftsInPeriod.filter(s => s.shiftType === 'Afternoon').length;
    const fullShifts = dentistShiftsInPeriod.filter(s => s.shiftType === 'Full').length;
    const totalShifts = morningShifts + afternoonShifts + fullShifts;
    const totalHours = (morningShifts + afternoonShifts) * 4 + fullShifts * 8;

    const treatmentsCompleted = medicalRecords.filter(r => r.dentistName === dentist.name && isDateInFilter(r.date)).length;

    const revenueGenerated = filteredInvoices
      .filter(inv => inv.dentistName === dentist.name)
      .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    return {
      id: dentist.id,
      name: dentist.name,
      role: dentist.role,
      avatar: dentist.avatar,
      totalShifts,
      totalHours,
      treatmentsCompleted,
      revenueGenerated,
    };
  });

  const getFilterDescription = () => {
    if (filterType === 'day') return `Báo cáo Ngày ${selectedDate.split('-').reverse().join('/')}`;
    if (filterType === 'month') return `Báo cáo Tháng ${selectedMonth.split('-').reverse().join('/')}`;
    if (filterType === 'quarter') return `Báo cáo Quý ${selectedQuarter} năm ${selectedYear}`;
    return `Báo cáo từ ${startDate.split('-').reverse().join('/')} đến ${endDate.split('-').reverse().join('/')}`;
  };

  const handleExportExcel = () => {
    alert(`Đã xuất báo cáo [${activeSubTab === 'financial' ? 'Doanh Thu' : 'Chấm Công Bác Sĩ'}] (${getFilterDescription()}) sang định dạng Excel (.xlsx)!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-inner">
            <Icon name={activeSubTab === 'financial' ? 'analytics' : 'assignment_ind'} className="text-[26px]" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Báo Cáo & Quản Trị Quản Lý</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {activeSubTab === 'financial' ? 'Theo dõi chỉ số dòng tiền, chiết khấu và doanh số thực thu' : 'Chấm công ca trực và thống kê số ca khám của bác sĩ'}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportExcel}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-sm bg-white"
        >
          <Icon name="grid_on" className="text-[16px] text-green-700" />
          Xuất Báo Cáo Excel
        </button>
      </div>

      {/* 2. Interactive Report Filter Panel */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit shrink-0 select-none">
            {[
              { type: 'day' as const, label: 'Lọc theo Ngày', icon: 'today' },
              { type: 'month' as const, label: 'Lọc theo Tháng', icon: 'calendar_month' },
              { type: 'quarter' as const, label: 'Lọc theo Quý', icon: 'date_range' },
              { type: 'range' as const, label: 'Khoảng thời gian', icon: 'date_range' },
            ].map(btn => (
              <button
                key={btn.type}
                type="button"
                onClick={() => setFilterType(btn.type)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${filterType === btn.type ? 'bg-white text-primary shadow-sm border border-outline-variant/10' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <Icon name={btn.icon} className="text-[15px]" />
                {btn.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/20 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 self-start lg:self-center">
            <Icon name="event" className="text-sm" />
            Đang hiển thị: <strong>{getFilterDescription()}</strong>
          </span>
        </div>

        {/* Dynamic filter input components based on selection */}
        <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-outline-variant/60 flex flex-wrap gap-4 items-center">
          {filterType === 'day' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-xs font-bold text-on-surface-variant">Chọn ngày cụ thể:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          {filterType === 'month' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-xs font-bold text-on-surface-variant">Chọn tháng thống kê:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          {filterType === 'quarter' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant">Chọn Quý:</label>
                <select
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(Number(e.target.value))}
                  className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value={1}>Quý 1 (Tháng 1 - 3)</option>
                  <option value={2}>Quý 2 (Tháng 4 - 6)</option>
                  <option value={3}>Quý 3 (Tháng 7 - 9)</option>
                  <option value={4}>Quý 4 (Tháng 10 - 12)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant">Năm:</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {[2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {filterType === 'range' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant">Từ ngày:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant">Đến ngày:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-white border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}
          <span className="text-[10px] text-on-surface-variant font-semibold ml-auto hidden lg:inline-block">Dữ liệu được làm mới thời gian thực từ hoạt động phòng khám.</span>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation */}
      <div className="flex gap-2 border-b border-outline-variant">
        <button
          onClick={() => setActiveSubTab('financial')}
          className={`px-5 py-3 text-label-md font-bold flex items-center gap-2 border-b-2 -mb-px transition-all cursor-pointer ${
            activeSubTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="query_stats" className="text-[18px]" />
          Báo cáo doanh số tài chính
        </button>
        <button
          onClick={() => setActiveSubTab('timesheet')}
          className={`px-5 py-3 text-label-md font-bold flex items-center gap-2 border-b-2 -mb-px transition-all cursor-pointer ${
            activeSubTab === 'timesheet' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="badge" className="text-[18px]" />
          Bảng chấm công Bác sĩ
        </button>
      </div>

      {/* 4. Tab 1: Financial Reports */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between h-28">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Doanh Thu Thuần thực thu</span>
              <p className="text-xl font-extrabold text-purple-700">₫{netRevenue.toLocaleString()}</p>
              <span className="text-[10px] text-on-surface-variant font-medium">Trừ chiết khấu thành viên VIP</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between h-28">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Tổng Giá Trị Dịch Vụ</span>
              <p className="text-xl font-extrabold text-on-surface">₫{totalServiceFee.toLocaleString()}</p>
              <span className="text-[10px] text-on-surface-variant font-medium">Giá trị dịch vụ gốc trước giảm</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between h-28">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Tổng Chiết Khấu Thành Viên</span>
              <p className="text-xl font-extrabold text-secondary">₫{totalMemberDiscount.toLocaleString()}</p>
              <span className="text-[10px] text-on-surface-variant font-medium">Trừ thẻ Loyalty & Gift code</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between h-28">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Số Lượt Giao Dịch</span>
              <p className="text-xl font-extrabold text-purple-700">{paidInvoices.length} lượt</p>
              <span className="text-[10px] text-on-surface-variant font-medium">Giá trị TB/Lượt: ₫{avgTicket.toLocaleString()}</span>
            </div>
          </div>

          {/* Target Progress Bar */}
          <div className="bg-white rounded-2xl border border-outline-variant p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-bold text-on-surface flex items-center gap-1">
                <Icon name="crisis_alert" className="text-purple-600 text-sm animate-pulse" /> Tiến trình doanh thu mục tiêu tháng
              </span>
              <span className="text-on-surface-variant">
                Đạt <strong>₫{netRevenue.toLocaleString()}</strong> / ₫{monthlyTarget.toLocaleString()} (
                <strong>{currentProgressPercent}%</strong>)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-outline-variant/30">
              <div className="bg-gradient-to-r from-purple-500 to-purple-800 h-full rounded-full transition-all duration-500" style={{ width: `${currentProgressPercent}%` }}></div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue share by Dentist */}
            <section className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase text-on-surface flex items-center gap-1.5">
                  <Icon name="groups" className="text-sm text-purple-600" />
                  Doanh số đóng góp của Bác sĩ
                </h4>
                <span className="text-[9px] font-bold bg-white text-slate-500 border border-outline-variant px-2 py-0.5 rounded-full uppercase">Thực thu</span>
              </div>
              <div className="divide-y divide-outline-variant/60 flex-1">
                {dentistAttributions.length > 0 ? dentistAttributions.map((dentist, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <h5 className="font-bold text-xs text-on-surface">{dentist.name}</h5>
                      <p className="text-[10px] text-on-surface-variant font-medium">{dentist.count} ca thanh toán thành công</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-purple-700">₫{dentist.revenue.toLocaleString()}</p>
                      <span className="inline-block text-[8px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">{dentist.share}% Doanh số</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center text-xs text-on-surface-variant italic">Không có dữ liệu doanh số bác sĩ trong thời gian này</div>
                )}
              </div>
            </section>

            {/* Top service categories */}
            <section className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase text-on-surface flex items-center gap-1.5">
                  <Icon name="medical_services" className="text-sm text-purple-600" />
                  Top Dịch Vụ Doanh Thu Cao Nhất
                </h4>
                <span className="text-[9px] font-bold bg-white text-slate-500 border border-outline-variant px-2 py-0.5 rounded-full uppercase">Top 5</span>
              </div>
              <div className="divide-y divide-outline-variant/60 flex-1">
                {serviceStats.length > 0 ? serviceStats.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <h5 className="font-bold text-xs text-on-surface">{item.category}</h5>
                      <p className="text-[10px] text-on-surface-variant font-medium">Số lượt sử dụng: {item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-on-surface">₫{item.value.toLocaleString()}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center text-xs text-on-surface-variant italic">Không có giao dịch dịch vụ trong thời gian này</div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Dentist Timesheet Report */}
      {activeSubTab === 'timesheet' && (
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h4 className="font-bold text-xs uppercase text-on-surface flex items-center gap-1.5">
              <Icon name="badge" className="text-sm text-purple-600" />
              Báo Cáo Ca Trực Bác Sĩ
            </h4>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-outline-variant">
                <tr>
                  <th className="p-4 w-12 text-center">STT</th>
                  <th className="p-4">Bác sĩ</th>
                  <th className="p-4 text-center">Tổng Số Ca Trực</th>
                  <th className="p-4 text-center">Tổng Giờ Trực</th>
                  <th className="p-4 text-center">Số Ca Đã Khám</th>
                  <th className="p-4 text-right">Doanh Số Thực Thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {timesheetData.map((dentist, idx) => (
                  <tr key={dentist.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 text-center font-medium text-on-surface-variant">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={dentist.avatar}
                          alt={dentist.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                        <div>
                          <p className="font-bold text-on-surface text-xs leading-none mb-1">{dentist.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium leading-none">{dentist.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-semibold text-on-surface">{dentist.totalShifts} ca trực</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                        <Icon name="schedule" className="text-[13px] text-slate-500" />
                        {dentist.totalHours} giờ
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${dentist.treatmentsCompleted > 0 ? 'bg-primary/5 text-primary border border-primary/20' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                        <Icon name="history" className="text-[13px]" />
                        {dentist.treatmentsCompleted} ca khám
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-purple-700">
                      ₫{dentist.revenueGenerated.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
