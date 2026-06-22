import React, { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

const STATUS_CONFIG = {
  Confirmed: { label: 'Đã xác nhận', color: 'bg-secondary-container text-on-secondary-container border-secondary/20', icon: 'event_available' },
  'In-Progress': { label: 'Đang khám', color: 'bg-primary-container text-on-primary-container border-primary/20', icon: 'medical_services' },
  Pending: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'pending' },
  Completed: { label: 'Hoàn thành', color: 'bg-surface-container text-on-surface-variant border-outline-variant', icon: 'check_circle' },
  Cancelled: { label: 'Đã huỷ', color: 'bg-error-container text-on-error-container border-error/20', icon: 'cancel' },
} as const;

const UPCOMING_APPOINTMENTS = [
  {
    id: 'MY-01',
    service: 'Tái khám chỉnh nha (Khay 8)',
    dentist: 'Bác sĩ Nguyễn Hương',
    room: 'Phòng 110',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=150&h=150&q=80',
    date: 'Thứ Ba, 10/06/2026', // Lịch gần nhất (giả định hôm nay)
    time: '09:00 AM',
    status: 'Confirmed' as const,
    duration: 45,
    price: 0,
    notes: 'Mang theo khay niềng cũ và vệ sinh răng trước khi đến',
    isNext24h: true, // Cờ đánh dấu lịch hẹn trong 24h
  },
  {
    id: 'MY-02',
    service: 'Lấy cao răng & Vệ sinh',
    dentist: 'Bác sĩ Mai Lan',
    room: 'Phòng 108',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80',
    date: 'Thứ Sáu, 14/06/2026',
    time: '11:00 AM',
    status: 'Confirmed' as const,
    duration: 30,
    price: 300000,
    notes: '',
    isNext24h: false,
  },
];

const PAST_APPOINTMENTS = [
  {
    id: 'PAST-01',
    service: 'Tái khám chỉnh nha (Khay 7)',
    dentist: 'Bác sĩ Nguyễn Hương',
    date: '27/05/2026',
    time: '09:00 AM',
    status: 'Completed' as const,
    price: 0,
    rating: 5,
  },
  {
    id: 'PAST-02',
    service: 'Khám tổng quát & Tư vấn',
    dentist: 'Bác sĩ Mai Lan',
    date: '15/05/2026',
    time: '10:30 AM',
    status: 'Completed' as const,
    price: 100000,
    rating: 4,
  },
  {
    id: 'PAST-03',
    service: 'Nhổ răng khôn (hàm dưới)',
    dentist: 'Bác sĩ Hoàng Nam',
    date: '28/09/2025',
    time: '02:00 PM',
    status: 'Completed' as const,
    price: 1750000,
    rating: 5,
  },
  {
    id: 'PAST-04',
    service: 'Tẩy trắng răng thẩm mỹ',
    dentist: 'Bác sĩ Mai Lan',
    date: '10/08/2025',
    time: '03:00 PM',
    status: 'Cancelled' as const,
    price: 0,
    rating: 0,
  },
];

