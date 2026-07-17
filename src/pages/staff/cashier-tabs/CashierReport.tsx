import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const CashierReport: React.FC = () => {
  const { invoices } = useClinic();

  // Shift details
  const initialCash = 15200000; // 15.2M VND starter fund
  const todayDateStr = new Date().toDateString();

  // Filter invoices paid in today's shift
  const todayInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = inv.status === 'Paid' || inv.status === 'Partially Paid';
      const paymentDates = (inv.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
      const invoiceDate = paymentDates.length > 0 ? new Date(Math.max(...paymentDates)) : new Date(inv.createdAt);
      return isPaid && invoiceDate.toDateString() === todayDateStr;
    });
  }, [invoices, todayDateStr]);

  // Calculate shift income per payment method
  const cashIncome = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const paymentDates = (inv.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
      const invoiceDate = paymentDates.length > 0 ? new Date(Math.max(...paymentDates)) : new Date(inv.createdAt);
      if (invoiceDate.toDateString() !== todayDateStr) return sum;

      if (inv.payments && inv.payments.length > 0) {
        return sum + inv.payments.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0);
      }
      if (inv.status === 'Paid' && inv.paymentMethod === 'Cash') {
        return sum + inv.netPrice;
      }
      return sum;
    }, 0);
  }, [invoices, todayDateStr]);

  const nonCashIncome = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const paymentDates = (inv.payments || []).map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
      const invoiceDate = paymentDates.length > 0 ? new Date(Math.max(...paymentDates)) : new Date(inv.createdAt);
      if (invoiceDate.toDateString() !== todayDateStr) return sum;

      if (inv.payments && inv.payments.length > 0) {
        return sum + inv.payments.filter(p => p.method !== 'Cash').reduce((s, p) => s + p.amount, 0);
      }
      if (inv.status === 'Paid' && inv.paymentMethod && inv.paymentMethod !== 'Cash') {
        return sum + inv.netPrice;
      }
      return sum;
    }, 0);
  }, [invoices, todayDateStr]);

  const totalCollected = cashIncome + nonCashIncome;
  const expectedPhysicalCash = initialCash + cashIncome;

  // Form states
  const [useBillCounter, setUseBillCounter] = useState(true);
  const [actualCashInput, setActualCashInput] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Bill counter denominations
  const [billCounts, setBillCounts] = useState<Record<number, number>>({
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });

  const calculatedBillSum = useMemo(() => {
    return Object.entries(billCounts).reduce(
      (sum, [denom, count]) => sum + Number(denom) * count,
      0
    );
  }, [billCounts]);

  const actualCash = useMemo(() => {
    if (useBillCounter) return calculatedBillSum;
    return parseFloat(actualCashInput) || 0;
  }, [useBillCounter, calculatedBillSum, actualCashInput]);

  const discrepancy = actualCash - expectedPhysicalCash;

  const handleBillCountChange = (denom: number, val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setBillCounts(prev => ({ ...prev, [denom]: qty }));
  };

  const handleShiftClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!useBillCounter && !actualCashInput) {
      alert('Vui lòng nhập số tiền mặt thực tế kiểm đếm!');
      return;
    }

    setIsSubmitted(true);
    alert('Báo cáo ca trực đã được chốt và khóa sổ thành công!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Premium Gradient Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-100">
            <Icon name="balance" className="text-xl" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">Báo Cáo Chốt Ca & Đối Soát Quỹ</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thực hiện chốt doanh thu, đếm tiền mặt ngăn kéo và đối chiếu chênh lệch cuối ngày làm việc.
            </p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-2 border border-slate-200 rounded-xl text-right shrink-0">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Thời gian chốt số liệu</p>
          <p className="text-xs font-bold text-slate-700 font-data-mono">{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Shift Summary & closing verification form */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Shift Revenue Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng Doanh Thu Ca Trực</span>
              <div>
                <p className="text-2xl font-black text-blue-700 font-data-mono">₫{totalCollected.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                  <Icon name="shopping_bag" className="text-xs" />
                  Đã thu {todayInvoices.length} hóa đơn trong hôm nay
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tiền Mặt Ngăn Kéo (Lý thuyết)</span>
              <div>
                <p className="text-2xl font-black text-emerald-700 font-data-mono">₫{expectedPhysicalCash.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                  <Icon name="info" className="text-xs" />
                  Gồm ₫{initialCash.toLocaleString()} vốn đầu ca
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/40 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chuyển Khoản & Thẻ POS</span>
              <div>
                <p className="text-2xl font-black text-purple-700 font-data-mono">₫{nonCashIncome.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                  <Icon name="account_balance" className="text-xs" />
                  Chuyển thẳng tài khoản phòng khám
                </p>
              </div>
            </div>
          </div>

          {/* Form: Cash verification & discrepancies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Icon name="calculate" className="text-amber-600 text-lg" />
                Kiểm Kê Tiền Mặt Ngăn Kéo Thực Tế
              </h3>
              
              {/* Toggle Input Mode */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUseBillCounter(true)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${useBillCounter ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Đếm theo Mệnh giá
                </button>
                <button
                  type="button"
                  onClick={() => setUseBillCounter(false)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${!useBillCounter ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Nhập số tổng thủ công
                </button>
              </div>
            </div>

            {isSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-6 text-center space-y-4 shadow-inner">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <Icon name="check" className="text-2xl font-bold" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-black text-sm uppercase tracking-wide">Chốt Sổ Ca Trực Thành Công</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                    Báo cáo ca trực đã được khóa số và kết chuyển thành công lúc **{new Date().toLocaleTimeString('vi-VN')}** vào số liệu kế toán tổng thể của hệ thống.
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl border border-emerald-200/50 max-w-sm mx-auto text-left text-xs space-y-1 text-slate-700">
                  <p><strong>Tiền mặt khai báo:</strong> ₫{actualCash.toLocaleString()}</p>
                  <p><strong>Chênh lệch quỹ:</strong> {discrepancy === 0 ? 'Khớp tuyệt đối (0đ)' : discrepancy > 0 ? `Thừa ₫${discrepancy.toLocaleString()}` : `Hụt ₫${Math.abs(discrepancy).toLocaleString()}`}</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setActualCashInput('');
                      setReportNotes('');
                      setBillCounts({ 500000: 0, 200000: 0, 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0 });
                    }}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow transition-all cursor-pointer active:scale-95"
                  >
                    Bàn giao và mở ca trực mới
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleShiftClose} className="space-y-5">
                
                {/* Mode 1: Denominations Bill Counter Grid */}
                {useBillCounter && (
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000].map((denom) => {
                        const count = billCounts[denom] || 0;
                        const subTotal = denom * count;
                        return (
                          <div key={denom} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 font-data-mono">₫{denom.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5 font-data-mono">
                                = ₫{subTotal.toLocaleString()}
                              </p>
                            </div>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleBillCountChange(denom, e.target.value)}
                              className="w-16 px-2.5 py-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-data-mono"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-xs text-amber-900">
                      <span className="font-bold">Tổng cộng tiền mặt đếm mệnh giá:</span>
                      <span className="font-extrabold font-data-mono text-sm">₫{calculatedBillSum.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Mode 2: Manual Total cash input */}
                {!useBillCounter && (
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 max-w-md">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tổng số tiền mặt thực tế kiểm đếm được *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">₫</span>
                      <input
                        type="number"
                        required
                        placeholder="Nhập tổng số tiền mặt đếm được trong két..."
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-data-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Discrepancy & comparison section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">Kết quả đối soát quỹ tiền mặt</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">So sánh giữa tiền ngăn kéo (Lý thuyết) và tiền thực tế đếm được.</p>
                  </div>
                  <div
                    className={`px-4 py-3 rounded-xl text-xs font-extrabold border text-center font-data-mono flex items-center justify-center gap-1.5 shadow-sm ${
                      discrepancy === 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : discrepancy > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}
                  >
                    <Icon name={discrepancy === 0 ? 'check_circle' : discrepancy > 0 ? 'add_circle' : 'warning'} className="text-base" />
                    {discrepancy === 0 ? (
                      'Khớp tuyệt đối (0đ)'
                    ) : discrepancy > 0 ? (
                      `Dư thừa: +₫${discrepancy.toLocaleString()}`
                    ) : (
                      `Thiếu hụt: -₫${Math.abs(discrepancy).toLocaleString()}`
                    )}
                  </div>
                </div>

                {/* Closing Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Ghi chú & bàn giao ca trực</label>
                  <textarea
                    rows={3}
                    placeholder="Điền ghi chú bàn giao (Ví dụ: bàn giao lẻ tiền mặt, thẻ POS hết giấy, v.v...)"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Icon name="lock_person" />
                    KHÓA SỔ & CHỐT CA TRỰC
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Today's Transactions review list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="task" className="text-blue-600" />
                Danh Sách Giao Dịch Trong Ca Trực ({todayInvoices.length})
              </h4>
            </div>
            
            <div className="overflow-x-auto max-h-72 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Mã HD</th>
                    <th className="px-5 py-3">Khách hàng</th>
                    <th className="px-5 py-3">Phương thức</th>
                    <th className="px-5 py-3 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {todayInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 font-mono text-[10px] text-blue-600 font-bold">{inv.id}</td>
                      <td className="px-5 py-2.5">{inv.patientName}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          inv.paymentMethod === 'Cash' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          inv.paymentMethod === 'Card' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {inv.paymentMethod === 'Cash' ? 'Tiền mặt' : inv.paymentMethod === 'Transfer' ? 'Chuyển khoản' : 'Thẻ POS'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-bold">₫{inv.netPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                  {todayInvoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                        Chưa ghi nhận giao dịch nào trong ca trực hôm nay
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Closing regulations & History */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Regulations Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="gavel" className="text-amber-700 text-base" /> Quy trình đóng két bàn giao
            </h4>
            <ol className="text-xs text-slate-500 space-y-3 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Kiểm đếm két:</strong> Đếm kỹ tất cả mệnh giá giấy tờ tiền tệ còn lại trong ngăn kéo.
              </li>
              <li>
                <strong>Khai báo:</strong> Sử dụng bảng đếm mệnh giá chi tiết bên trái để giảm thiểu sai số.
              </li>
              <li>
                <strong>Đối chiếu chênh lệch:</strong> Nếu thừa/thiếu hụt, ghi rõ lý do vào ghi chú bàn giao ca.
              </li>
              <li>
                <strong>Ký xác nhận:</strong> Tiến hành in giấy và ký đối chiếu với nhân viên tiếp quản ca tiếp theo.
              </li>
            </ol>
          </div>

          {/* Shift Closing logs history list */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-inner">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Lịch sử chốt quỹ ca gần đây
            </h4>
            
            <div className="space-y-3.5">
              {[
                { date: '15/07 - Ca Sáng', time: '12:05', status: 'Khớp quỹ (0đ)', isError: false },
                { date: '14/07 - Ca Chiều', time: '20:10', status: 'Khớp quỹ (0đ)', isError: false },
                { date: '14/07 - Ca Sáng', time: '12:01', status: 'Thừa +20,000đ (Bệnh nhân quên lấy tiền thối)', isError: true, warning: true },
                { date: '13/07 - Ca Chiều', time: '20:05', status: 'Khớp quỹ (0đ)', isError: false },
              ].map((log, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col gap-1 shadow-sm">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>{log.date}</span>
                    <span>Chốt lúc {log.time}</span>
                  </div>
                  <p className={`text-xs font-bold ${log.warning ? 'text-amber-800' : log.isError ? 'text-red-700' : 'text-emerald-700'}`}>
                    {log.status}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
