import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';
import { ReviewModal } from '../../../components/ReviewModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  Pending: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'schedule' },
  Confirmed: { label: 'Đã xác nhận', color: 'bg-secondary-container text-on-secondary-container border-secondary/20', icon: 'event_available' },
  'In-Progress': { label: 'Đang khám', color: 'bg-primary-container text-on-primary-container border-primary/20', icon: 'medical_services' },
  Completed: { label: 'Hoàn thành', color: 'bg-surface-container text-on-surface-variant border-outline-variant', icon: 'check_circle' },
  Cancelled: { label: 'Đã huỷ', color: 'bg-error-container text-on-error-container border-error/20', icon: 'cancel' },
  NoShow: { label: 'Quá hạn / Không đến', color: 'bg-outline-variant/30 text-outline border-outline-variant', icon: 'event_busy' },
};



// Helper to parse backend time format
const parseAppointmentTime = (timeStr: string) => {
  let datePart = '';
  let timePart = '';
  
  if (timeStr.includes('@')) {
    const parts = timeStr.split('@');
    datePart = parts[0].trim();
    timePart = parts[1].trim();
  } else {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    datePart = `${dd}/${mm}/${yyyy}`;
    timePart = timeStr.trim();
  }
  
  const [d, m, y] = datePart.split('/').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[dateObj.getDay()];
  const formattedDate = `${dayName}, ${datePart}`;
  
  const [hh, mm] = timePart.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  const formattedTime = `${String(displayHour).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
  
  let isLateCancel = false;
  if (timePart) {
    const apptDateObj = new Date(y, m - 1, d, hh, mm);
    const timeDiffMs = apptDateObj.getTime() - Date.now();
    isLateCancel = timeDiffMs > 0 && timeDiffMs < 60 * 60 * 1000;
  }

  return {
    dateLabel: formattedDate,
    timeLabel: formattedTime,
    isLateCancel,
    dayNum: String(d).padStart(2, '0'),
    monthNum: String(m).padStart(2, '0'),
    dayName
  };
};

export const PatientAppointments: React.FC = () => {
  const { appointments, cancelAppointment, dentists } = useClinic();
  const { user } = useAuth();
  const navigate = useNavigate();
  // BUG-C03: Không dùng hardcode fallback P-8821 — nếu chưa login thì id rỗng
  const patientId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [qrCodeApptId, setQrCodeApptId] = useState<string | null>(null);
  const [reviewMap, setReviewMap] = useState<Record<string, { rating: number; comment: string }>>({
    'PAST-01': { rating: 5, comment: 'Bác sĩ Hương rất nhẹ nhàng, tư vấn kỹ lưỡng, chỉnh nha không đau!' },
    'PAST-03': { rating: 5, comment: 'Nhổ răng khôn rất nhanh, không đau như tưởng tượng. Bác sĩ dặn dò chu đáo.' }
  });
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [modalRating, setModalRating] = useState<number>(5);
  const [modalComment, setModalComment] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Completed' | 'Cancelled' | 'NoShow'>('All');

  // Filter appointments for the current logged-in patient
  // BUG-C03: Guard — nếu không có user thì trả về [] thay vì match sai ID
  const myAppointments = React.useMemo(() => {
    if (!patientId) return [];
    return appointments.filter(a => {
      const aPatientId = a.patientId.replace('P-', '');
      const currentPatientId = patientId.replace('P-', '');
      return aPatientId === currentPatientId;
    });
  }, [appointments, patientId]);

  // Parse time and add extra UI fields
  // BUG-H01: Avatar bác sĩ lấy từ data thực thay vì hardcode Unsplash
  const mappedAppointments = React.useMemo(() => {
    const dbAppts = myAppointments.map(a => {
      const parsed = parseAppointmentTime(a.time);
      const dentistData = dentists.find(d => d.id === a.dentistId || d.name === a.dentistName);
      const avatarUrl = dentistData?.avatar
        || dentistData?.imageUrl
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.dentistName || 'BS')}&background=005eb8&color=fff&size=150`;
      return {
        id: a.id,
        service: a.serviceName,
        serviceId: a.serviceId || '',
        dentist: a.dentistName,
        room: 'Phòng khám',
        avatar: avatarUrl,
        date: parsed.dateLabel,
        time: parsed.timeLabel,
        status: a.status,
        duration: 30,
        price: 0,
        notes: '',
        isLateCancel: parsed.isLateCancel,
        rating: 5
      };
    });

    return dbAppts;
  }, [myAppointments, dentists]);

  const upcomingAppointments = mappedAppointments.filter(
    a => a.status === 'Confirmed' || a.status === 'In-Progress' || a.status === 'Pending'
  );

  const pastAppointments = mappedAppointments.filter(
    a => a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'NoShow'
  );

  const tabs = [
    { key: 'upcoming' as const, label: 'Sắp tới', count: upcomingAppointments.length },
    { key: 'past' as const, label: 'Lịch sử', count: pastAppointments.length },
  ];

  const filteredPastAppointments = pastAppointments.filter(a => {
    if (historyFilter === 'All') return true;
    return a.status === historyFilter;
  });

  return (
    <div className="p-stack-lg max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Lịch hẹn của tôi</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Quản lý và theo dõi tất cả lịch khám của bạn tại GoodSmile</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Tổng lịch hẹn', value: upcomingAppointments.length + pastAppointments.length, icon: 'calendar_month', color: 'text-primary bg-primary-container' },
          { label: 'Sắp tới', value: upcomingAppointments.length, icon: 'event_upcoming', color: 'text-secondary bg-secondary-container' },
          { label: 'Hoàn thành', value: pastAppointments.filter(a => a.status === 'Completed').length, icon: 'task_alt', color: 'text-on-surface bg-surface-container' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-outline-variant p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <Icon name={stat.icon} className="text-[24px]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switch & Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl w-fit border border-outline-variant">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-white text-on-surface shadow-sm border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'past' && (
          <select 
            value={historyFilter} 
            onChange={(e) => setHistoryFilter(e.target.value as any)}
            className="bg-white border border-outline-variant rounded-lg px-4 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary shadow-sm cursor-pointer"
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Completed">Đã hoàn thành</option>
            <option value="Cancelled">Đã huỷ</option>
            <option value="NoShow">Không đến / Quá hạn</option>
          </select>
        )}
      </div>

      {/* Upcoming Appointments */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          {upcomingAppointments.map((appt) => {
            const status = STATUS_CONFIG[appt.status];
            return (
              <div key={appt.id} className="relative bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all duration-300">
                {/* Late Cancel Alert Banner */}
                {appt.isLateCancel && (
                  <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-t-2xl flex items-center gap-2 text-xs font-bold border-b border-amber-200">
                    <Icon name="notifications_active" className="text-[16px] animate-pulse" />
                    Lịch hẹn của bạn sẽ diễn ra trong vòng 1 tiếng tới. Vui lòng đến đúng giờ.
                  </div>
                )}
                
                {/* Top accent bar if no banner */}
                {!appt.isLateCancel && <div className="h-1.5 bg-gradient-to-r from-primary to-secondary rounded-t-2xl" />}
                
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                    {/* Left: Date block */}
                    <div className="flex-shrink-0 flex sm:flex-col items-center sm:w-28 gap-4 sm:gap-0">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center sm:w-full">
                        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{appt.date.split(', ')[0]}</p>
                        <p className="text-3xl font-black text-primary my-1">{appt.date.split('/')[0].split(', ')[1] || appt.date.split('/')[0]}</p>
                        <p className="text-[10px] font-bold text-primary/70 uppercase">Tháng {appt.date.split('/')[1]}</p>
                      </div>
                      <div className="text-center sm:mt-3">
                        <p className="text-lg font-black text-on-surface">{appt.time}</p>
                        <p className="text-xs font-bold text-on-surface-variant flex items-center justify-center gap-1 mt-0.5">
                          <Icon name="timer" className="text-[14px]" />
                          {appt.duration} phút
                        </p>
                      </div>
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-start gap-3 justify-between">
                        <div>
                          <h4 className="font-headline-sm text-headline-sm text-on-surface">{appt.service}</h4>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full mt-2 border ${status.color}`}>
                            <Icon name={status.icon} className="text-[14px]" />
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-outline-variant w-fit">
                        <img src={appt.avatar} alt={appt.dentist} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div>
                          <p className="text-sm font-bold text-on-surface flex items-center gap-1">
                            <Icon name="stethoscope" className="text-[16px] text-primary" />
                            {appt.dentist}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5 font-medium">{appt.room}</p>
                        </div>
                      </div>

                      {appt.notes && (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-900 leading-relaxed max-w-2xl">
                          <Icon name="sticky_note_2" className="text-[20px] text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Ghi chú:</strong> {appt.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col gap-2 sm:w-40 justify-end sm:justify-start pt-4 sm:pt-0 sm:border-l border-outline-variant sm:pl-6">
                      {appt.status === 'In-Progress' ? (
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                          <p className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                            <Icon name="stethoscope" className="text-[16px] animate-pulse" />
                            Đang khám bệnh
                          </p>
                          <p className="text-[10px] text-on-surface-variant mt-1">Đang điều trị tại phòng</p>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setQrCodeApptId(appt.id)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-sm"
                          >
                            <Icon name="qr_code_2" className="text-[18px]" />
                            Mã Check-in
                          </button>
                          <button
                            onClick={() => {
                              if (appt.isLateCancel) {
                                alert('Chỉ được hủy lịch trực tuyến trước giờ khám ít nhất 1 tiếng. Vui lòng gọi Hotline 1900-xxxx để được hỗ trợ.');
                              } else {
                                setCancelId(appt.id);
                              }
                            }}
                            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                              appt.isLateCancel
                                ? 'bg-surface-container-low text-error/30 border-dashed border-error/20 cursor-not-allowed'
                                : 'border-error/30 text-error hover:bg-error-container/30 cursor-pointer'
                            }`}
                          >
                            <Icon name="event_busy" className="text-[18px]" />
                            Huỷ lịch
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {upcomingAppointments.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-outline-variant border-dashed">
              <Icon name="event_busy" className="text-[80px] text-outline" />
              <p className="text-on-surface-variant mt-4 text-body-lg">Bạn chưa có lịch hẹn nào sắp tới</p>
              {/* BUG-C01: Nút này từng là dead button — giờ navigate đến tab đặt lịch */}
              <button
                onClick={() => navigate('/patient?tab=booking')}
                className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-xl font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Đặt lịch khám ngay
              </button>
            </div>
          )}
        </div>
      )}

      {/* Past Appointments */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {filteredPastAppointments.map((appt) => {
            const status = STATUS_CONFIG[appt.status];
            const currentReview = reviewMap[appt.id];
            const userRating = currentReview ? currentReview.rating : appt.rating;
            return (
              <div key={appt.id} className="bg-white rounded-xl border border-outline-variant p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-4 justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-on-surface">{appt.service}</h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        <span className="font-medium text-on-surface">{appt.dentist}</span> • {appt.date} lúc {appt.time}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${status.color}`}>
                      <Icon name={status.icon} className="text-[16px]" />
                      {status.label}
                    </span>
                  </div>

                  {appt.status === 'Completed' && (
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-surface-container-low rounded-lg p-2.5 inline-flex items-center gap-3 border border-outline-variant">
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Đánh giá:</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => {
                                  setModalRating(star);
                                  setModalComment(reviewMap[appt.id]?.comment || '');
                                  setActiveReviewId(appt.id);
                                }}
                                className="text-amber-400 cursor-pointer hover:scale-125 transition-transform border-none bg-transparent"
                                title="Đánh giá chất lượng"
                              >
                                <Icon
                                  name={star <= userRating ? 'star' : 'star_border'}
                                  className="text-[24px]"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setModalRating(userRating || 5);
                            setModalComment(reviewMap[appt.id]?.comment || '');
                            setActiveReviewId(appt.id);
                          }}
                          className="px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Icon name="rate_review" className="text-[16px]" />
                          <span>{reviewMap[appt.id] ? 'Sửa nhận xét' : 'Nhận xét chi tiết'}</span>
                        </button>
                      </div>

                      {/* Display comment if present */}
                      {reviewMap[appt.id]?.comment && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex gap-3 text-sm text-on-surface leading-relaxed max-w-2xl animate-fade-in mt-1">
                          <Icon name="chat_bubble" className="text-[20px] text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Ý kiến phản hồi từ bạn:</p>
                            <p className="italic text-on-surface-variant">"{reviewMap[appt.id].comment}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-right md:border-l border-outline-variant md:pl-6 justify-between md:justify-end">
                  {appt.price > 0 && (
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Chi phí</p>
                      <p className="text-lg font-black text-primary">₫{appt.price.toLocaleString()}</p>
                    </div>
                  )}
                  {/* BUG-C02: Thay alert() stub bằng điều hướng thực đến tab đặt lịch */}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set('tab', 'booking');
                      if (appt.serviceId) params.set('serviceId', appt.serviceId);
                      navigate(`/patient?${params.toString()}`);
                    }}
                    className="px-6 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-bold hover:opacity-80 transition-all cursor-pointer flex items-center gap-2 border border-primary/20"
                  >
                    <Icon name="replay" className="text-[18px]" />
                    Khám lại
                  </button>
                </div>
              </div>
            );
          })}
          
          {filteredPastAppointments.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              Không tìm thấy lịch sử khám phù hợp.
            </div>
          )}
        </div>
      )}



      {/* Cancel Modal */}
      {cancelId && (() => {
        const apptToCancel = upcomingAppointments.find(a => a.id === cancelId);
        const isLateCancel = apptToCancel?.isLateCancel;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl space-y-5 animate-in fade-in border border-outline-variant">
              {isLateCancel ? (
                <>
                  <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto border border-error/20">
                    <Icon name="block" className="text-error text-3xl" />
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-center text-on-surface">Không thể huỷ lịch</h3>
                  <div className="bg-error-container/30 border border-error/20 p-4 rounded-xl">
                    <p className="text-center text-error text-sm font-medium">
                      Lịch hẹn của bạn sẽ diễn ra trong vòng 1 tiếng tới. Để đảm bảo vận hành phòng khám, bạn không thể tự huỷ lịch lúc này.
                    </p>
                  </div>
                  <p className="text-center text-on-surface-variant text-sm">
                    Vui lòng gọi trực tiếp Hotline <strong className="text-primary">1900-xxxx</strong> để được hỗ trợ.
                  </p>
                  <button
                    onClick={() => setCancelId(null)}
                    className="w-full py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-all cursor-pointer mt-2"
                  >
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto border border-error/20">
                    <Icon name="warning" className="text-error text-3xl" />
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-center text-on-surface">Huỷ lịch hẹn?</h3>
                  <p className="text-center text-on-surface-variant text-sm">
                    Bạn có chắc muốn huỷ lịch hẹn này không? Hành động này không thể hoàn tác và bạn sẽ cần đặt lịch lại từ đầu.
                  </p>
                  
                  <div className="mt-2">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-2 text-left">Lý do huỷ lịch (Tùy chọn)</label>
                    <select
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    >
                      <option value="">-- Chọn lý do --</option>
                      <option value="Bận đột xuất">Bận đột xuất</option>
                      <option value="Đã khám ở nơi khác">Đã khám ở nơi khác</option>
                      <option value="Hết đau răng / Không còn nhu cầu">Hết đau răng / Không còn nhu cầu</option>
                      <option value="Lý do khác">Lý do khác</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={() => {
                        cancelAppointment(cancelId, cancelReason || 'Bệnh nhân tự hủy lịch');
                        alert('Yêu cầu huỷ lịch hẹn khám của bạn đã được gửi thành công!');
                        setCancelId(null);
                        setCancelReason('');
                      }}
                      className="w-full py-3 bg-error text-on-error rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      Vâng, Huỷ lịch
                    </button>
                    <button
                      onClick={() => setCancelId(null)}
                      className="w-full py-3 text-on-surface-variant rounded-xl font-bold hover:bg-surface-container transition-all cursor-pointer"
                    >
                      Không, Giữ lại
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* QR Code Modal */}
      {qrCodeApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setQrCodeApptId(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl space-y-5 animate-fade-in border border-outline-variant text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <Icon name="qr_code_scanner" className="text-primary" />
                Mã Check-in
              </h3>
              <button onClick={() => setQrCodeApptId(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1 hover:bg-surface-container">
                <Icon name="close" />
              </button>
            </div>
            
            <p className="text-sm text-on-surface-variant">
              Sử dụng mã QR này để tự động Check-in tại quầy lễ tân hoặc Kiosk của phòng khám.
            </p>

            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant mx-auto w-fit">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCodeApptId}`} alt="QR Code" className="w-48 h-48 mx-auto mix-blend-multiply" />
            </div>
            <p className="text-xs font-bold text-primary tracking-widest mt-2">{qrCodeApptId}</p>

            <button
              onClick={() => setQrCodeApptId(null)}
              className="w-full mt-4 py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-all cursor-pointer border border-outline-variant"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Review & Feedback Modal Tích hợp AI */}
      <ReviewModal
        isOpen={Boolean(activeReviewId)}
        onClose={() => setActiveReviewId(null)}
        patientId={patientId}
        appointmentId={activeReviewId || undefined}
        serviceName={mappedAppointments.find(a => a.id === activeReviewId)?.service}
      />
    </div>
  );
};
