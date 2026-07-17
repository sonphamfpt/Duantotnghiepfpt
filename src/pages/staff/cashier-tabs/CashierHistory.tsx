import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { Invoice } from '../../../types/clinic';

export const CashierHistory: React.FC = () => {
  const { invoices } = useClinic();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('TODAY');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showPrintToast, setShowPrintToast] = useState(false);

  // Filter paid invoices
  const paidInvoices = invoices.filter((inv) => {
    const isPaid = inv.status === 'Paid' || inv.status === 'Partially Paid';
    const matchesSearch =
      inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientPhone.includes(searchQuery);

    const matchesMethod = methodFilter === 'ALL' || inv.paymentMethod === methodFilter;

    let matchesTime = true;
    const paymentDates = (inv.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
    const invoiceDate = paymentDates.length > 0 ? new Date(Math.max(...paymentDates)) : new Date(inv.createdAt);
    const now = new Date();
    
    if (timeFilter === 'TODAY') {
      matchesTime = invoiceDate.toDateString() === now.toDateString();
    } else if (timeFilter === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      matchesTime = invoiceDate >= weekAgo;
    } else if (timeFilter === 'MONTH') {
      matchesTime = invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
    } else if (timeFilter === 'YEAR') {
      matchesTime = invoiceDate.getFullYear() === now.getFullYear();
    } else if (timeFilter === 'CUSTOM') {
      const selected = new Date(customDate);
      matchesTime = invoiceDate.toDateString() === selected.toDateString();
    }

    return isPaid && matchesSearch && matchesMethod && matchesTime;
  });

  // Statistics
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.netPrice || 0), 0);
  const totalCount = paidInvoices.length;

  const cashRevenue = paidInvoices
    .filter(inv => inv.paymentMethod === 'Cash')
    .reduce((sum, inv) => sum + (inv.paidAmount || inv.netPrice || 0), 0);
    
  const cardRevenue = paidInvoices
    .filter(inv => inv.paymentMethod === 'Card')
    .reduce((sum, inv) => sum + (inv.paidAmount || inv.netPrice || 0), 0);
    
  const transferRevenue = paidInvoices
    .filter(inv => inv.paymentMethod === 'Transfer')
    .reduce((sum, inv) => sum + (inv.paidAmount || inv.netPrice || 0), 0);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleReprint = (id: string) => {
    setSelectedInvoiceId(id);
    setShowPrintToast(true);
    setTimeout(() => {
      setShowPrintToast(false);
    }, 2500);
  };

  const getMethodBadge = (method?: Invoice['paymentMethod']) => {
    switch (method) {
      case 'Cash':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Card':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Transfer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Wallet':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMethodLabel = (method?: Invoice['paymentMethod']) => {
    switch (method) {
      case 'Cash':
        return 'Tiền mặt';
      case 'Card':
        return 'Ví / Thẻ';
      case 'Transfer':
        return 'Chuyển khoản';
      case 'Wallet':
        return 'Ví thành viên';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Filters */}
      <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="history" className="text-amber-600 font-bold" />
          <div>
            <h3 className="font-bold text-on-surface">Lịch Sử Thanh Toán</h3>
            <p className="text-xs text-on-surface-variant">Tra cứu và in lại biên lai của toàn bộ hóa đơn đã hoàn tất</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant text-sm" />
            <input
              type="text"
              placeholder="Tìm theo tên bệnh nhân, SĐT hoặc mã HD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div className="w-full md:w-40">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="Cash">Tiền mặt</option>
              <option value="Card">Ví / Thẻ POS</option>
              <option value="Transfer">Chuyển khoản</option>
              <option value="Wallet">Ví thành viên</option>
            </select>
          </div>

          <div className="w-full md:w-40 flex flex-col gap-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="TODAY">Hôm nay</option>
              <option value="WEEK">7 ngày qua</option>
              <option value="MONTH">Tháng này</option>
              <option value="ALL">Tất cả thời gian</option>
              <option value="CUSTOM">Chọn ngày...</option>
            </select>

            {timeFilter === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-600 animate-in fade-in slide-in-from-top-2"
              />
            )}
          </div>
        </div>

        {/* Statistics Summary - Dashboard Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-200/50 flex items-center justify-center text-amber-700">
                <Icon name="receipt_long" className="text-sm" />
              </div>
              <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Tổng Thu</p>
            </div>
            <p className="text-xl font-black text-amber-700">₫{totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-amber-600/80 mt-1 font-semibold">{totalCount} hóa đơn</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-200/50 flex items-center justify-center text-emerald-700">
                <Icon name="payments" className="text-sm" />
              </div>
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Tiền Mặt</p>
            </div>
            <p className="text-xl font-black text-emerald-700">₫{cashRevenue.toLocaleString()}</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-200/50 flex items-center justify-center text-blue-700">
                <Icon name="credit_card" className="text-sm" />
              </div>
              <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Thẻ / POS</p>
            </div>
            <p className="text-xl font-black text-blue-700">₫{cardRevenue.toLocaleString()}</p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-200/50 flex items-center justify-center text-purple-700">
                <Icon name="account_balance" className="text-sm" />
              </div>
              <p className="text-[10px] text-purple-800 font-bold uppercase tracking-wider">Chuyển Khoản</p>
            </div>
            <p className="text-xl font-black text-purple-700">₫{transferRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Table list */}
        <div className={`${selectedInvoice ? 'col-span-12 lg:col-span-7' : 'col-span-12'} transition-all duration-300`}>
          <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Mã HD</th>
                    <th className="px-6 py-3.5">Khách hàng</th>
                    <th className="px-6 py-3.5">Thực thu</th>
                    <th className="px-6 py-3.5 text-center">Phương thức</th>
                    <th className="px-6 py-3.5">Thời gian</th>
                    <th className="px-6 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs">
                  {paidInvoices.length > 0 ? (
                    paidInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`hover:bg-amber-600/5 transition-all cursor-pointer ${
                          selectedInvoiceId === inv.id ? 'bg-amber-600/5 font-semibold' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-data-mono text-amber-600 font-bold">{inv.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-on-surface">{inv.patientName}</p>
                          <p className="text-[10px] text-on-surface-variant">{inv.patientPhone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-amber-700">₫{(inv.paidAmount || 0).toLocaleString()}</p>
                          {inv.status === 'Partially Paid' && (
                            <p className="text-[9px] text-slate-500 mt-0.5">Dư nợ: ₫{(inv.remainingAmount || 0).toLocaleString()}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getMethodBadge(inv.paymentMethod)}`}>
                              {getMethodLabel(inv.paymentMethod)}
                            </span>
                            {inv.status === 'Partially Paid' && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 text-[8px] font-bold rounded">
                                Trả góp / Tạm ứng
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant font-medium">
                          {new Date(inv.createdAt).toLocaleDateString('vi-VN')} {new Date(inv.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReprint(inv.id);
                            }}
                            className="p-1 border border-outline hover:border-amber-600 text-on-surface-variant hover:text-amber-600 rounded transition-all cursor-pointer"
                            title="In lại hóa đơn"
                          >
                            <Icon name="print" className="text-sm block" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-on-surface-variant italic">
                        <Icon name="history" className="text-4xl text-outline mb-2" />
                        <p>Chưa có hóa đơn thanh toán nào trong lịch sử.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected invoice drawer detail */}
        {selectedInvoice && (
          <div className="col-span-12 lg:col-span-5 animate-in slide-in-from-right duration-250">
            <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-600/5 rounded-bl-full flex items-center justify-center pointer-events-none">
                <Icon name="check_circle" className="text-amber-600/20 text-3xl translate-x-2 -translate-y-2" />
              </div>

              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-bold text-sm text-on-surface">Chi Tiết Hóa Đơn {selectedInvoice.id}</h3>
                <button
                  onClick={() => setSelectedInvoiceId(null)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-on-surface-variant">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-outline">Bệnh nhân</span>
                    <strong className="text-on-surface">{selectedInvoice.patientName}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-outline">Số điện thoại</span>
                    <strong className="text-on-surface">{selectedInvoice.patientPhone}</strong>
                  </div>
                  <div className="mt-1">
                    <span className="block text-[9px] uppercase font-bold text-outline">Thời gian tạo</span>
                    <strong className="text-on-surface">{new Date(selectedInvoice.createdAt).toLocaleString('vi-VN')}</strong>
                  </div>
                  <div className="mt-1">
                    <span className="block text-[9px] uppercase font-bold text-outline">Phương thức</span>
                    <strong className="text-on-surface">{getMethodLabel(selectedInvoice.paymentMethod)}</strong>
                  </div>
                </div>

                <div className="border-t border-outline-variant/30 pt-3 space-y-2">
                  <span className="block text-[9px] uppercase font-bold text-outline mb-1">Dịch vụ thực hiện</span>
                  {selectedInvoice.services.map((srv, idx) => (
                    <div key={idx} className="flex justify-between font-medium">
                      <span>{srv.serviceName}</span>
                      <span className="font-data-mono">₫{srv.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-outline-variant/30 pt-3 space-y-1.5 text-right font-medium text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Tổng tiền niêm yết:</span>
                    <span>₫{selectedInvoice.totalPrice.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.memberDiscount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Giảm giá thành viên:</span>
                      <span>-₫{selectedInvoice.memberDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-semibold text-on-surface border-t border-outline-variant/20 pt-2 mt-1">
                    <span>Tổng thực thu chỉ định:</span>
                    <span>₫{selectedInvoice.netPrice.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                    <div className="space-y-1 text-[11px] pt-1">
                      {selectedInvoice.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between text-emerald-650">
                          <span>Đợt {idx + 1} ({new Date(p.date).toLocaleDateString('vi-VN')} - {p.method === 'Cash' ? 'Tiền mặt' : p.method === 'Transfer' ? 'Chuyển khoản' : 'Thẻ'}):</span>
                          <span>₫{p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-emerald-750 font-bold bg-emerald-50/50 px-1.5 py-0.5 rounded mt-1">
                        <span>Tổng lũy kế đã thu:</span>
                        <span>₫{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-amber-700 border-t border-dashed border-outline-variant pt-2 mt-1">
                    <span>Còn nợ chưa thu:</span>
                    <span>₫{(selectedInvoice.remainingAmount !== undefined ? selectedInvoice.remainingAmount : selectedInvoice.netPrice).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 flex gap-2 border-t border-outline-variant/30">
                  <button
                    onClick={() => handleReprint(selectedInvoice.id)}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Icon name="print" className="text-sm" />
                    In lại biên lai
                  </button>
                  <button
                    onClick={() => alert(`Đã gửi email biên lai hóa đơn điện tử cho ${selectedInvoice.patientName}!`)}
                    className="py-2 px-3 border border-outline text-on-surface-variant hover:text-on-surface rounded text-xs font-bold transition-all cursor-pointer"
                    title="Gửi Email"
                  >
                    <Icon name="mail" className="text-sm block" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printing toast notification */}
      <div
        className={`fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 ${
          showPrintToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <Icon name="print" className="text-amber-400 animate-pulse" />
        <div>
          <p className="font-bold text-xs">Đang truyền lệnh in...</p>
          <p className="text-[10px] opacity-80">
            Hóa đơn {selectedInvoiceId} đã được chuyển tới hàng đợi máy in nhiệt.
          </p>
        </div>
      </div>
    </div>
  );
};
