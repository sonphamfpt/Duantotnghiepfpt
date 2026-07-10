import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import { BookingModal } from '../../components/BookingModal';
import { Icon } from '../../components/Icon';
import { AIChatbot } from '../../components/AIChatbot';

// Tab page imports
import { PatientBooking } from './tabs/PatientBooking';
import { PatientAppointments } from './tabs/PatientAppointments';
import { PatientQueue } from './tabs/PatientQueue';
import { PatientRecords } from './tabs/PatientRecords';
import { PatientBilling } from './tabs/PatientBilling';

// ─── Home Tab (Dashboard Overview) ────────────────────────────────────────────
const PatientHome: React.FC = () => {
  const { patients, medicalRecords, invoices } = useClinic();
  const { user } = useAuth();

  const patientId = user?.id || 'P-8821';
  const patient = patients.find(p => p.id === patientId) || {
    id: patientId,
    name: user?.name || 'Trần Nguyễn Minh',
    phone: user?.phone || '0901 234 567',
    age: 28,
    gender: 'Nam',
    criticalAllergy: 'Không',
    condition: 'Bình thường'
  };

  const records = medicalRecords.filter(r => r.patientId === patientId);
  const patientInvoices = invoices.filter(i => i.patientId === patientId || i.patientName === patient.name);
  const pendingInvoices = patientInvoices.filter(i => i.status === 'Pending');

  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Extract prescription from latest record
  const latestRecordWithPrescription = records.find(r => r.prescription || r.notes?.includes('| Đơn thuốc:'));
  
  const activeMedicines = React.useMemo(() => {
    if (!latestRecordWithPrescription) return [];
    
    if (latestRecordWithPrescription.prescription?.medicines) {
      return latestRecordWithPrescription.prescription.medicines;
    }
    
    const notes = latestRecordWithPrescription.notes || '';
    const rxIndex = notes.indexOf('| Đơn thuốc:');
    if (rxIndex !== -1) {
      const rxPart = notes.substring(rxIndex + 12).trim();
      const drugs = rxPart.split(';');
      return drugs.map(drug => {
        const trimmedDrug = drug.trim();
        if (!trimmedDrug) return null;
        const match = trimmedDrug.match(/(.*?)\s*\(\s*(\d+)\s*([^)]*)\)\s*-\s*(.*)/);
        if (match) {
          return {
            name: match[1].trim(),
            dose: match[4].trim(),
            duration: `${match[2]} ${match[3].trim()}`,
            note: ''
          };
        }
        return {
          name: trimmedDrug,
          dose: 'Theo chỉ dẫn của bác sĩ',
          duration: 'Đang điều trị',
          note: ''
        };
      }).filter(Boolean) as Array<{ name: string; dose: string; duration: string; note: string }>;
    }
    return [];
  }, [latestRecordWithPrescription]);

  // Removed handlePayInvoice and handleRecharge

  return (
    <div className="p-stack-lg grid grid-cols-12 gap-gutter">
      {/* Left Column: Primary Actions & Records */}
      <div className="col-span-12 lg:col-span-8 space-y-gutter">

        {/* Premium Banner CTA */}
        <section className="premium-glow rounded-xl p-8 text-on-primary shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-lg">
            <h3 className="font-headline-lg text-headline-lg text-white">Bạn đã sẵn sàng cho buổi kiểm tra định kỳ?</h3>
            <p className="text-body-lg font-body-lg opacity-90 text-white/90">
              Lần lấy cao răng gần nhất của bạn là 6 tháng trước. Hãy duy trì nụ cười rạng rỡ với buổi tư vấn chuyên nghiệp.
            </p>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-secondary-container text-on-secondary-container px-8 py-4 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-lg cursor-pointer"
            >
              <Icon name="calendar_add_on" />
              Đặt lịch hẹn mới
            </button>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none flex items-center justify-center">
            <Icon name="dentistry" className="text-[180px] text-white" />
          </div>
        </section>

        {/* Treatment Progress Timeline */}
        <div className="bg-white rounded-xl border border-outline-variant p-6 role-accent-patient">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-headline-sm text-headline-sm">Tiến độ điều trị chỉnh nha</h4>
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-label-md font-bold rounded-full">
              Đang thực hiện
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-4 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-container transform -translate-y-1/2 -z-0"></div>
            <div className="absolute top-1/2 left-0 w-3/4 h-1 bg-secondary transform -translate-y-1/2 -z-0"></div>

            {[
              { label: 'Tư vấn khám', done: true },
              { label: 'Lấy dấu hàm', done: true },
              { label: 'Đeo khay niềng', active: true },
              { label: 'Hoàn tất', done: false },
            ].map((milestone, i) => (
              <div key={i} className="z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                  milestone.done ? 'bg-secondary text-on-secondary' :
                  milestone.active ? 'bg-secondary text-on-secondary animate-pulse' :
                  'bg-surface-container text-outline border border-outline-variant'
                }`}>
                <Icon name={milestone.done || milestone.active ? (milestone.active ? 'medical_services' : 'check') : 'verified'} />
              </div>
                <p className={`mt-2 text-label-md font-bold ${milestone.done || milestone.active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {milestone.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Bills */}
        {pendingInvoices.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
            <h4 className="font-bold flex items-center gap-2 text-amber-800">
              <Icon name="payments" className="text-amber-600" />
              Hóa đơn cần thanh toán gấp
            </h4>
            <div className="space-y-3">
              {pendingInvoices.map((inv) => (
                <div key={inv.id} className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="font-bold text-on-surface">{inv.services.map(s => s.serviceName).join(', ')}</p>
                    <p className="text-xs text-on-surface-variant">Mã hóa đơn: {inv.id} • Ngày tạo: {new Date(inv.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-body-lg font-bold text-primary">₫{inv.netPrice.toLocaleString()}</span>
                    <button
                      onClick={() => alert('Vui lòng đến quầy thu ngân để thanh toán hóa đơn này.')}
                      className="px-4 py-2 border border-amber-600 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                    >
                      Hướng dẫn thanh toán
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Medical Records */}
        <section className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
            <h4 className="font-headline-sm text-headline-sm">Hồ sơ bệnh án gần đây</h4>
            <span className="text-xs text-outline font-bold uppercase">{records.length} Tệp tin</span>
          </div>
          <div className="divide-y divide-outline-variant">
            {records.map((rec) => (
              <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-secondary">
                  <Icon name={rec.type === 'pdf' ? 'picture_as_pdf' : (rec.type === 'image' ? 'image' : 'description')} className="text-[32px]" />
                </div>
                  <div>
                    <p className="font-body-lg font-bold text-on-surface">{rec.title}</p>
                    <p className="text-xs text-on-surface-variant">{rec.date} • {rec.size}</p>
                    {rec.notes && <p className="text-xs italic text-primary mt-1">"{rec.notes}"</p>}
                  </div>
                </div>
                <button
                  onClick={() => alert(`Xem chi tiết bệnh án: ${rec.title}\n${rec.notes || 'Không có ghi chú.'}`)}
                  className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors cursor-pointer"
                  title="Xem"
                >
                  <Icon name="visibility" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column: Status, Wallet, AI & Notifications */}
      <div className="col-span-12 lg:col-span-4 space-y-gutter">

        {/* Removed Membership Wallet Card */}


        {/* Reminders & Notifications */}
        <section className="bg-white rounded-xl border border-outline-variant p-4 space-y-3">
          <h4 className="font-bold text-on-surface text-label-md uppercase tracking-wider flex items-center gap-1">
            <Icon name="notifications" className="text-primary text-[18px]" />
            Lịch nhắc & Thông báo
          </h4>
          <div className="space-y-2">
            {activeMedicines.length > 0 ? (
              activeMedicines.map((med, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-error-container/15 rounded-xl border border-error/10">
                  <Icon name="medication" className="text-error mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-on-error-container truncate">Thuốc: {med.name}</p>
                    <p className="text-[11px] text-on-error-container/85 font-bold mt-0.5">{med.dose}</p>
                    <p className="text-[9px] text-on-error-container/60 mt-0.5 font-medium">Liệu trình: {med.duration}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
                <Icon name="verified" className="text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Không có đơn thuốc hiện tại</p>
                  <p className="text-[11px] text-emerald-700/85 mt-0.5 font-medium">Bạn không có lịch uống thuốc trong thời gian này. Hãy luôn giữ gìn vệ sinh răng miệng nhé!</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/40">
              <Icon name="event" className="text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-on-surface">Lịch hẹn tái khám chỉnh nha</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5 font-medium">Khám ngày mai lúc 09:00 AM — Bác sĩ Nguyễn Hương</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Removed Recharge Wallet Modal */}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        defaultPatientName={patient.name}
        defaultPatientPhone={patient.phone}
      />
    </div>
  );
};

// ─── Main Patient Dashboard (Tab Router) ───────────────────────────────────────
export const PatientDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  const renderTab = () => {
    switch (tab) {
      case 'booking':      return <PatientBooking />;
      case 'appointments': return <PatientAppointments />;
      case 'queue':        return <PatientQueue />;
      case 'records':      return <PatientRecords />;
      case 'billing':      return <PatientBilling />;
      default:             return <PatientHome />;
    }
  };

  return (
    <>
      {renderTab()}
      <AIChatbot />
    </>
  );
};