export const PatientAppointments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [qrCodeApptId, setQrCodeApptId] = useState<string | null>(null);
  const [reviewMap, setReviewMap] = useState<Record<string, { rating: number; comment: string }>>({
    'PAST-01': { rating: 5, comment: 'Bác sĩ Hương rất nhẹ nhàng, tư vấn kỹ lưỡng, chỉnh nha không đau!' },
    'PAST-03': { rating: 5, comment: 'Nhổ răng khôn rất nhanh, không đau như tưởng tượng. Bác sĩ dặn dò chu đáo.' }
  });
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [modalRating, setModalRating] = useState<number>(5);
  const [modalComment, setModalComment] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Completed' | 'Cancelled'>('All');

  const tabs = [
    { key: 'upcoming' as const, label: 'Sắp tới', count: UPCOMING_APPOINTMENTS.length },
    { key: 'past' as const, label: 'Lịch sử', count: PAST_APPOINTMENTS.length },
  ];



  const filteredPastAppointments = PAST_APPOINTMENTS.filter(a => {
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
          { label: 'Tổng lịch hẹn', value: UPCOMING_APPOINTMENTS.length + PAST_APPOINTMENTS.length, icon: 'calendar_month', color: 'text-primary bg-primary-container' },
          { label: 'Sắp tới', value: UPCOMING_APPOINTMENTS.length, icon: 'event_upcoming', color: 'text-secondary bg-secondary-container' },
          { label: 'Hoàn thành', value: PAST_APPOINTMENTS.filter(a => a.status === 'Completed').length, icon: 'task_alt', color: 'text-on-surface bg-surface-container' },
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
          </select>
        )}
      </div>

      {/* Upcoming Appointments */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          {UPCOMING_APPOINTMENTS.map((appt) => {
            const status = STATUS_CONFIG[appt.status];
            return (
              <div key={appt.id} className="relative bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all duration-300">
                {/* 24h Alert Banner */}
                {appt.isNext24h && (
                  <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-t-2xl flex items-center gap-2 text-xs font-bold border-b border-amber-200">
                    <Icon name="notifications_active" className="text-[16px] animate-pulse" />
                    Lịch hẹn của bạn sẽ diễn ra trong vòng 24h tới. Vui lòng đến đúng giờ.
                  </div>
                )}
                
                {/* Top accent bar if no banner */}
                {!appt.isNext24h && <div className="h-1.5 bg-gradient-to-r from-primary to-secondary rounded-t-2xl" />}
                
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
                      <button
                        onClick={() => setQrCodeApptId(appt.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-sm"
                      >
                        <Icon name="qr_code_2" className="text-[18px]" />
                        Mã Check-in
                      </button>
                      <button
                        onClick={() => setRescheduleId(appt.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-surface-container text-on-surface rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all cursor-pointer border border-outline-variant"
                      >
                        <Icon name="update" className="text-[18px]" />
                        Dời lịch
                      </button>
                      <button
                        onClick={() => setCancelId(appt.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 border border-error/30 text-error rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-error-container/30 transition-all cursor-pointer"
                      >
                        <Icon name="event_busy" className="text-[18px]" />
                        Huỷ lịch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {UPCOMING_APPOINTMENTS.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-outline-variant border-dashed">
              <Icon name="event_busy" className="text-[80px] text-outline" />
              <p className="text-on-surface-variant mt-4 text-body-lg">Bạn chưa có lịch hẹn nào sắp tới</p>
              <button className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-xl font-bold cursor-pointer">
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
                  <button
                    onClick={() => alert(`Đang chuyển tới trang Đặt lịch cho dịch vụ: ${appt.service}`)}
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

      {/* Reschedule Modal */}
      {rescheduleId && (() => {
        const apptToReschedule = UPCOMING_APPOINTMENTS.find(a => a.id === rescheduleId);
        const isLateReschedule = apptToReschedule?.isNext24h;
        
        // Use a static list of time slots for demo
        const timeSlots = [
          '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
          '10:15 AM', '11:00 AM', '02:00 PM', '02:30 PM',
          '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in fade-in border border-outline-variant">
              {isLateReschedule ? (
                <>
                  <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                      <Icon name="block" className="text-error" />
                      Không thể dời lịch
                    </h3>
                    <button onClick={() => setRescheduleId(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1 hover:bg-surface-container">
                      <Icon name="close" />
                    </button>
                  </div>
                  <div className="bg-error-container/30 border border-error/20 p-4 rounded-xl">
                    <p className="text-error text-sm font-medium text-center">
                      Lịch hẹn của bạn sẽ diễn ra trong vòng 24h tới. Để đảm bảo vận hành phòng khám, bạn không thể tự dời lịch lúc này.
                    </p>
                  </div>
                  <p className="text-center text-on-surface-variant text-sm">
                    Vui lòng gọi trực tiếp Hotline <strong className="text-primary">1900-xxxx</strong> để được hỗ trợ.
                  </p>
                  <button
                    onClick={() => setRescheduleId(null)}
                    className="w-full py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-all cursor-pointer mt-2"
                  >
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                      <Icon name="update" className="text-secondary" />
                      Dời lịch hẹn
                    </h3>
                    <button onClick={() => setRescheduleId(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1 hover:bg-surface-container">
                      <Icon name="close" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-on-surface-variant">
                    Chọn một ngày và giờ mới cho lịch hẹn <strong>{apptToReschedule?.service}</strong> với {apptToReschedule?.dentist}.
                  </p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-2">Ngày khám mới *</label>
                      <input 
                        type="date" 
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-md focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer" 
                      />
                    </div>
                    
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-3 flex items-center justify-between">
                        <span>Khung giờ trống *</span>
                        <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                          Real-time
                        </span>
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map(slot => {
                          // Mock some slots as booked to show the real-time feature
                          const isBooked = slot === '09:00 AM' || slot === '02:00 PM'; 
                          
                          if (isBooked) {
                              return (
                                <div key={slot} className="py-2 px-1 text-[11px] font-bold rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant/40 flex items-center justify-center gap-0.5 cursor-not-allowed" title="Đã có khách đặt">
                                  <Icon name="event_busy" className="text-[12px]" />
                                  <span className="line-through">{slot}</span>
                                </div>
                              )
                          }

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={(e) => {
                                // Simple active state toggle for demo
                                const parent = e.currentTarget.parentElement;
                                parent?.querySelectorAll('button').forEach(b => {
                                  b.className = "py-2 px-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer bg-white text-on-surface border-outline-variant hover:border-secondary/50 hover:bg-secondary/5";
                                });
                                e.currentTarget.className = "py-2 px-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer bg-secondary text-on-secondary border-secondary shadow-md scale-105";
                              }}
                              className="py-2 px-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer bg-white text-on-surface border-outline-variant hover:border-secondary/50 hover:bg-secondary/5"
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setRescheduleId(null)}
                      className="flex-1 py-3 border border-outline-variant text-on-surface rounded-xl font-bold hover:bg-surface-container transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={() => { alert('Yêu cầu dời lịch đã được gửi đến Phòng khám! Bạn sẽ nhận được thông báo xác nhận.'); setRescheduleId(null); }}
                      className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      Xác nhận Dời
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Cancel Modal */}
      {cancelId && (() => {
        const apptToCancel = UPCOMING_APPOINTMENTS.find(a => a.id === cancelId);
        const isLateCancel = apptToCancel?.isNext24h;

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
                      Lịch hẹn của bạn sẽ diễn ra trong vòng 24h tới. Để đảm bảo vận hành phòng khám, bạn không thể tự huỷ lịch lúc này.
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
                    <select className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                      <option value="">-- Chọn lý do --</option>
                      <option value="1">Bận đột xuất</option>
                      <option value="2">Đã khám ở nơi khác</option>
                      <option value="3">Hết đau răng / Không còn nhu cầu</option>
                      <option value="4">Lý do khác</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={() => { alert('Lịch hẹn đã được huỷ thành công!'); setCancelId(null); }}
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

      {/* Review & Feedback Modal */}
      {activeReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-fade-in border border-outline-variant text-left">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <Icon name="rate_review" className="text-primary" />
                Đánh giá ca khám
              </h3>
              <button onClick={() => setActiveReviewId(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1 hover:bg-surface-container border-none bg-transparent">
                <Icon name="close" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {PAST_APPOINTMENTS.find(a => a.id === activeReviewId)?.service}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Bác sĩ: {PAST_APPOINTMENTS.find(a => a.id === activeReviewId)?.dentist} • Ngày {PAST_APPOINTMENTS.find(a => a.id === activeReviewId)?.date}
                </p>
              </div>

              {/* Rating Star Selector */}
              <div className="flex flex-col items-center py-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Chất lượng dịch vụ</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setModalRating(star)}
                      className="text-amber-400 cursor-pointer hover:scale-125 transition-transform border-none bg-transparent"
                    >
                      <Icon
                        name={star <= modalRating ? 'star' : 'star_border'}
                        className="text-[36px]"
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-amber-700 font-bold mt-2">
                  {modalRating === 5 ? 'Cực kỳ hài lòng' :
                   modalRating === 4 ? 'Rất hài lòng' :
                   modalRating === 3 ? 'Bình thường' :
                   modalRating === 2 ? 'Không hài lòng' : 'Rất tệ'}
                </p>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-2">Nhận xét chi tiết</label>
                <textarea
                  value={modalComment}
                  onChange={(e) => setModalComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn về ca khám này (thái độ phục vụ, tay nghề bác sĩ, cơ sở vật chất...)"
                  rows={4}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-md focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveReviewId(null)}
                className="flex-1 py-3 border border-outline-variant hover:bg-slate-100 text-on-surface rounded-xl font-bold transition-all cursor-pointer text-xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setReviewMap(prev => ({
                    ...prev,
                    [activeReviewId]: { rating: modalRating, comment: modalComment }
                  }));
                  setActiveReviewId(null);
                }}
                className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md text-xs"
              >
                Gửi Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
