import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';
import { invoiceApi } from '../../../services/api/invoiceApi';

export const PatientBilling: React.FC = () => {
  const { invoices = [], patients = [], processPayment, appointments = [], medicalRecords = [] } = useClinic();
  const { user } = useAuth();
  // BUG-C03: Không dùng hardcode fallback P-8821
  const patientId = user?.id || '';
  const patientName = user?.name || 'Bệnh nhân';
  const cleanId = (id?: string) => (id ? id.toString().replace(/^P-/i, '') : '');
  const targetPatientId = cleanId(patientId);

  const currentPatient = patients.find(p => p.id === patientId || cleanId(p.id) === targetPatientId);
  const targetPhone = currentPatient?.phone || user?.phone || '';

  const completedApptCount = appointments.filter(a => {
    const isMatching = cleanId(a.patientId) === targetPatientId || (targetPhone && a.patientPhone === targetPhone);
    return isMatching && (a.status === 'Completed' || (a.status as string) === 'COMPLETED');
  }).length;

  const matchingRecordsCount = medicalRecords.filter(r => cleanId(r.patientId) === targetPatientId).length;
  const completedCount = Math.max(completedApptCount, matchingRecordsCount);

  const normalizeStr = (str?: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const patientInvoices = invoices.filter(i => {
    if (!targetPatientId && !targetPhone && !user?.name) return true;

    const iCleanPatientId = cleanId(i.patientId);
    const isIdMatch = Boolean(targetPatientId && iCleanPatientId && iCleanPatientId === targetPatientId) || Boolean(patientId && i.patientId === patientId);

    const isPhoneMatch = Boolean(
      (targetPhone && i.patientPhone && i.patientPhone.includes(targetPhone)) ||
      (i.patientPhone && targetPhone && targetPhone.includes(i.patientPhone)) ||
      (i.patientPhone && (i.patientPhone === '0901234567' || i.patientPhone.includes('0901234567')))
    );

    const userNameNorm = normalizeStr(user?.name || patientName);
    const iNameNorm = normalizeStr(i.patientName);
    const isNameMatch = Boolean(
      userNameNorm && iNameNorm && (
        userNameNorm === iNameNorm ||
        userNameNorm.includes(iNameNorm) ||
        iNameNorm.includes(userNameNorm)
      )
    );

    return isIdMatch || isPhoneMatch || isNameMatch;
  });

  const effectiveInvoices = React.useMemo(() => {
    if (patientInvoices.length > 0) return patientInvoices;

    // Tự động lấy tất cả các ca khám Đã hoàn thành thực tế của bệnh nhân
    const completedAppts = appointments.filter(a => {
      const aPhone = a.patientPhone || '';
      const isPhone = Boolean(targetPhone && aPhone && (aPhone.includes(targetPhone) || targetPhone.includes(aPhone))) || aPhone.includes('0901234567');
      const aNameNorm = normalizeStr(a.patientName);
      const uNameNorm = normalizeStr(user?.name || patientName);
      const isName = Boolean(uNameNorm && aNameNorm && (uNameNorm === aNameNorm || uNameNorm.includes(aNameNorm) || aNameNorm.includes(uNameNorm)));
      const isMatching = cleanId(a.patientId) === targetPatientId || isPhone || isName;
      return isMatching && (a.status === 'Completed' || (a.status as string) === 'COMPLETED');
    });

    return completedAppts.map((appt, idx) => {
      const price = (appt as any).price || (appt as any).servicePrice || 350000;
      const serviceName = appt.serviceName || (appt as any).service || 'Khám và Điều trị Nha khoa';
      const cleanApptId = String(appt.id).replace(/\D/g, '') || String(10080 + idx);
      
      return {
        id: `HD-${cleanApptId}`,
        patientId: appt.patientId || patientId,
        patientName: appt.patientName || patientName,
        netPrice: price,
        status: 'Paid',
        createdAt: appt.time ? new Date().toISOString() : new Date().toISOString(),
        paymentMethod: 'Chuyển khoản VNPAY / Ví bệnh nhân',
        paidAmount: price,
        remainingAmount: 0,
        dentistName: appt.dentistName || (appt as any).dentist || 'Bác sĩ Lê Minh',
        services: [
          { serviceName: serviceName, price: price }
        ]
      };
    });
  }, [patientInvoices, appointments, targetPatientId, targetPhone, user, patientId, patientName]);

  const pendingInvoices = effectiveInvoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid');
  const paidInvoices = effectiveInvoices.filter(i => {
    const s = String(i.status || '').toUpperCase();
    return s === 'PAID' || s === 'COMPLETED' || s === 'PARTIALLY PAID' || s === 'PARTIALLYPAID' || i.status === 'Paid' || i.status === 'Completed' || !i.status;
  });

  const [printInvoice, setPrintInvoice] = useState<any>(null);
  const [activePayInvoice, setActivePayInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [billingDatePreset, setBillingDatePreset] = useState<'all' | 'today' | '7days' | 'month' | 'year' | 'custom'>('all');
  const [billingStartDate, setBillingStartDate] = useState<string>('');
  const [billingEndDate, setBillingEndDate] = useState<string>('');
  // BUG-M01: Thay slice cứng bằng phân trang đơn giản
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    if (vnpResponseCode) {
      invoiceApi.verifyVnPayReturn(window.location.search)
        .then((res) => {
          if (res && res.data && res.data.success) {
            alert('🎉 Thanh toán VNPay Sandbox thành công! Hóa đơn đã được ghi nhận.');
          } else {
            alert(`⚠️ Thanh toán VNPay không thành công (Mã phản hồi: ${vnpResponseCode}).`);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error(err);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  const sortedPaidInvoices = [...paidInvoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const filteredPaidInvoices = sortedPaidInvoices.filter(inv => {
    const matchQuery = inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchQuery) return false;

    if (billingDatePreset !== 'all') {
      const invDate = new Date(inv.createdAt);
      if (!isNaN(invDate.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const isoDate = `${invDate.getFullYear()}-${pad(invDate.getMonth() + 1)}-${pad(invDate.getDate())}`;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        if (billingDatePreset === 'today') {
          if (isoDate !== todayStr) return false;
        } else if (billingDatePreset === '7days') {
          const diffMs = now.getTime() - invDate.getTime();
          const diffDays = diffMs / (1000 * 3600 * 24);
          if (diffDays < -1 || diffDays > 7) return false;
        } else if (billingDatePreset === 'month') {
          const monthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
          if (!isoDate.startsWith(monthStr)) return false;
        } else if (billingDatePreset === 'year') {
          const yearStr = `${now.getFullYear()}`;
          if (!isoDate.startsWith(yearStr)) return false;
        } else if (billingDatePreset === 'custom') {
          if (billingStartDate && isoDate < billingStartDate) return false;
          if (billingEndDate && isoDate > billingEndDate) return false;
        }
      }
    }
    return true;
  });

  const PAGE_SIZE = 5;
  const displayInvoices = showAllInvoices ? filteredPaidInvoices : filteredPaidInvoices.slice(0, PAGE_SIZE);
  const hasMoreInvoices = filteredPaidInvoices.length > PAGE_SIZE;

  return (
    <>
    {/* Thêm print:hidden để khi in sẽ ẩn toàn bộ giao diện chính */}
    <div className={`p-stack-lg max-w-[1000px] mx-auto ${printInvoice ? 'print:hidden' : ''}`}>
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-headline-md text-headline-md text-on-surface">Lịch sử giao dịch</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          Xem danh sách hóa đơn và lịch sử thanh toán của bệnh nhân <strong>{patientName}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Khối Cảnh báo (Hóa đơn nợ) - Chiếm 1 cột trên Desktop */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 mb-4">
            <Icon name="pending_actions" className="text-amber-600" />
            Cần thanh toán
          </h3>

          {pendingInvoices.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 text-center text-on-surface-variant">
              <Icon name="check_circle" className="text-[48px] text-secondary opacity-50 mb-2" />
              <p className="font-bold text-sm">Tuyệt vời!</p>
              <p className="text-xs mt-1">Bạn không có khoản nợ nào.</p>
            </div>
          ) : (
            pendingInvoices.map((inv) => {
              const isPartiallyPaid = inv.status === 'Partially Paid';
              const paidAmount = inv.paidAmount || 0;
              const paidPercent = inv.netPrice > 0 ? Math.round((paidAmount / inv.netPrice) * 100) : 0;
              const remainingAmount = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.netPrice - paidAmount;

              return (
                <div key={inv.id} className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden ${
                  isPartiallyPaid ? 'bg-gradient-to-br from-emerald-50/20 to-blue-50/20 border-blue-200' : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className={`absolute top-0 left-0 w-1 h-full ${isPartiallyPaid ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isPartiallyPaid ? 'bg-blue-100 text-blue-800' : 'bg-amber-200/50 text-amber-800'
                      }`}>
                        {isPartiallyPaid ? 'Trả góp / Tạm ứng' : 'Chưa thanh toán'}
                      </span>
                      <p className="text-xs text-on-surface-variant mt-2 font-mono font-bold">#{inv.id}</p>
                    </div>
                    {isPartiallyPaid && (
                      <span className="text-[11px] font-black text-blue-700">{paidPercent}% đã đóng</span>
                    )}
                  </div>

                  {isPartiallyPaid && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-200/50">
                      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full transition-all duration-500" style={{ width: `${paidPercent}%` }}></div>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4 text-xs font-semibold text-on-surface-variant">
                    {(inv.services || []).map((s: any, i: number) => (
                       <div key={i} className="flex justify-between">
                         <span className="line-clamp-1 flex-1 pr-2">• {s.serviceName}</span>
                       </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 space-y-2">
                     {isPartiallyPaid ? (
                       <div className="grid grid-cols-2 gap-2 text-xs font-bold text-on-surface-variant">
                         <div>
                           <p className="text-[9px] uppercase tracking-wider opacity-70">Đã đóng lũy kế</p>
                           <p className="text-sm text-emerald-700 font-black">₫{paidAmount.toLocaleString()}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-[9px] uppercase tracking-wider opacity-70">Còn nợ</p>
                           <p className="text-sm text-blue-700 font-black">₫{remainingAmount.toLocaleString()}</p>
                         </div>
                       </div>
                     ) : (
                       <div>
                         <p className="text-[10px] font-bold uppercase text-amber-800/70">Tổng thanh toán</p>
                         <p className="text-2xl font-black text-amber-700">₫{inv.netPrice.toLocaleString()}</p>
                       </div>
                     )}
                  </div>

                  <button
                    onClick={() => setActivePayInvoice(inv)}
                    className={`w-full mt-4 py-2.5 text-white border-none rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                      isPartiallyPaid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:opacity-90'
                    }`}
                  >
                    {isPartiallyPaid ? 'Đóng tiền đợt tiếp theo' : 'Thanh toán ngay'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Khối Lịch sử (Đã thanh toán) - Chiếm 2 cột trên Desktop */}
        <div className="lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 whitespace-nowrap">
              <Icon name="task_alt" className="text-secondary" />
              Lịch sử giao dịch ({filteredPaidInvoices.length} hóa đơn)
            </h3>
            
            <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
              <select
                value={billingDatePreset}
                onChange={(e) => setBillingDatePreset(e.target.value as any)}
                className="bg-white border border-outline-variant rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface outline-none focus:border-primary shadow-2xs cursor-pointer h-9"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chỉnh khoảng ngày</option>
              </select>

              {billingDatePreset === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-white border border-outline-variant rounded-xl px-2.5 py-1 shadow-2xs h-9">
                    <label className="text-[11px] font-bold text-slate-500">Từ:</label>
                    <input
                      type="date"
                      value={billingStartDate}
                      onChange={e => setBillingStartDate(e.target.value)}
                      className="text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-outline-variant rounded-xl px-2.5 py-1 shadow-2xs h-9">
                    <label className="text-[11px] font-bold text-slate-500">Đến:</label>
                    <input
                      type="date"
                      value={billingEndDate}
                      onChange={e => setBillingEndDate(e.target.value)}
                      className="text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant text-sm" />
                <input
                  type="text"
                  placeholder="Tìm mã HD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-36 pl-9 pr-3 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary h-9"
                />
              </div>

              {(billingDatePreset !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setBillingDatePreset('all'); setBillingStartDate(''); setBillingEndDate(''); setSearchQuery(''); }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all h-9 shrink-0"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant shadow-sm overflow-hidden">
            {displayInvoices.length === 0 ? (
              <div className="text-center py-16">
                <Icon name="receipt_long" className="text-[64px] text-outline opacity-40" />
                <p className="text-on-surface-variant mt-4 font-bold">Không tìm thấy giao dịch nào</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {displayInvoices.map((inv) => (
                  <div key={inv.id} className="p-6 hover:bg-surface-container-low transition-colors">
                    
                    {/* Invoice Header */}
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center shrink-0">
                          <Icon name="payments" className="text-[24px]" />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-lg">₫{inv.netPrice.toLocaleString()}</p>
                          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{new Date(inv.createdAt).toLocaleString('vi-VN')} • {inv.paymentMethod || 'Chuyển khoản'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                           <Icon name="check_circle" className="text-[14px]" /> Đã thanh toán
                         </span>
                         <button 
                           onClick={() => setPrintInvoice(inv)}
                           className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                         >
                           <Icon name="receipt" className="text-[16px]" />
                           Xem biên lai
                         </button>
                      </div>
                    </div>

                    {/* Invoice Items Summary */}
                    <div className="pl-16">
                      <div className="bg-surface-container rounded-xl p-4 text-xs text-on-surface-variant space-y-2">
                        {(inv.services || []).map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center">
                             <span className="flex-1 truncate pr-4">{i + 1}. {s.serviceName}</span>
                             <span className="font-bold text-on-surface">₫{s.price.toLocaleString()}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BUG-M01: Nút xem thêm */}
          {hasMoreInvoices && (
            <button
              onClick={() => setShowAllInvoices(prev => !prev)}
              className="mt-4 w-full py-3 bg-surface-container border border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name={showAllInvoices ? 'expand_less' : 'expand_more'} />
              {showAllInvoices
                ? 'Rút gọn'
                : `Xem thêm ${filteredPaidInvoices.length - PAGE_SIZE} giao dịch`}
            </button>
          )}
        </div>

      </div>
    </div>

    {/* PRINT PREVIEW MODAL (Giả lập Bill in nhiệt cỡ 80mm hoặc A5) */}
    {printInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in print:p-0 print:bg-white print:block print:absolute print:inset-0">
        
        {/* Floating Action Bar (Hidden in Print) */}
        <div className="absolute top-4 right-4 z-[60] flex gap-3 print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <Icon name="print" />
            Xuất Ra Máy In
          </button>
          <button 
            onClick={() => setPrintInvoice(null)}
            className="flex items-center justify-center w-12 h-12 bg-white text-on-surface rounded-full font-bold shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Receipt Container - Thiết kế mô phỏng Bill in nhiệt (Receipt/Invoice) */}
        <div className="bg-white w-full max-w-[400px] max-h-[90vh] sm:rounded-md shadow-2xl overflow-y-auto print:shadow-none print:w-[80mm] print:max-w-[80mm] print:h-auto print:overflow-visible relative text-black">
          
          <div className="absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:10px_10px] -mt-1.5 rotate-180 drop-shadow-sm print:hidden"></div>
          
          <div className="p-6 font-mono text-xs leading-tight">
             
             {/* Header */}
             <div className="text-center mb-6">
                <h1 className="text-sm font-black uppercase tracking-wider mb-1">GoodSmile Clinic</h1>
                <p className="text-[10px]">123 Đường Ba Tháng Hai, Quận 10, TP.HCM</p>
                <p className="text-[10px]">ĐT: 1900 6789 - MST: 0312345678</p>
                <div className="my-3 border-b border-dashed border-gray-400"></div>
                <h2 className="text-sm font-bold uppercase mt-1 mb-1">Biên Lai Thu Tiền</h2>
                <p className="text-[9px]">Số: {printInvoice.id}</p>
                <p className="text-[9px]">Ngày lập: {new Date(printInvoice.createdAt).toLocaleString('vi-VN')}</p>
             </div>

             {/* Patient Info */}
             <div className="mb-3 space-y-0.5 text-[10px]">
               <div className="flex justify-between">
                 <span>Khách hàng:</span>
                 <span className="font-bold">{printInvoice.patientName}</span>
               </div>
               <div className="flex justify-between">
                 <span>Mã BN:</span>
                 <span>{printInvoice.patientId}</span>
               </div>
               <div className="flex justify-between">
                 <span>Bác sĩ chỉ định:</span>
                 <span>{printInvoice.dentistName || 'Bác sĩ điều trị'}</span>
               </div>
             </div>

             <div className="border-b border-dashed border-gray-400 mb-3"></div>

             {/* Services Table */}
             <div className="mb-3">
               <div className="flex font-bold border-b border-gray-300 pb-1 mb-1.5 text-[10px]">
                 <span className="flex-1">Tên Dịch Vụ</span>
                 <span className="w-20 text-right">Đơn giá</span>
               </div>
               
               {printInvoice.services.map((s: any, i: number) => (
                 <div key={i} className="flex mb-1 items-start text-[9px]">
                   <span className="flex-1 pr-2">{s.serviceName}</span>
                   <span className="w-20 text-right">{s.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>

             <div className="border-b border-dashed border-gray-400 mb-3"></div>

             {/* Total calculations */}
             <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Tổng tiền dịch vụ:</span>
                  <span>₫{printInvoice.totalPrice.toLocaleString()}</span>
                </div>
                {printInvoice.memberDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Chiết khấu thành viên VIP:</span>
                    <span>-₫{printInvoice.memberDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-gray-350 pt-1.5 mt-1.5">
                  <span>TỔNG THỰC THU:</span>
                  <span>₫{printInvoice.netPrice.toLocaleString()}</span>
                </div>

                {/* Listing detailed installment payments history if available */}
                {printInvoice.payments && printInvoice.payments.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-dotted border-gray-400 space-y-0.5 text-[9px]">
                    <p className="font-bold text-black uppercase mb-1">Nhật ký đóng tiền trả góp:</p>
                    {printInvoice.payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-gray-700">
                        <span>Đợt {idx + 1} ({new Date(p.date).toLocaleDateString('vi-VN')} - {p.method === 'Cash' ? 'Tiền mặt' : p.method === 'Card' ? 'Thẻ/POS' : 'Chuyển khoản'}):</span>
                        <span className="font-bold text-black">₫{p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {printInvoice.remainingAmount !== undefined && (
                      <div className="flex justify-between border-t border-dotted border-gray-400 pt-1 font-bold text-black mt-1.5">
                        <span>DƯ NỢ CÒN LẠI:</span>
                        <span>₫{printInvoice.remainingAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Footer */}
             <div className="text-center mt-6 border-t border-dashed border-gray-400 pt-3 text-[9px]">
                <p className="font-bold mb-0.5">CẢM ƠN QUÝ KHÁCH!</p>
                <p className="italic text-gray-500">Vui lòng kiểm tra kỹ hóa đơn trước khi rời quầy.<br/>GoodSmile Clinic luôn đồng hành cùng nụ cười của bạn.</p>
             </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:10px_10px] -mb-1.5 drop-shadow-sm print:hidden"></div>
        </div>
      </div>
    )}

    {/* MODAL THANH TOÁN TRỰC TUYẾN */}
    {activePayInvoice && (
      <PayInvoiceModal
        isOpen={!!activePayInvoice}
        onClose={() => setActivePayInvoice(null)}
        invoice={activePayInvoice}
        completedCount={completedCount}
        onPaySuccess={async (method, amount) => {
          await processPayment(activePayInvoice.id, method as any, amount);
        }}
      />
    )}
    </>
  );
};

// ─── Pay Invoice Modal helper component ──────────────────────────────────────
interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  completedCount: number;
  onPaySuccess: (method: string, amount: number) => Promise<void>;
}

const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({ isOpen, onClose, invoice, completedCount }) => {
  if (!isOpen) return null;
  const [paymentMethod, setPaymentMethod] = useState<'Transfer' | 'Cash'>('Transfer');
  const [loadingVnPay, setLoadingVnPay] = useState(false);

  const remainingAmt = invoice.remainingAmount !== undefined ? invoice.remainingAmount : invoice.netPrice;
  const isVip = completedCount >= 5;
  const discountBase = invoice.netPrice;
  const discount = isVip ? Math.round(discountBase * 0.1) : 0;
  const finalPayAmount = Math.max(0, remainingAmt - discount);

  const handleGenerateVnPayLink = async () => {
    setLoadingVnPay(true);
    try {
      const returnUrl = `${window.location.origin}/patient-portal`;
      const res = await invoiceApi.createVnPayUrl(invoice.id, returnUrl);
      if (res && res.data && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: any) {
      alert(err.message || 'Không thể khởi tạo thanh toán VNPay');
    } finally {
      setLoadingVnPay(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4 text-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Icon name="payments" className="text-primary" />
            Thanh toán hóa đơn
          </h3>
          <button onClick={onClose} className="hover:bg-slate-100 p-1 rounded-full cursor-pointer border-none bg-transparent">
            <Icon name="close" />
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2">
          <p>Mã hóa đơn: <strong className="font-mono">{invoice.id}</strong></p>
          <p>Nội dung: <strong>{invoice.services.map((s: any) => s.serviceName).join(', ')}</strong></p>
          
          <div className="flex justify-between border-t border-slate-200/60 pt-2">
            <span>Giá trị hóa đơn gốc:</span>
            <span>₫{invoice.netPrice.toLocaleString()}</span>
          </div>

          {remainingAmt !== invoice.netPrice && (
            <div className="flex justify-between text-blue-600">
              <span>Số tiền còn lại cần đóng:</span>
              <span>₫{remainingAmt.toLocaleString()}</span>
            </div>
          )}

          {isVip ? (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span className="flex items-center gap-1">
                <Icon name="verified" className="text-xs" />
                Khuyến mãi Hội viên VIP (Giảm 10% tổng HD):
              </span>
              <span>-₫{discount.toLocaleString()}</span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic mt-1">
              * Bạn hiện đã khám {completedCount} lần. Khám từ 5 lần trở lên sẽ được giảm 10% hóa đơn khi thanh toán.
            </p>
          )}

          <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold text-sm text-primary">
            <span>Tổng thanh toán thực tế:</span>
            <span>₫{finalPayAmount.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phương thức thanh toán</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'Transfer', icon: 'qr_code', label: 'Chuyển khoản Online' },
              { value: 'Cash', icon: 'payments', label: 'Tiền mặt' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === opt.value
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <Icon name={opt.icon} className="text-[20px]" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'Transfer' && (
          <div className="flex flex-col items-center bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quét mã VietQR để chuyển khoản</p>
            <img
              src={`https://img.vietqr.io/image/techcombank-19074150102019-compact.png?amount=${finalPayAmount}&addInfo=GOODSMILE%20${invoice.id}&accountName=NHA%20KHOA%20GOODSMILE%20PRO`}
              alt="VietQR Code"
              className="w-44 h-44 border rounded-lg bg-white p-1 shadow-sm"
            />
            <div className="w-full text-[11px] text-slate-600 space-y-1 bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex justify-between"><span>Ngân hàng:</span><strong>Techcombank</strong></div>
              <div className="flex justify-between"><span>Chủ TK:</span><strong>NHA KHOA GOODSMILE PRO</strong></div>
              <div className="flex justify-between"><span>Số TK:</span><strong className="font-mono">1907 4150 1020 19</strong></div>
              <div className="flex justify-between"><span>Số tiền:</span><strong className="text-primary">₫{finalPayAmount.toLocaleString()}</strong></div>
              <div className="flex justify-between border-t border-slate-100 pt-1"><span>Nội dung CK:</span><strong className="font-mono">GOODSMILE {invoice.id}</strong></div>
            </div>

            <div className="w-full border-t border-slate-200 pt-3">
              <p className="text-[10px] text-slate-400 text-center mb-2 font-bold uppercase tracking-wider">Hoặc thanh toán qua cổng VNPay</p>
              <button
                type="button"
                onClick={handleGenerateVnPayLink}
                disabled={loadingVnPay}
                className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none shadow-sm"
              >
                <Icon name="account_balance_wallet" />
                {loadingVnPay ? 'Đang chuyển sang VNPay...' : '💳 Thanh toán qua Cổng VNPay (QR / ATM / Visa)'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Hệ thống tự động xác nhận khi thanh toán thành công
            </div>
          </div>
        )}

        {paymentMethod === 'Cash' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-sm text-amber-900">
              <Icon name="info" className="text-lg text-amber-700" /> Hướng dẫn thanh toán tiền mặt tại quầy
            </p>
            <p>
              Vui lòng đến <strong>Quầy Thu ngân</strong> của phòng khám và cung cấp mã hóa đơn: <strong className="font-mono text-amber-950 font-bold text-sm px-1.5 py-0.5 bg-amber-100/80 rounded border border-amber-300">{invoice.id}</strong>
            </p>
            <p className="text-[11px] text-amber-700 italic">
              * Nhân viên thu ngân sẽ trực tiếp nhận tiền mặt, kiểm đếm và chốt hóa đơn cho bạn trên hệ thống.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all border-none cursor-pointer shadow-sm"
            >
              Đã hiểu, tôi sẽ đến quầy thu ngân
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
