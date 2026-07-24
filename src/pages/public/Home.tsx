import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingModal } from '../../components/BookingModal';
import { LogoIcon } from '../../components/BrandLogo';
import { FaUsers, FaStar } from "react-icons/fa";
import { MdMedicalServices, MdVerified } from "react-icons/md";
import { RiAwardFill } from "react-icons/ri";
import { Icon } from '../../components/Icon';
import { useClinic } from '../../context/ClinicContext';

// ── Promotional Banner Popup ──
const PromoBanner: React.FC<{ onClose: () => void; onBookNow: () => void }> = ({ onClose, onBookNow }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const targetDate = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  }, []);

  const promoLabel = React.useMemo(() => {
    const now = new Date();
    return `Ưu đãi tháng ${now.getMonth() + 1} / ${now.getFullYear()}`;
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('SMILE30');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const stats = [
  { icon: <FaUsers />, val: '12,500+', label: 'Bệnh nhân hài lòng' },
  { icon: <MdMedicalServices />, val: '15+', label: 'Năm kinh nghiệm' },
  { icon: <RiAwardFill />, val: '4', label: 'Bác sĩ chuyên khoa' },
  { icon: <FaStar />, val: '4.9/5', label: 'Đánh giá Google' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <style>{`
        @keyframes shimmer-fast {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .animate-float-slower {
          animation: float-slower 6s ease-in-out infinite;
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
        .shimmer-progress::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shimmer-fast 1.8s infinite;
        }
        .ticket-box {
          position: relative;
          background-color: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: visible;
        }
        .ticket-circle-l, .ticket-circle-r {
          position: absolute;
          top: 50%;
          width: 14px;
          height: 14px;
          background-color: white;
          border-radius: 50%;
          transform: translateY(-50%);
          border: 1.5px solid #cbd5e1;
          z-index: 10;
        }
        .ticket-circle-l {
          left: -8px;
          border-right-color: transparent;
          border-top-color: transparent;
          border-bottom-color: transparent;
        }
        .ticket-circle-r {
          right: -8px;
          border-left-color: transparent;
          border-top-color: transparent;
          border-bottom-color: transparent;
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col md:flex-row border border-slate-100">
        
        {/* Left Pane (Visual Graphic - Hidden on Mobile) */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] text-white relative overflow-hidden w-[280px] shrink-0 select-none">
          {/* Decorative Background effects */}
          <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/5 pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center mt-6">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 p-2 animate-float-slower mb-4">
              <LogoIcon className="w-16 h-16" />
            </div>
            <h4 className="text-lg font-black tracking-tight text-white/95">GoodSmile</h4>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/60">Dental Clinic</p>
          </div>

          <div className="relative z-10 text-center mb-6">
            <p className="text-xs text-white/85 font-medium leading-relaxed px-2">
              Kiến tạo nụ cười rạng rỡ, tự tin cùng đội ngũ chuyên gia nha khoa hàng đầu.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">
              <Icon name="verified" className="text-[12px] text-yellow-300" />
              Công nghệ Đạt chuẩn ISO
            </div>
          </div>
        </div>

        {/* Right Pane (Offer Details) */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative bg-white">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <Icon name="close" className="text-[18px] font-bold" />
          </button>

          <div className="space-y-4">
            {/* Promo Tag */}
            <div>
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                <Icon name="star" className="text-[12px] text-amber-600 animate-pulse-soft" />
                {promoLabel}
              </span>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                Giảm 30% Dịch Vụ<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-600">Tẩy Trắng Răng Premium</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Công nghệ tẩy trắng răng từ Hoa Kỳ, không ê buốt, trắng bật 2-3 tông ngay sau 45 phút.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Ưu đãi kết thúc sau:</p>
              <div className="flex items-center gap-2">
                {[
                  { val: timeLeft.days, label: 'Ngày' },
                  { val: timeLeft.hours, label: 'Giờ' },
                  { val: timeLeft.minutes, label: 'Phút' },
                  { val: timeLeft.seconds, label: 'Giây' }
                ].map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-300 font-bold text-sm">:</span>}
                    <div className="flex-1 bg-white border border-slate-100 rounded-xl py-2 flex flex-col items-center shadow-sm">
                      <span className="text-lg font-black text-slate-800 leading-none">
                        {String(item.val).padStart(2, '0')}
                      </span>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1">
                        {item.label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Slots / Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Số lượng suất ưu đãi còn lại:</span>
                <span className="font-black text-primary bg-primary/5 px-2 py-0.5 rounded text-[11px]">23 / 50 suất</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-green-600 rounded-full transition-all duration-1000 relative shimmer-progress"
                  style={{ width: '46%' }}
                ></div>
              </div>
              <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                <Icon name="info" className="text-[12px]" />
                Lưu ý: Hơn 100 người khác đang xem ưu đãi này.
              </p>
            </div>

            {/* Coupon Box */}
            <div className="ticket-box">
              <div className="ticket-circle-l"></div>
              <div className="ticket-circle-r"></div>
              
              <Icon name="local_offer" className="text-primary text-xl" />
              <div className="flex-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mã coupon của bạn</p>
                <p className="font-extrabold text-primary tracking-widest text-base font-mono">SMILE30</p>
              </div>
              <button 
                onClick={handleCopy}
                className={`text-xs font-black px-4 py-2 rounded-xl transition-all border shadow-sm cursor-pointer ${
                  copied 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-primary/20 text-primary hover:bg-primary/5'
                }`}
              >
                {copied ? 'Đã chép! ✓' : 'Sao chép'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer text-center"
            >
              Để sau
            </button>
            <button
              onClick={() => {
                onClose();
                onBookNow();
              }}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              Đặt lịch ngay
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

// ── Marquee Ticker ──
const TICKER_ITEMS = [
  '🦷 Khai trương chi nhánh mới tại Quận 7 — Tháng 7/2026',
  '🎉 Ưu đãi tẩy trắng răng giảm 30% cho khách hàng mới',
  '📋 Ứng dụng đặt lịch GoodSmile đã ra mắt trên iOS & Android',
  '⭐ GoodSmile đạt chứng nhận ISO 9001:2015 và HIPAA Compliance',
  '🩺 Miễn phí khám tổng quát cho bệnh nhân lần đầu trong tháng 6',
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Hiện banner sau 2 giây
  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const faqs = [
    { q: 'Tôi có thể đặt lịch hẹn như thế nào?', a: 'Bạn có thể đặt lịch trực tuyến qua website, ứng dụng GoodSmile, hoặc gọi hotline 1800-SMILE (miễn phí). Lịch hẹn sẽ được xác nhận qua SMS/Zalo trong vòng 15 phút.' },
    { q: 'Chi phí khám lần đầu là bao nhiêu?', a: 'GoodSmile miễn phí khám tổng quát và tư vấn cho tất cả bệnh nhân lần đầu. Sau khi có phác đồ điều trị, bạn sẽ được thông báo chi phí cụ thể trước khi thực hiện.' },
    { q: 'Phòng khám có hỗ trợ bảo hiểm không?', a: 'Chúng tôi hỗ trợ bảo hiểm xã hội cho một số dịch vụ cơ bản và tất cả các gói bảo hiểm sức khỏe tư nhân lớn tại Việt Nam. Vui lòng mang theo thẻ bảo hiểm khi đến khám.' },
    { q: 'Quy trình điều trị implant mất bao lâu?', a: 'Điều trị implant thường kéo dài từ 3–6 tháng tùy thuộc vào tình trạng xương hàm. GoodSmile sử dụng implant thương hiệu Straumann (Thụy Sĩ) với độ bền 25+ năm.' },
    { q: 'Tôi có thể xem lại hồ sơ bệnh án của mình không?', a: 'Có. Toàn bộ hồ sơ bệnh án, hình ảnh X-quang và đơn thuốc được lưu trữ bảo mật trên hệ thống EMR. Bạn có thể truy cập 24/7 qua cổng bệnh nhân tại website.' },
  ];

  const { reviews: dbReviews } = useClinic();

  const staticReviews = [
    { name: 'Nguyễn Thu Hà', role: 'Nhân viên văn phòng', rating: 5, comment: 'Lần đầu nhổ răng khôn mà không đau gì cả! Bác sĩ Hoàng Nam rất nhẹ nhàng và kiên nhẫn giải thích. Phòng chờ rộng, sạch, có wifi và cà phê miễn phí. Chắc chắn sẽ quay lại.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80', aiReply: 'Cảm ơn Thu Hà đã tin tưởng GoodSmile! Đội ngũ bác sĩ luôn nỗ lực để mang lại trải nghiệm êm ái nhất cho bạn.' },
    { name: 'Trần Minh Tuấn', role: 'Kỹ sư phần mềm', rating: 5, comment: 'Đặt lịch online rất dễ, nhận được xác nhận qua Zalo ngay. Đến nơi được check-in nhanh chóng, không phải chờ lâu. Bác sĩ tư vấn tận tình về phác đồ niềng răng cho con.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80', aiReply: 'Rất vui vì quy trình trực tuyến và đón tiếp tại phòng khám làm gia đình anh hài lòng! GoodSmile chúc bé có hành trình niềng răng thuận lợi.' },
    { name: 'Lê Phương Linh', role: 'Giáo viên', rating: 5, comment: 'Tẩy trắng răng xong kết quả rõ ngay! Được miễn phí khám ban đầu, báo giá rõ ràng trước khi làm. Nhân viên lễ tân thân thiện, cho mình uống nước chờ. Rất hài lòng!', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80', aiReply: 'GoodSmile trân trọng cảm ơn cô Phương Linh! Chúc cô luôn giữ vững nụ cười rạng rỡ và tự tin mỗi ngày.' },
  ];

  const displayReviews = dbReviews && dbReviews.length > 0
    ? dbReviews.map(r => ({
        name: r.patientName,
        role: r.serviceName || 'Bệnh nhân GoodSmile',
        rating: r.rating,
        comment: r.comment,
        aiReply: r.aiReply,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80',
      }))
    : staticReviews;

  const stats = [
    { icon: <FaUsers />, val: '12,500+', label: 'Bệnh nhân hài lòng' },
    { icon: <MdMedicalServices />, val: '15+', label: 'Năm kinh nghiệm' },
    { icon: <RiAwardFill />, val: '4', label: 'Bác sĩ chuyên khoa' },
    { icon: <FaStar />, val: '4.9/5', label: 'Đánh giá Google' },
  ];

  return (
    <div className="flex flex-col bg-background">

      {/* ── Promotional Banner Popup ── */}
      {showBanner && (
        <PromoBanner 
          onClose={() => setShowBanner(false)} 
          onBookNow={() => navigate('/book')} 
        />
      )}

      {/* ── News Ticker ── */}
      <div className="bg-primary text-on-primary py-1.5 overflow-hidden">
        <div className="flex gap-16 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-xs font-semibold shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] px-6 md:px-16 py-20 min-h-[580px] flex flex-col md:flex-row items-center gap-12">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="flex-1 space-y-6 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 text-white/90 rounded-full text-xs font-bold border border-white/20">
            <Icon name="verified" className="text-[16px]" />
            Giải pháp nha khoa 4.0 hàng đầu Việt Nam
          </div>
          <h1 className="font-headline-lg text-headline-lg text-white leading-tight">
            Nâng Tầm Trải Nghiệm <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">Chăm Sóc Răng Miệng</span>
          </h1>
          <p className="text-white/80 text-lg max-w-lg leading-relaxed">
            Hệ thống nha khoa chuyên sâu với công nghệ chuẩn quốc tế. Tối ưu hóa quy trình từ đặt lịch, chẩn đoán đến thanh toán.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => navigate('/book')}
              className="bg-white text-primary px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              Đặt lịch khám ngay
              <Icon name="arrow_forward" className="text-[18px]" />
            </button>
            <button
              onClick={() => navigate('/services')}
              className="border border-outline-variant bg-white text-on-surface px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-surface-container-low transition-all cursor-pointer"
            >
              Xem dịch vụ
            </button>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/30">
            <div className="flex -space-x-3">
              {[
                'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
                'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&q=80',
              ].map((src, i) => (
                <img key={i} src={src} alt="Doctor" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-xs font-bold">+500</div>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">
               Được tin dùng bởi <span className="text-primary font-bold">500+</span> phòng khám trên toàn quốc
            </p>
          </div>
        </div>
        <div className="flex-1 relative">
          <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/50">
            <img
              alt="Dental Clinic Dashboard"
              className="w-full object-cover"
              src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80"
            />
          </div>
          <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-xl z-20 hidden lg:block border border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container">
                <Icon name="pending_actions" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Hàng chờ thực tế</p>
                <p className="font-bold text-secondary">08 Bệnh nhân</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-primary text-on-primary py-8 px-6 md:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="text-3xl opacity-80">
                {stat.icon}
              </div>
              <p className="text-3xl font-extrabold">{stat.val}</p>
              <p className="text-sm opacity-75 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Bento Grid ── */}
      <section className="px-6 md:px-16 py-16 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Công Nghệ Đi Đầu — Chăm Sóc Tận Tâm</h2>
            <p className="text-body-lg text-on-surface-variant mt-3 max-w-2xl mx-auto">
              Công cụ tối tân giúp đội ngũ y bác sĩ tập trung vào điều quan trọng nhất: sức khỏe nụ cười của bệnh nhân.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-xl border border-outline-variant p-6 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <Icon name="monitor_heart" className="text-primary text-4xl mb-3" />
                <h3 className="font-headline-md text-headline-md mb-2">Hàng Chờ Thực Tế (Real-time)</h3>
                <p className="text-on-surface-variant text-sm">Theo dõi trạng thái bệnh nhân từ lúc check-in đến khi hoàn tất điều trị. Đồng bộ tức thì giữa lễ tân, bác sĩ và thu ngân.</p>
              </div>
              <div className="mt-5 bg-surface-container-low rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1 h-2 bg-outline-variant rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-2/3"></div>
                </div>
                <span className="text-sm font-bold text-primary">Hiệu suất 85%</span>
              </div>
            </div>
            <div className="bg-secondary-container rounded-xl p-6 flex flex-col justify-between text-on-secondary-container hover:shadow-md transition-all">
              <div>
                <Icon name="psychology" className="text-3xl mb-3" />
                <h3 className="font-headline-md text-headline-md mb-2">Trợ Lý AI Thông Minh</h3>
                <p className="text-sm">Tư vấn sức khỏe tự động và dự đoán các vấn đề nha khoa tiềm ẩn dựa trên dữ liệu lâm sàng.</p>
              </div>
              <div onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm font-bold cursor-pointer hover:underline mt-4">
                Khám phá AI <Icon name="chevron_right" />
              </div>
            </div>
            <div className="bg-primary text-on-primary rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <Icon name="biotech" className="text-3xl mb-3" />
                <h3 className="font-headline-md text-headline-md mb-2">Độ Chính Xác Tuyệt Đối</h3>
                <p className="text-sm">Hệ thống sơ đồ răng kỹ thuật số giúp bác sĩ lập kế hoạch điều trị chi tiết và minh bạch.</p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Icon name="stars" />
                <span className="text-sm font-semibold">Tiêu chuẩn quốc tế ISO 13485</span>
              </div>
            </div>
            <div className="md:col-span-2 bg-surface-container rounded-xl p-6 flex flex-row items-center gap-6 hover:shadow-md transition-all">
              <div className="flex-1">
                <h3 className="font-headline-md text-headline-md mb-2">Bảo Mật Dữ Liệu Y Tế</h3>
                <p className="text-on-surface-variant text-sm">Hồ sơ bệnh án điện tử (EMR) được mã hóa theo tiêu chuẩn HIPAA, đảm bảo quyền riêng tư và an toàn thông tin tuyệt đối.</p>
              </div>
              <div className="hidden sm:flex w-24 h-24 bg-white rounded-full items-center justify-center shadow-inner shrink-0">
                <Icon name="encrypted" className="text-primary text-5xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Highlight ── */}
      <section className="px-6 md:px-16 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Dịch Vụ Nổi Bật</h2>
            <p className="text-on-surface-variant mt-2 text-sm">Đầy đủ dịch vụ nha khoa từ cơ bản đến chuyên sâu</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: 'spa', name: 'Tẩy Trắng Răng', desc: 'Trắng sáng tức thì', price: 'Từ 2.500.000₫', color: 'text-pink-600 bg-pink-50' },
              { icon: 'healing', name: 'Cấy Implant', desc: 'Giải pháp lâu dài', price: 'Từ 15.000.000₫', color: 'text-blue-600 bg-blue-50' },
              { icon: 'accessibility', name: 'Niềng Răng', desc: 'Đều đẹp tự nhiên', price: 'Từ 30.000.000₫', color: 'text-purple-600 bg-purple-50' },
              { icon: 'cleaning_services', name: 'Lấy Cao Răng', desc: 'Vệ sinh chuyên sâu', price: 'Từ 300.000₫', color: 'text-emerald-600 bg-emerald-50' },
              { icon: 'construction', name: 'Trám Răng', desc: 'Phục hồi thẩm mỹ', price: 'Từ 450.000₫', color: 'text-amber-600 bg-amber-50' },
              { icon: 'science', name: 'Điều Trị Tủy', desc: 'Bảo tồn răng thật', price: 'Từ 1.200.000₫', color: 'text-red-600 bg-red-50' },
              { icon: 'diamond', name: 'Răng Sứ Toàn Sứ', desc: 'Vẻ đẹp hoàn hảo', price: 'Từ 5.000.000₫', color: 'text-indigo-600 bg-indigo-50' },
              { icon: 'search', name: 'Khám Tổng Quát', desc: 'Miễn phí lần đầu', price: 'Miễn phí', color: 'text-teal-600 bg-teal-50' },
            ].map((svc, i) => (
              <div key={i} onClick={() => navigate('/services')} className="bg-white rounded-xl border border-outline-variant p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${svc.color}`}>
                  <Icon name={svc.icon} className="text-xl" />
                </div>
                <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{svc.name}</h4>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{svc.desc}</p>
                <p className="text-[10px] font-bold text-primary mt-2">{svc.price}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('/services')} className="border border-primary text-primary px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
              Xem bảng giá đầy đủ →
            </button>
          </div>
        </div>
      </section>

      {/* ── Experts Section ── */}
      <section className="px-6 md:px-16 py-16 bg-surface-container-lowest overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-8 border-surface-container">
              <img alt="Đội ngũ chuyên gia" className="w-full h-[420px] object-cover"
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-primary text-on-primary p-5 rounded-xl shadow-xl">
              <div className="text-3xl font-extrabold">15+</div>
              <div className="text-xs font-semibold">Năm kinh nghiệm</div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-5">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Chuyên Gia Của GoodSmile</h2>
            <p className="text-on-surface-variant text-base">Đội ngũ y bác sĩ tại GoodSmile là những chuyên gia đầu ngành, luôn tận tâm và không ngừng nâng cao tay nghề để mang lại kết quả điều trị tốt nhất.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: 'workspace_premium', color: 'bg-primary-fixed text-primary', title: 'Chứng Chỉ Quốc Tế', desc: 'Chuyên gia Implant & Chỉnh nha được đào tạo tại Hoa Kỳ và Châu Âu.' },
                { icon: 'favorite', color: 'bg-secondary-container text-secondary', title: 'Tận Tâm Phục Vụ', desc: 'Lắng nghe và thấu hiểu, xây dựng phác đồ cá nhân hóa cho từng bệnh nhân.' },
                { icon: 'military_tech', color: 'bg-amber-50 text-amber-700', title: 'Giải Thưởng Uy Tín', desc: 'Top 10 phòng khám nha khoa được yêu thích nhất TP.HCM 2024–2025.' },
                { icon: 'groups', color: 'bg-purple-50 text-purple-700', title: 'Đội Ngũ Đa Chuyên Khoa', desc: 'Chuyên gia nội nha, phẫu thuật, thẩm mỹ và chỉnh nha dưới một mái nhà.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${item.color}`}>
                    <Icon name={item.icon} className="text-[20px]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{item.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/doctors')} className="border border-primary text-primary px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
              Tìm hiểu về đội ngũ →
            </button>
          </div>
        </div>
      </section>

      {/* ── Customer Reviews ── */}
      <section className="px-6 md:px-16 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Khách Hàng Nói Gì Về GoodSmile?</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className="text-amber-400 text-[14px]" />
              ))}
              <span className="text-sm font-bold text-on-surface ml-2">4.9/5</span>
              <span className="text-sm text-outline ml-1">(1.240 đánh giá)</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayReviews.map((r, i) => (
              <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    {[...Array(r.rating || 5)].map((_, starIdx) => (
                      <FaStar key={starIdx} className="text-amber-400 text-[14px]" />
                    ))}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">"{r.comment}"</p>
                  
                  {r.aiReply && (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs text-on-surface leading-relaxed mt-2 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Icon name="smart_toy" className="text-sm" />
                        <span>GoodSmile AI Phản hồi:</span>
                      </div>
                      <p className="italic text-slate-600">"{r.aiReply}"</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-2">
                  <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover border border-outline-variant" />
                  <div>
                    <p className="font-bold text-xs text-on-surface">{r.name}</p>
                    <p className="text-[10px] text-outline">{r.role}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-outline flex items-center gap-0.5">
                    <MdVerified className="text-[14px] text-green-500" /> Đã xác minh
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="px-6 md:px-16 py-16 bg-surface-container-lowest">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Câu Hỏi Thường Gặp</h2>
            <p className="text-on-surface-variant text-sm mt-2">Giải đáp những thắc mắc phổ biến nhất của bệnh nhân</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-outline-variant overflow-hidden transition-all">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-sm text-on-surface">{faq.q}</span>
                  <Icon name="pending_actions" className={`text-outline shrink-0 transition-transform duration-200 ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-4 text-sm text-on-surface-variant border-t border-outline-variant/30 pt-3 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final Banner ── */}
      <section className="px-6 md:px-16 py-16 premium-glow text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white/5"></div>
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-white/5"></div>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Bắt đầu hành trình nụ cười khỏe
          </span>
          <h2 className="text-3xl font-extrabold leading-tight">Đặt Lịch Ngay Hôm Nay<br />Nhận Khám Miễn Phí Lần Đầu</h2>
          <p className="text-base opacity-85">Đội ngũ bác sĩ chuyên nghiệp luôn sẵn sàng tư vấn và chăm sóc cho bạn. Đặt lịch online trong 30 giây!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/book')}
              className="bg-white text-primary px-8 py-3 rounded-xl font-bold text-sm hover:shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              Đặt lịch khám miễn phí →
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="border border-white/50 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all cursor-pointer"
            >
              Liên hệ tư vấn
            </button>
          </div>
          <p className="text-xs opacity-60">Hotline: 1800-SMILE • Thứ 2 – Chủ nhật: 7:00 – 20:00</p>
        </div>
      </section>

    </div>
  );
};
