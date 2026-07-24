import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { calculateRevenueStats } from '../../../utils/revenueUtils';

export const CashierBilling: React.FC = () => {
  const { invoices, processPayment, patients } = useClinic();

  // State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [selectedDentist, setSelectedDentist] = useState<string>('All');
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);

  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [isPartialPay, setIsPartialPay] = useState<boolean>(false);

  const [receiptDateFilter, setReceiptDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');

  // Filtering Pending Invoices
  const pendingInvoices = invoices.filter(
    (inv) =>
      inv.status !== 'Paid' &&
      (inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.patientPhone.includes(searchQuery)) &&
      (selectedRoom === 'All' || inv.room === selectedRoom) &&
      (selectedDentist === 'All' || inv.dentistName === selectedDentist)
  );

  // Filter Paid Invoices by date range (Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua, Tất cả)
  const filteredPaidInvoices = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = todayStart - 6 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 29 * 24 * 60 * 60 * 1000;

    return invoices
      .filter((inv) => {
        const isPaid = inv.status === 'Paid' || inv.status === 'Partially Paid';
        if (!isPaid) return false;

        const paymentDates = (inv.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
        const invDateMs = paymentDates.length > 0 ? Math.max(...paymentDates) : new Date(inv.createdAt).getTime();

        if (receiptDateFilter === 'today') {
          return invDateMs >= todayStart;
        }
        if (receiptDateFilter === 'yesterday') {
          return invDateMs >= yesterdayStart && invDateMs < todayStart;
        }
        if (receiptDateFilter === '7days') {
          return invDateMs >= sevenDaysAgo;
        }
        if (receiptDateFilter === '30days') {
          return invDateMs >= thirtyDaysAgo;
        }
        return true;
      })
      .sort((a, b) => {
        const aDates = (a.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
        const bDates = (b.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
        const aMs = aDates.length > 0 ? Math.max(...aDates) : new Date(a.createdAt).getTime();
        const bMs = bDates.length > 0 ? Math.max(...bDates) : new Date(b.createdAt).getTime();
        return bMs - aMs;
      });
  }, [invoices, receiptDateFilter]);

  // Calculate today's shift collected revenue dynamically using unified helper
  const todayStats = useMemo(() => {
    return calculateRevenueStats(invoices);
  }, [invoices]);

  const todayRevenue = todayStats.totalCollected;
  const todayCash = todayStats.cashIncome;
  const todayNonCash = todayStats.nonCashIncome;

  const activeInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const activePatient = activeInvoice
    ? patients.find((p) => p.id === activeInvoice.patientId)
    : null;

  const invoiceToPrint = invoices.find((inv) => inv.id === printingInvoiceId);
  const patientToPrint = invoiceToPrint
    ? patients.find((p) => p.id === invoiceToPrint.patientId)
    : null;

  const remaining = activeInvoice ? (activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : activeInvoice.netPrice) : 0;
  const payVal = isPartialPay ? (parseInt(payAmountInput) || 0) : remaining;
  const isPayAmountInvalid = isPartialPay && (payVal <= 0 || payVal > remaining);

  // Reset payment inputs when active invoice changes
  useEffect(() => {
    if (activeInvoice) {
      const rem = activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : activeInvoice.netPrice;
      setPayAmountInput(rem.toString());
      setIsPartialPay(false);
    } else {
      setPayAmountInput('');
      setIsPartialPay(false);
    }
  }, [selectedInvoiceId, invoices]);

  // Extract unique Rooms & Dentists dynamically from pending invoices to populate filter selects
  const pendingList = invoices.filter(i => i.status === 'Pending');
  const uniqueRooms = ['All', ...Array.from(new Set(pendingList.map(i => i.room).filter(Boolean) as string[]))];
  const uniqueDentists = ['All', ...Array.from(new Set(pendingList.map(i => i.dentistName).filter(Boolean) as string[]))];

  const handleConfirmPayment = () => {
    if (!selectedInvoiceId || !activeInvoice) return;

    const remainingToPay = activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : activeInvoice.netPrice;
    const paymentVal = isPartialPay ? (parseInt(payAmountInput) || 0) : remainingToPay;

    if (paymentVal <= 0 || paymentVal > remainingToPay) return;

    setIsProcessing(true);

    setTimeout(() => {
      processPayment(selectedInvoiceId, paymentMethod, paymentVal);
      setIsProcessing(false);
      setToastMessage(
        paymentVal === remainingToPay
          ? `Đã thanh toán thành công hóa đơn ${selectedInvoiceId}!`
          : `Đã đóng tạm ứng ₫${paymentVal.toLocaleString()} cho hóa đơn ${selectedInvoiceId}!`
      );
      setShowToast(true);
      setSelectedInvoiceId(null); // Return to list view automatically

      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ─── SCREEN 1: TABLE LIST VIEW (When no invoice is selected) ─── */}
      {!selectedInvoiceId || !activeInvoice ? (
        <div className="space-y-6">
          {/* Header section with Blue/Green Gradient styling */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-150">
                <Icon name="receipt_long" className="text-blue-600 font-bold text-2xl" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Danh Sách Chờ Thanh Toán</h3>
                <p className="text-xs text-slate-500">
                  Hiển thị dạng bảng trực quan giúp quan sát lượng khách lớn. Hỗ trợ lọc nhanh theo phòng khám và bác sĩ phụ trách.
                </p>
              </div>
            </div>

            {/* Global Search Input */}
            <div className="relative w-full md:w-80">
              <Icon name="search" className="absolute left-3 top-2.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Tìm tên khách hàng hoặc mã HD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Mini Stats Summary Widget */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center border border-emerald-150 shrink-0">
                <Icon name="payments" className="text-lg font-bold" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Doanh thu hôm nay</p>
                <p className="text-sm font-extrabold text-emerald-700 font-data-mono">₫{todayRevenue.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center border border-blue-150 shrink-0">
                <Icon name="pending_actions" className="text-lg font-bold" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số ca chờ thanh toán</p>
                <p className="text-sm font-extrabold text-blue-700">{pendingInvoices.length} lượt khách</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-150 shrink-0">
                <Icon name="wallet" className="text-lg font-bold" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tiền mặt thực thu</p>
                <p className="text-sm font-bold text-slate-800 font-data-mono">₫{todayCash.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-150 shrink-0">
                <Icon name="account_balance" className="text-lg font-bold" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ví / Thẻ / Chuyển khoản</p>
                <p className="text-sm font-bold text-slate-800 font-data-mono">₫{todayNonCash.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Filter Bar: Select Dropdowns for Room and Doctor */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Icon name="filter_list" className="text-sm text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Bộ lọc nhanh:</span>
            </div>

            {/* Room Filter Dropdown */}
            <div className="flex flex-col gap-1 min-w-[150px]">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">Tất cả phòng khám</option>
                {uniqueRooms.filter(r => r !== 'All').map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>

            {/* Dentist Filter Dropdown */}
            <div className="flex flex-col gap-1 min-w-[180px]">
              <select
                value={selectedDentist}
                onChange={(e) => setSelectedDentist(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">Tất cả bác sĩ khám</option>
                {uniqueDentists.filter(d => d !== 'All').map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters Shortcut Button (Only shows when filters are active) */}
            {(selectedRoom !== 'All' || selectedDentist !== 'All') && (
              <button
                onClick={() => { setSelectedRoom('All'); setSelectedDentist('All'); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Icon name="close" className="text-xs" />
                Xóa bộ lọc
              </button>
            )}

            {/* Counter Badge */}
            <div className="ml-auto bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">
              Đang tìm thấy: {pendingInvoices.length} ca chờ
            </div>
          </div>

          {/* Main List Area: Table on top, Recent transactions below */}
          <div className="space-y-6">
            
            {/* Table Container (col-span-12 / full width) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-6 py-4 whitespace-nowrap">Mã HD</th>
                      <th className="px-6 py-4 whitespace-nowrap">Khách Hàng / SĐT</th>
                      <th className="px-6 py-4 whitespace-nowrap">Phòng khám</th>
                      <th className="px-6 py-4 whitespace-nowrap">Bác Sĩ Khám</th>
                      <th className="px-6 py-4 whitespace-nowrap">Dịch Vụ Chỉ Định</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Thực Thu</th>
                      <th className="px-6 py-4 text-center whitespace-nowrap">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {pendingInvoices.length > 0 ? (
                      pendingInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-blue-600 uppercase">{inv.id}</span>
                              {inv.status === 'Partially Paid' && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] font-bold rounded w-max whitespace-nowrap animate-pulse">
                                  Trả góp / Tạm ứng
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 text-sm">{inv.patientName}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{inv.patientPhone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 text-[10px] font-bold rounded-md whitespace-nowrap">
                              {inv.room || 'Phòng khám'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {inv.dentistName || 'Chưa cập nhật'}
                          </td>
                          <td className="px-6 py-4 max-w-[220px] truncate font-semibold" title={inv.services.map((s) => s.serviceName).join(', ')}>
                            {inv.services.map((s) => s.serviceName).join(', ')}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <p className="font-mono font-black text-blue-700 text-sm">₫{inv.netPrice.toLocaleString()}</p>
                            {inv.status === 'Partially Paid' && (
                              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">
                                Đã đóng: ₫{(inv.paidAmount || 0).toLocaleString()}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedInvoiceId(inv.id);
                                setPaymentMethod('Cash');
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 mx-auto text-xs"
                            >
                              Thanh toán
                              <Icon name="arrow_forward" className="text-xs" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-20 text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <Icon name="verified" className="text-4xl mb-2 text-slate-300" />
                            <p className="text-sm font-bold text-slate-600">Không có hóa đơn nào khớp bộ lọc!</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Mọi ca khám khớp với bộ lọc đã hoàn tất thanh toán.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick side panel: Recently completed transactions (moved horizontally underneath) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="receipt" className="text-emerald-600 text-base" />
                  Lịch Sử Biên Lai (In Nhanh)
                  <span className="ml-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black font-data-mono">
                    {filteredPaidInvoices.length}
                  </span>
                </h4>

                {/* Date Filter Dropdown styled matching user request */}
                <div className="relative shrink-0">
                  <select
                    value={receiptDateFilter}
                    onChange={(e) => setReceiptDateFilter(e.target.value as any)}
                    className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs pr-8 font-headline text-left"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="yesterday">Hôm qua</option>
                    <option value="7days">7 ngày trước</option>
                    <option value="30days">30 ngày trước</option>
                    <option value="all">Tất cả lịch sử</option>
                  </select>
                </div>
              </div>

              {filteredPaidInvoices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {filteredPaidInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white p-3.5 border border-slate-150 rounded-xl flex flex-col justify-between gap-3 shadow-sm relative pl-4 overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600" />
                      
                      <div className="min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{inv.id}</span>
                          <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {inv.paymentMethod === 'Cash' ? 'Mặt' : inv.paymentMethod === 'Transfer' ? 'CK' : 'Thẻ'}
                          </span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-800 truncate">{inv.patientName}</h5>
                        <p className="text-[10px] text-slate-400 font-bold">₫{(inv.paidAmount || inv.netPrice || 0).toLocaleString()}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setPrintingInvoiceId(inv.id);
                          setShowReceipt(true);
                        }}
                        className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Icon name="print" className="text-xs" />
                        In lại biên lai
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-white rounded-xl border border-slate-150 flex flex-col items-center justify-center">
                  <Icon name="receipt_long" className="text-3xl mb-1.5 text-slate-300" />
                  <span>Không tìm thấy biên lai nào trong mốc thời gian đã chọn ({receiptDateFilter === 'today' ? 'Hôm nay' : receiptDateFilter === 'yesterday' ? 'Hôm qua' : receiptDateFilter === '7days' ? '7 ngày trước' : receiptDateFilter === '30days' ? '30 ngày trước' : 'Tất cả'}).</span>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        
        // ─── SCREEN 2: DEDICATED FULL-SCREEN CHECKOUT (When invoice is selected) ───
        <div className="space-y-6">
          {/* Back button and patient profile header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="w-10 h-10 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Icon name="arrow_back" className="text-lg" />
              </button>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hóa đơn xử lý</span>
                  <span className="font-mono text-xs font-bold text-blue-600 uppercase">
                    {activeInvoice.id}
                  </span>
                  {activePatient?.tier && activePatient.tier !== 'Standard' && (
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      activePatient.tier === 'Diamond' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      activePatient.tier === 'Platinum' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      VIP {activePatient.tier}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{activeInvoice.patientName}</h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <span>Phòng: <strong className="text-slate-800">{activeInvoice.room || 'N/A'}</strong></span>
              <div className="w-px h-4 bg-slate-200" />
              <span>BS chỉ định: <strong className="text-slate-800">{activeInvoice.dentistName || 'Chưa cập nhật'}</strong></span>
            </div>
          </div>

          {/* Checkout layout details & payment portal split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left side: Invoice detailed items & breakdown */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Detailed Services list */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-bold text-xs uppercase text-slate-800">Bảng kê chi tiết dịch vụ</h4>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {activeInvoice.services.map((item, index) => (
                    <div key={index} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">{item.serviceName}</p>
                        <p className="text-[10px] text-slate-400">Mã: {item.serviceId}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        ₫{item.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown cost details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3.5 shadow-sm text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tổng tiền dịch vụ gốc:</span>
                  <span className="font-mono font-bold text-slate-700">₫{activeInvoice.totalPrice.toLocaleString()}</span>
                </div>
                {activeInvoice.memberDiscount > 0 && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Chiết khấu VIP ({activePatient?.tier === 'Diamond' ? '10%' : activePatient?.tier === 'Platinum' ? '5%' : '2%'}):</span>
                    <span className="font-mono font-bold">-₫{activeInvoice.memberDiscount.toLocaleString()}</span>
                  </div>
                )}

                {/* Partial payments history */}
                {activeInvoice.payments && activeInvoice.payments.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Lịch sử thanh toán trước đó:</span>
                    {activeInvoice.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-emerald-650 font-semibold pl-2 border-l border-emerald-500">
                        <span>Lần {idx + 1} ({new Date(p.date).toLocaleDateString('vi-VN')} - {p.method === 'Cash' ? 'Tiền mặt' : p.method === 'Transfer' ? 'Chuyển khoản' : 'POS'}):</span>
                        <span className="font-mono">₫{p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-slate-800 font-bold bg-slate-50 p-2 rounded mt-1">
                      <span>Đã thanh toán lũy kế:</span>
                      <span className="font-mono">₫{(activeInvoice.paidAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {/* Warning note */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-400 text-[10px] italic">
                  <span>* Phòng khám không tính phí thuốc hay BHYT</span>
                  <span className="bg-slate-200/50 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-slate-500">Đã chốt sổ</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-800 text-sm">
                    {activeInvoice.status === 'Partially Paid' ? 'Số dư nợ cần đóng:' : 'Thực thu thanh toán:'}
                  </span>
                  <span className="text-xl font-black text-blue-700 font-mono">
                    ₫{(activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : activeInvoice.netPrice).toLocaleString()}
                  </span>
                </div>
              </div>

            </div>

            {/* Right side: Payment Methods & VietQR Card dynamic mockup */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chọn phương thức thanh toán</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`flex flex-col items-center gap-1.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'Cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-blue-600/20 text-slate-500'
                    }`}
                  >
                    <Icon name="payments" className="text-2xl" />
                    <span className="text-[10px] font-extrabold">Tiền mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer')}
                    className={`flex flex-col items-center gap-1.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'Transfer'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-blue-600/20 text-slate-500'
                    }`}
                  >
                    <Icon name="qr_code_2" className="text-2xl" />
                    <span className="text-[10px] font-extrabold">Chuyển khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card')}
                    className={`flex flex-col items-center gap-1.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'Card'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-blue-600/20 text-slate-500'
                    }`}
                  >
                    <Icon name="credit_card" className="text-2xl" />
                    <span className="text-[10px] font-extrabold">Thẻ / POS</span>
                  </button>
                </div>
              </div>

              {/* Conditional Rendering for Payment details */}
              {paymentMethod === 'Transfer' && (
                <div className="animate-in slide-in-from-top-3 duration-200">
                  {/* VietQR Dynamic Card Mockup in Blue styling */}
                  <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-blue-500/30 relative overflow-hidden flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <svg className="h-4.5 w-auto" viewBox="0 0 70 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 4 L7 14 L15 1 L11 1 L7 9 L4 4 Z" fill="#EF4444" />
                          <text x="17" y="14" fill="#EF4444" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">iet</text>
                          <text x="36" y="14" fill="#3B82F6" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">QR</text>
                        </svg>
                      </div>
                      <div className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-bold text-blue-200 border border-white/20">
                        NAPAS 247
                      </div>
                    </div>
                    
                    <div className="bg-white p-2 rounded-2xl shadow-md mb-4 flex items-center justify-center overflow-hidden">
                      <img 
                        src={`https://img.vietqr.io/image/techcombank-19074150102019-compact.png?amount=${payVal}&addInfo=GOODSMILE%20${activeInvoice.id}&accountName=NHA%20KHOA%20GOODSMILE%20PRO`}
                        alt="VietQR Code" 
                        className="w-36 h-36 object-contain" 
                      />
                    </div>
                    
                    <div className="w-full text-left space-y-1.5 bg-white/5 rounded-xl p-3 border border-white/10 text-xs text-blue-100">
                      <div className="flex justify-between">
                        <span className="opacity-70">Chủ tài khoản:</span>
                        <span className="font-bold text-white">NHA KHOA GOODSMILE PRO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">Số tài khoản:</span>
                        <span className="font-bold font-data-mono text-blue-200">1907 4150 1020 19</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">Số tiền chuyển:</span>
                        <span className="font-extrabold text-blue-300">₫{payVal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-1.5">
                        <span className="opacity-70">Nội dung CK:</span>
                        <span className="font-extrabold text-blue-200 font-mono">GOODSMILE {activeInvoice.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600 animate-in slide-in-from-top-3 duration-200 flex items-start gap-2.5">
                  <Icon name="info" className="text-blue-650 font-bold" />
                  <div>
                    <p className="font-bold text-slate-700">Yêu cầu quẹt thẻ ngân hàng</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sử dụng thiết bị POS tại quầy thu ngân để tiến hành thanh toán thẻ (ATM, Visa, Mastercard) cho khách hàng. Click "Hoàn tất đóng phí" sau khi giao dịch POS thành công.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === 'Cash' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600 animate-in slide-in-from-top-3 duration-200 flex items-start gap-2.5">
                  <Icon name="payments" className="text-blue-650 font-bold" />
                  <div>
                    <p className="font-bold text-slate-700">Yêu cầu thu tiền mặt</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Nhận và kiểm đếm tiền mặt trực tiếp từ khách hàng. Thực hiện trả lại tiền thừa (nếu có) trước khi hoàn tất đóng phí trên hệ thống.
                    </p>
                  </div>
                </div>
              )}

              {/* Option to pay partially */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPartialPay}
                    onChange={(e) => {
                      setIsPartialPay(e.target.checked);
                      if (activeInvoice) {
                        const rem = activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : activeInvoice.netPrice;
                        setPayAmountInput(rem.toString());
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-650 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>Thanh toán từng phần (Trả góp / Tạm ứng)</span>
                </label>

                {isPartialPay && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Số tiền thanh toán kỳ này</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">₫</span>
                        <input
                          type="number"
                          value={payAmountInput}
                          onChange={(e) => setPayAmountInput(e.target.value)}
                          placeholder="Nhập số tiền..."
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[500000, 1000000, 2000000, 5000000, 10000000].map((val) => {
                        if (val >= remaining) return null;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPayAmountInput(val.toString())}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-650 hover:bg-slate-50 cursor-pointer"
                          >
                            ₫{val.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>

                    {payVal <= 0 ? (
                      <p className="text-[10px] text-rose-500 font-bold">Vui lòng nhập số tiền lớn hơn 0đ</p>
                    ) : payVal > remaining ? (
                      <p className="text-[10px] text-rose-500 font-bold">
                        Không vượt quá số tiền còn nợ (₫{remaining.toLocaleString()})
                      </p>
                    ) : (
                      <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded text-[10px] font-bold text-blue-700 border border-blue-100/30">
                        <span>Dư nợ còn lại sau kỳ này:</span>
                        <span className="font-mono">₫{(remaining - payVal).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Checkout actions using Green or Blue colors */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing || isPayAmountInvalid}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs ${
                    isProcessing || isPayAmountInvalid
                      ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin text-sm" />
                      Đang thực hiện thanh toán...
                    </>
                  ) : (
                    <>
                      <Icon name="check_circle" className="text-sm" />
                      Hoàn Tất Đóng Phí (₫{payVal.toLocaleString()})
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeInvoice) {
                      setPrintingInvoiceId(activeInvoice.id);
                      setShowReceipt(true);
                    }
                  }}
                  className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer text-xs"
                >
                  <Icon name="print" className="text-sm" />
                  Xem trước & In hóa đơn K80
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Success payment Toast */}
      <div
        className={`fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 z-50 ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <Icon name="check_circle" className="text-emerald-500" />
        <div>
          <p className="font-bold text-xs text-white">Xử lý thành công</p>
          <p className="text-[10px] text-slate-300 mt-0.5">{toastMessage}</p>
        </div>
      </div>

      {/* Print receipt preview Modal */}
      {showReceipt && invoiceToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <h2 className="font-bold text-lg text-slate-800">BIÊN LAI THANH TOÁN</h2>
              <p className="text-xs text-slate-500 font-bold">Nha Khoa GoodSmile Pro</p>
              <p className="text-[10px] text-slate-400">Kiều Mai, Từ Liêm, Hà Nội • ĐT: 1900 6789</p>
            </div>

            <hr className="border-t border-dashed border-slate-200" />

            <div className="text-xs space-y-1.5 text-slate-700">
              <p className="flex justify-between">
                <strong>Mã hóa đơn:</strong> <span className="font-mono font-bold uppercase">{invoiceToPrint.id}</span>
              </p>
              <p className="flex justify-between">
                <strong>Ngày xuất:</strong> <span>{new Date(invoiceToPrint.createdAt).toLocaleString('vi-VN')}</span>
              </p>
              <p className="flex justify-between">
                <strong>Khách hàng:</strong> <span className="font-bold text-slate-800">{invoiceToPrint.patientName}</span>
              </p>
              <p className="flex justify-between">
                <strong>Số điện thoại:</strong> <span>{invoiceToPrint.patientPhone}</span>
              </p>
              <p className="flex justify-between">
                <strong>Phòng điều trị:</strong> <span>{invoiceToPrint.room || 'N/A'}</span>
              </p>
              <p className="flex justify-between">
                <strong>Bác sĩ khám:</strong> <span>{invoiceToPrint.dentistName || 'Chưa rõ'}</span>
              </p>
            </div>

            <hr className="border-t border-dashed border-slate-200" />

            <table className="w-full text-xs text-left text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-1">Dịch vụ điều trị</th>
                  <th className="py-1 text-right">Chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoiceToPrint.services.map((s, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-slate-800">{s.serviceName}</td>
                    <td className="py-2 text-right font-mono text-slate-700">₫{s.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="border-t border-dashed border-slate-200" />

            <div className="text-xs space-y-1.5 text-right text-slate-600">
              <p className="flex justify-between">
                <span>Tổng chi phí dịch vụ:</span>
                <span className="font-mono text-slate-700 font-bold">₫{invoiceToPrint.totalPrice.toLocaleString()}</span>
              </p>
              {invoiceToPrint.memberDiscount > 0 && (
                <p className="flex justify-between text-blue-600 font-medium">
                  <span>Chiết khấu VIP ({patientToPrint?.tier === 'Diamond' ? '10%' : patientToPrint?.tier === 'Platinum' ? '5%' : '2%'}):</span>
                  <span className="font-mono font-bold">-₫{invoiceToPrint.memberDiscount.toLocaleString()}</span>
                </p>
              )}
              <p className="flex justify-between text-[11px] text-slate-700 pt-1.5 border-t border-slate-150">
                <span>Tổng phải thanh toán:</span>
                <span className="font-mono font-bold">₫{invoiceToPrint.netPrice.toLocaleString()}</span>
              </p>
              {invoiceToPrint.payments && invoiceToPrint.payments.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100 text-[10px]">
                  {invoiceToPrint.payments.map((p, idx) => (
                    <p key={idx} className="flex justify-between text-slate-500">
                      <span>Lần {idx + 1} ({new Date(p.date).toLocaleDateString('vi-VN')}):</span>
                      <span className="font-mono">₫{p.amount.toLocaleString()}</span>
                    </p>
                  ))}
                  <p className="flex justify-between text-emerald-600 font-bold">
                    <span>Đã thanh toán lũy kế:</span>
                    <span className="font-mono">₫{(invoiceToPrint.paidAmount || 0).toLocaleString()}</span>
                  </p>
                </div>
              )}
              <p className="flex justify-between text-sm font-extrabold text-blue-750 pt-1.5 border-t border-slate-150">
                <span>Còn nợ chưa đóng:</span>
                <span className="font-mono text-lg font-black">₫{(invoiceToPrint.remainingAmount !== undefined ? invoiceToPrint.remainingAmount : invoiceToPrint.netPrice).toLocaleString()}</span>
              </p>
            </div>

            {/* VietQR Quick Payment Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Quét VietQR để thanh toán</p>
              <img 
                src={`https://img.vietqr.io/image/techcombank-19074150102019-compact.png?amount=${invoiceToPrint.remainingAmount !== undefined ? invoiceToPrint.remainingAmount : invoiceToPrint.netPrice}&addInfo=Thanh%20toan%20hoa%20don%20${invoiceToPrint.id}&accountName=NHA%20KHOA%20GOODSMILE%20PRO`}
                alt="VietQR Code" 
                className="w-36 h-36 object-contain mix-blend-multiply" 
              />
              <p className="text-[9px] text-slate-400 font-bold">Ngân hàng Techcombank · STK: 1907 4150 1020 19</p>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-dashed border-slate-200 space-y-0.5">
              <p className="font-medium">* Chúc Quý khách luôn có nụ cười rạng rỡ và khỏe mạnh! *</p>
              <p>Hẹn gặp lại quý khách lần sau.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReceipt(false);
                  setPrintingInvoiceId(null);
                }}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Đang gửi lệnh in đến máy in hóa đơn K80...');
                  setShowReceipt(false);
                  setPrintingInvoiceId(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
              >
                Xác Nhận In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
