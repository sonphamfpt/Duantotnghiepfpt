import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const PatientBilling: React.FC = () => {
  const { invoices } = useClinic();
  const patientId = 'P-8821';
  const patientName = 'Trần Nguyễn Minh';
  
  const patientInvoices = invoices.filter(i => i.patientId === patientId);
  const pendingInvoices = patientInvoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid');
  const paidInvoices = patientInvoices.filter(i => i.status === 'Paid');

  const [printInvoice, setPrintInvoice] = useState<any>(null); // State quản lý việc mở modal in
  const [searchQuery, setSearchQuery] = useState('');

  // Sắp xếp hóa đơn mới nhất lên đầu và chỉ lấy 5 giao dịch gần nhất
  const sortedPaidInvoices = [...paidInvoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const filteredPaidInvoices = sortedPaidInvoices.filter(inv => {
    return inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const displayInvoices = filteredPaidInvoices.slice(0, 5);

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
                    {inv.services.map((s, i) => (
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
                    onClick={() => alert(`Hướng dẫn đóng phí:\nVui lòng tới quầy Thu ngân và cung cấp mã hóa đơn ${inv.id} để quét mã thanh toán VietQR động hoặc quẹt thẻ POS.`)}
                    className={`w-full mt-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                      isPartiallyPaid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {isPartiallyPaid ? 'Đóng tiền đợt tiếp theo' : 'Hướng dẫn thanh toán'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Khối Lịch sử (Đã thanh toán) - Chiếm 2 cột trên Desktop */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <Icon name="task_alt" className="text-secondary" />
              Lịch sử giao dịch (5 gần nhất)
            </h3>
            
            <div className="flex gap-2">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant text-sm" />
                <input
                  type="text"
                  placeholder="Tìm mã HD, PTTT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
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
                        {inv.services.map((s, i) => (
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
    </>
  );
};
