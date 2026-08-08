import React, { useState, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { BookingModal } from '../../../components/BookingModal';
import { appointmentApi } from '../../../services/api/appointmentApi';

export const ReceptionistCSKH: React.FC = () => {
  const { appointments, cancelAppointment, checkInPatient } = useClinic();
  const { showConfirm, showAlert } = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');

  // Lưu trạng thái đã xử lý vào localStorage riêng (tránh nhầm với key cũ)
  const [resolvedIds, setResolvedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('goodsmile_cskh_resolved') || '[]');
    } catch {
      return [];
    }
  });

  const [rebookModal, setRebookModal] = useState<{
    isOpen: boolean;
    patientName?: string;
    patientPhone?: string;
    taskId?: string;
  }>({ isOpen: false });

  const handleResolve = (id: string) => {
    const next = [...resolvedIds, id];
    setResolvedIds(next);
    localStorage.setItem('goodsmile_cskh_resolved', JSON.stringify(next));
  };

  // Danh sách NoShow chưa xử lý (biến mất ngay khi resolve)
  const noShowList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return appointments.filter(a => {
      if (a.status !== 'NoShow') return false;
      if (resolvedIds.includes(a.id)) return false; // Đã xử lý → ẩn ngay
      if (!q) return true;
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [appointments, resolvedIds, searchQuery]);

  const formatMissedDate = (appt: any): string => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    let dateStr = '';
    let timeStr = appt.time || '';
    if (appt.time?.includes('@')) {
      dateStr = appt.time.split('@')[0].trim();
      timeStr = appt.time.split('@')[1].trim();
    }
    const displayDate = (!dateStr || dateStr === todayStr) ? 'Hôm nay' : dateStr;
    return `${displayDate} lúc ${timeStr}`;
  };

  const handleCancelByStaff = async (id: string, patientName: string) => {
    const isConfirmed = await showConfirm({
      title: 'Xác nhận bệnh nhân hủy lịch',
      message: `Bệnh nhân ${patientName} đã xác nhận không đến khám. Lịch hẹn sẽ được chuyển sang trạng thái ĐÃ HỦY và lưu vào lịch sử.`,
      type: 'error',
      confirmLabel: 'Xác nhận hủy lịch',
      cancelLabel: 'Bỏ qua',
    });

    if (isConfirmed) {
      await cancelAppointment(id, 'Bệnh nhân xác nhận hủy sau khi CSKH liên hệ');
      handleResolve(id);
      await showAlert({
        title: 'Đã hủy lịch hẹn',
        message: `Lịch hẹn của ${patientName} đã chuyển sang Đã hủy thành công.`,
        type: 'success',
      });
    }
  };

  const handleOpenRebook = (patientName: string, patientPhone: string, taskId: string) => {
    setRebookModal({ isOpen: true, patientName, patientPhone, taskId });
  };

  const handleCloseRebook = () => {
    if (rebookModal.taskId) handleResolve(rebookModal.taskId);
    setRebookModal({ isOpen: false });
  };

  // Tổng số NoShow trong toàn bộ hệ thống (kể cả những cái đã resolve bởi localStorage)
  const totalNoShow = appointments.filter(a => a.status === 'NoShow').length;

  // Empty state
  if (totalNoShow === 0) {
    return (
      <div className="p-stack-lg animate-in fade-in duration-200">
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Icon name="check_circle" className="text-5xl text-emerald-500" />
          </div>
          <p className="font-bold text-lg text-slate-700">Không có bệnh nhân lỡ hẹn!</p>
          <p className="text-sm mt-1 text-slate-400">
            Tất cả lịch hẹn đều đã được xử lý hoặc check-in đúng giờ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-stack-lg space-y-6 animate-in fade-in duration-200">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <Icon name="phone_callback" className="text-amber-600" />
            CSKH — Bệnh nhân lỡ hẹn
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {noShowList.length > 0 ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Icon name="warning" className="text-[16px]" />
                Còn {noShowList.length} bệnh nhân chưa được liên hệ
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Icon name="check_circle" className="text-[16px]" />
                Tất cả đã được xử lý xong
              </span>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, mã lịch hẹn..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <Icon name="info" className="text-amber-500 text-[18px] shrink-0" />
        <span>
          <strong>Quy trình CSKH:</strong> Gọi xác nhận → <strong>Check-in muộn</strong> (nếu khách đã đến), <strong>Đặt lại lịch</strong> (nếu chọn giờ mới), hoặc <strong>Xác nhận khách hủy</strong> (để lưu vào lịch sử hủy).
        </span>
      </div>

      {/* ── NoShow List ── */}
      {noShowList.length > 0 ? (
        <div className="flex flex-col gap-3">
          {noShowList.map(appt => (
            <div
              key={appt.id}
              className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-1"
            >
              <div className="flex items-stretch">
                {/* Dải màu nhận diện */}
                <div className="w-1.5 shrink-0 bg-amber-400" />
                <div className="flex-1 p-4">

                  {/* Row 1: Thông tin bệnh nhân + nút gọi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Icon name="person_off" className="text-[20px] text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-on-surface">{appt.patientName}</p>
                          <span className="text-[10px] font-mono text-on-surface-variant bg-slate-100 px-1.5 py-0.5 rounded">{appt.id}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            <Icon name="schedule" className="text-[10px]" />
                            Lỡ hẹn
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          <Icon name="calendar_today" className="text-[11px] inline mr-0.5 align-middle text-amber-500" />
                          {formatMissedDate(appt)}
                          <span className="mx-1.5 text-slate-300">·</span>
                          {appt.serviceName}
                          <span className="mx-1.5 text-slate-300">·</span>
                          {appt.dentistName?.replace('Bác sĩ ', 'BS. ')}
                        </p>
                      </div>
                    </div>

                    {/* Nút gọi nhanh */}
                    <a
                      href={`tel:${appt.patientPhone.replace(/\s/g, '')}`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all"
                    >
                      <Icon name="call" className="text-[14px]" />
                      {appt.patientPhone}
                    </a>
                  </div>

                  {/* Row 2: Thông tin ghi nhận từ hệ thống */}
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                    <Icon name="info" className="text-orange-400 text-[14px] mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-800 leading-relaxed">
                      <span className="font-bold">Hệ thống ghi nhận: </span>
                      {appt.cancelReason || 'Bệnh nhân không check-in sau 15 phút kể từ giờ hẹn.'}
                    </p>
                  </div>

                  {/* Row 3: Nút hành động chuẩn (chỉ 3 lựa chọn rõ ràng) */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          // 1. Khôi phục trạng thái từ NoShow -> Confirmed trên Backend
                          await appointmentApi.updateStatus(appt.id, 'Confirmed', 'Khách đến trễ và đã check-in vào khám');
                        } catch (err) {
                          console.warn('Cập nhật trạng thái lịch hẹn:', err);
                        }
                        // 2. Check-in bệnh nhân vào hàng chờ khám
                        checkInPatient(appt.patientId, appt.dentistId, undefined, appt.serviceName, appt.id);
                        handleResolve(appt.id);
                        await showAlert({
                          title: 'Check-in muộn thành công!',
                          message: `Đã khôi phục trạng thái lịch hẹn và đưa bệnh nhân ${appt.patientName} vào hàng chờ khám của Bác sĩ.`,
                          type: 'success',
                        });
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      title="Khách trễ giờ nhưng vẫn đến phòng khám → Khôi phục trạng thái & Đưa thẳng vào hàng chờ khám"
                    >
                      <Icon name="how_to_reg" className="text-[14px]" />
                      Bệnh nhân đã đến (Check-in)
                    </button>

                    <button
                      onClick={() => handleOpenRebook(appt.patientName, appt.patientPhone, appt.id)}
                      className="px-3.5 py-2 bg-[#005eb8] text-white rounded-xl text-xs font-bold hover:bg-[#00478d] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Icon name="edit_calendar" className="text-[14px]" />
                      Đặt lại lịch
                    </button>

                    <button
                      onClick={() => handleCancelByStaff(appt.id, appt.patientName)}
                      className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Sau khi liên hệ, khách xác nhận không đến khám nữa"
                    >
                      <Icon name="cancel" className="text-[14px]" />
                      Khách xác nhận hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400">
          {searchQuery ? (
            <>
              <Icon name="search_off" className="text-5xl mb-3 text-slate-300" />
              <p className="font-bold text-slate-500">Không tìm thấy bệnh nhân nào</p>
              <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm.</p>
            </>
          ) : (
            <>
              <Icon name="task_alt" className="text-5xl mb-3 text-slate-300" />
              <p className="font-bold text-slate-500">Đã xử lý hết!</p>
              <p className="text-sm mt-1">Tất cả bệnh nhân lỡ hẹn đã được liên hệ xong.</p>
            </>
          )}
        </div>
      )}

      {/* Modal đặt lại lịch */}
      <BookingModal
        isOpen={rebookModal.isOpen}
        onClose={handleCloseRebook}
        defaultPatientName={rebookModal.patientName}
        defaultPatientPhone={rebookModal.patientPhone}
      />
    </div>
  );
};
