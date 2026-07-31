import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon } from '../../components/BrandLogo';
import { FaUsers, FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { MdMedicalServices, MdVerified, MdSecurity, MdBiotech } from "react-icons/md";
import { RiAwardFill } from "react-icons/ri";
import { Icon } from '../../components/Icon';
import { useClinic } from '../../context/ClinicContext';
import { AIChatbot } from '../../components/AIChatbot';

// ── Marquee Ticker ──
const TICKER_ITEMS = [
  '🦷 Khai trương chi nhánh mới tại Quận 7 — Tháng 7/2026',
  '🎉 Ưu đãi tẩy trắng răng Laser Whitening giảm 30% cho bệnh nhân mới',
  '💎 Cấy ghép Implant Thụy Sĩ Straumann tặng mão sứ trị giá 5 Triệu',
  '📋 Ứng dụng quản lý lịch hẹn GoodSmile đã ra mắt trên iOS & Android',
  '⭐ GoodSmile đạt chứng nhận y tế ISO 9001:2015 & Chuẩn an toàn HIPAA',
  '🩺 Miễn phí 100% khám tổng quát & cạo vôi răng lần đầu',
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Nha Khoa GoodSmile - Hệ Thống Phòng Khám Nha Khoa Uy Tín Hàng Đầu';
  }, []);

  const faqs = [
    { q: 'Tôi có thể đặt lịch hẹn như thế nào?', a: 'Bạn có thể đặt lịch trực tuyến qua website, ứng dụng GoodSmile, hoặc gọi hotline 1800-SMILE (miễn phí). Lịch hẹn sẽ được xác nhận qua SMS/Zalo trong vòng 15 phút.' },
    { q: 'Chi phí khám lần đầu là bao nhiêu?', a: 'GoodSmile miễn phí khám tổng quát và tư vấn cho tất cả bệnh nhân lần đầu. Sau khi có phác đồ điều trị, bạn sẽ được thông báo chi phí minh bạch trước khi thực hiện.' },
    { q: 'Phòng khám có hỗ trợ bảo hiểm không?', a: 'Chúng tôi hỗ trợ bảo hiểm y tế cho một số dịch vụ cơ bản và liên kết bảo lãnh viện phí trực tiếp với các đơn vị bảo hiểm sức khỏe tư nhân hàng đầu tại Việt Nam.' },
    { q: 'Quy trình điều trị implant mất bao lâu?', a: 'Điều trị cấy ghép implant thường kéo dài từ 3–6 tháng tùy thuộc vào chất lượng xương hàm. GoodSmile sử dụng implant thương hiệu Straumann (Thụy Sĩ) có thẻ bảo hành 25+ năm.' },
    { q: 'Tôi có thể xem lại hồ sơ bệnh án của mình không?', a: 'Có. Toàn bộ hồ sơ bệnh án, phim X-quang 3D và đơn thuốc được lưu trữ bảo mật trên hệ thống EMR. Bạn có thể truy cập 24/7 qua cổng bệnh nhân trên website.' },
  ];

  const { reviews: dbReviews } = useClinic();

  const staticReviews = [
    { name: 'Nguyễn Thu Hà', role: 'Nhân viên văn phòng', rating: 5, comment: 'Lần đầu nhổ răng khôn mà không đau gì cả! Bác sĩ Hoàng Nam rất nhẹ nhàng và kiên nhẫn giải thích. Phòng chờ rộng, sạch, có wifi và cà phê miễn phí. Chắc chắn sẽ giới thiệu cho người thân.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80', aiReply: 'Cảm ơn Thu Hà đã tin tưởng GoodSmile! Đội ngũ bác sĩ luôn nỗ lực để mang lại trải nghiệm êm ái nhất cho bạn.' },
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
    { icon: <FaUsers />, val: '15,000+', label: 'Bệnh nhân hài lòng' },
    { icon: <MdMedicalServices />, val: '15+', label: 'Năm kinh nghiệm' },
    { icon: <RiAwardFill />, val: '20+', label: 'Bác sĩ chuyên khoa' },
    { icon: <FaStar />, val: '4.9/5', label: 'Đánh giá từ bệnh nhân' },
  ];

  return (
    <div className="flex flex-col bg-background">

      {/* ── News Ticker ── */}
      <div className="bg-primary text-on-primary py-1.5 overflow-hidden">
        <div className="flex gap-16 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-xs font-semibold shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Hero Carousel Banner Section (Tự động chuyển slide) ── */}
      {(() => {
        const HERO_SLIDES = [
          {
            tag: 'Giải pháp nha khoa 4.0 hàng đầu',
            titleLine1: 'Nâng Tầm Trải Nghiệm',
            titleLine2: 'Chăm Sóc Răng Miệng',
            desc: 'Hệ thống nha khoa chuyên sâu với công nghệ chuẩn quốc tế ISO 13485. Tối ưu hóa quy trình từ đặt lịch, chẩn đoán 3D đến thanh toán.',
            btnText: 'Đặt lịch khám ngay',
            btnLink: '/book',
            badgeText: 'Đã phục vụ 15,000+ bệnh nhân',
            image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
          },
          {
            tag: 'Công nghệ Quét 3D iTero 5D',
            titleLine1: 'Niềng Răng Thẩm Mỹ',
            titleLine2: 'Đều Đẹp Tự Nhiên',
            desc: 'Xem trước mô phỏng kết quả niềng răng ngay trên màn hình 3D. Hỗ trợ trả góp 0% lãi suất chỉ từ 1.000.000đ/tháng.',
            btnText: 'Tư vấn niềng răng 0đ',
            btnLink: '/book',
            badgeText: 'Tặng bộ máng duy trì 3 triệu',
            image: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80',
          },
          {
            tag: 'Phục hình răng chuyên sâu',
            titleLine1: 'Cấy Ghép Implant Thụy Sĩ',
            titleLine2: 'Bảo Hành 25 Năm',
            desc: 'Khôi phục răng đã mất chắc chắn như răng thật. Sử dụng trụ Implant Straumann chính hãng, tặng mão sứ trị giá 5.000.000đ.',
            btnText: 'Khám & Chụp X-Quang 0đ',
            btnLink: '/book',
            badgeText: 'Bảo hành chính hãng 25 năm',
            image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80',
          },
          {
            tag: 'Công nghệ Laser Whitening Hoa Kỳ',
            titleLine1: 'Tẩy Trắng Răng Premium',
            titleLine2: 'Bật Tông Sau 45 Phút',
            desc: 'Tẩy trắng răng êm ái không ê buốt bằng ánh sáng Laser lạnh. Giảm ngay 30% cho bệnh nhân đặt lịch hẹn trực tuyến.',
            btnText: 'Nhận ưu đãi giảm 30%',
            btnLink: '/book',
            badgeText: 'Cam kết trắng sáng tức thì',
            image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
          },
        ];

        const [heroIdx, setHeroIdx] = useState(0);

        useEffect(() => {
          const heroTimer = setInterval(() => {
            setHeroIdx((prev) => (prev + 1) % HERO_SLIDES.length);
          }, 5000);
          return () => clearInterval(heroTimer);
        }, []);

        const currentHero = HERO_SLIDES[heroIdx];

        return (
          <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] px-6 md:px-16 py-16 md:py-20 min-h-[580px] flex flex-col justify-between transition-all duration-700">
            {/* Background Decorative Circles */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10 my-auto">
              {/* Left Content */}
              <div className="flex-1 space-y-6 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 text-white/95 rounded-full text-xs font-extrabold border border-white/20 shadow-sm backdrop-blur-md">
                  <Icon name="verified" className="text-base text-yellow-300" />
                  {currentHero.tag}
                </div>

                <h1 className="font-headline-lg text-headline-lg text-white leading-tight">
                  {currentHero.titleLine1} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-emerald-200 to-green-300">
                    {currentHero.titleLine2}
                  </span>
                </h1>

                <p className="text-white/85 text-base md:text-lg max-w-lg leading-relaxed font-medium">
                  {currentHero.desc}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => navigate(currentHero.btnLink)}
                    className="group relative overflow-hidden bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-[#003366] px-8 py-4 rounded-xl font-extrabold flex items-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-emerald-400/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer text-base"
                  >
                    <span className="absolute inset-0 w-1/2 h-full bg-white/40 skew-x-[-20deg] group-hover:translate-x-[300%] transition-transform duration-1000 ease-out"></span>
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon name="calendar_month" className="text-xl" />
                      {currentHero.btnText}
                    </span>
                    <Icon name="arrow_forward" className="text-xl relative z-10 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </button>
                  <button
                    onClick={() => navigate('/services')}
                    className="group bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md px-7 py-4 rounded-xl font-bold flex items-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer text-base shadow-lg"
                  >
                    <span>Xem dịch vụ & Bảng giá</span>
                    <Icon name="read_more" className="text-lg opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                  <div className="flex -space-x-3">
                    {[
                      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
                      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&q=80',
                    ].map((src, i) => (
                      <img key={i} src={src} alt="Doctor" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-xs font-bold">+500</div>
                  </div>
                  <p className="text-sm font-semibold text-white/95">
                     ★ <span className="text-yellow-300 font-bold">{currentHero.badgeText}</span>
                  </p>
                </div>
              </div>

              {/* Right Image Container (Đã bỏ thẻ hàng chờ 08 bệnh nhân) */}
              <div className="flex-1 relative w-full">
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/40 bg-slate-800">
                  <img
                    alt={currentHero.titleLine1}
                    className="w-full h-[360px] md:h-[420px] object-cover transition-all duration-700 hover:scale-105"
                    src={currentHero.image}
                  />
                </div>
              </div>
            </div>

            {/* Slider Bottom Controls & Dots */}
            <div className="relative z-20 flex items-center justify-between pt-6 border-t border-white/10 mt-6">
              <div className="flex items-center gap-2">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIdx(idx)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === heroIdx ? 'w-10 bg-yellow-300' : 'w-3 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Banner ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHeroIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
                  title="Banner trước"
                >
                  <FaChevronLeft className="text-xs" />
                </button>
                <span className="text-xs font-mono font-bold text-white/80 px-1">
                  0{heroIdx + 1} / 0{HERO_SLIDES.length}
                </span>
                <button
                  onClick={() => setHeroIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
                  title="Banner tiếp theo"
                >
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Stats Bar ── */}
      <section className="bg-primary text-on-primary py-8 px-6 md:px-16 shadow-inner">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="text-3xl opacity-85">
                {stat.icon}
              </div>
              <p className="text-3xl font-extrabold">{stat.val}</p>
              <p className="text-sm opacity-80 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section MỚI: Quy Trình Khám Chữa Chuẩn Y Khoa 4 Bước ── */}
      <section className="px-6 md:px-16 py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
              Quy Trình Chuyên Nghiệp
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mt-3">4 Bước Khám & Điều Trị Chuẩn Y Khoa</h2>
            <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl mx-auto">
              GoodSmile áp dụng quy trình khám chữa khép kín, minh bạch và an toàn tuyệt đối cho bệnh nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              { step: '01', title: 'Đặt Lịch Trực Tuyến', desc: 'Chọn giờ khám & bác sĩ mong muốn qua Website/App. Nhận mã xác nhận tức thì.', icon: 'calendar_month' },
              { step: '02', title: 'Check-in & Tiếp Đón', desc: 'Đến quầy lễ tân quét mã QR check-in trong 30 giây, không phải xếp hàng chờ đợi.', icon: 'qr_code_scanner' },
              { step: '03', title: 'Khám & Chẩn Đoán 3D', desc: 'Chụp phim X-quang Panorama/Cone Beam 3D, bác sĩ lập phác đồ chi tiết.', icon: 'biotech' },
              { step: '04', title: 'Điều Trị & Bảo Hành', desc: 'Thực hiện dịch vụ bằng công nghệ chuẩn y khoa, nhận đơn thuốc & thẻ bảo hành điện tử.', icon: 'verified' },
            ].map((item, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 relative hover:shadow-lg hover:border-primary/40 transition-all duration-300 group">
                <span className="text-4xl font-black text-slate-200 group-hover:text-primary/20 transition-colors absolute top-4 right-4 font-mono">
                  {item.step}
                </span>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-primary text-2xl mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  <Icon name={item.icon} />
                </div>
                <h3 className="font-bold text-base text-slate-800 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
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

      {/* ── Section MỚI: Công Nghệ & Trang Thiết Bị Hiện Đại ── */}
      <section className="px-6 md:px-16 py-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Trang Thiết Bị Tân Tiến
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Công Nghệ Nha Khoa Chuẩn ISO & FDA</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Đầu tư hệ thống máy móc chẩn đoán và điều trị hiện đại bậc nhất nhập khẩu từ Đức, Hoa Kỳ & Thụy Sĩ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Máy Chụp X-Quang Cone Beam 3D',
                desc: 'Tái tạo hình ảnh cấu trúc xương hàm 3D sắc nét chỉ trong 10 giây, hỗ trợ lập phác đồ cấy ghép Implant chính xác 99.9%.',
                tag: 'Công nghệ Đức',
                img: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
              },
              {
                title: 'Máy Quét Dấu Răng 3D iTero 5D',
                desc: 'Lấy dấu răng kỹ thuật số không cần dùng thạch cao, xem trước kết quả niềng răng mô phỏng ngay trên màn hình.',
                tag: 'Công nghệ Hoa Kỳ',
                img: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80',
              },
              {
                title: 'Hệ Thống Tẩy Trắng Răng Laser Whitening',
                desc: 'Sử dụng ánh sáng Laser lạnh tác động cắt đứt chuỗi màu chất hữu cơ, mang lại nụ cười trắng sáng êm ái không ê buốt.',
                tag: 'Tiêu chuẩn FDA',
                img: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80',
              },
            ].map((tech, idx) => (
              <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between">
                <div className="h-48 overflow-hidden relative">
                  <img src={tech.img} alt={tech.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md text-slate-950 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full shadow-sm">
                    {tech.tag}
                  </span>
                </div>
                <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white mb-1.5">{tech.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{tech.desc}</p>
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <MdVerified /> Đã kiểm định an toàn y tế
                  </div>
                </div>
              </div>
            ))}
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

      {/* ── Section MỚI: Cam Kết & Chính Sách Bảo Hành Minh Bạch ── */}
      <section className="px-6 md:px-16 py-14 bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: <MdSecurity className="text-3xl" />, title: 'Bảo Hành Đến 25 Năm', desc: 'Thẻ bảo hành điện tử chính hãng cho dịch vụ Implant & Răng sứ.' },
            { icon: <MdVerified className="text-3xl" />, title: 'Chi Phí Trọn Gói', desc: 'Báo giá minh bạch trước khi điều trị, cam kết không phát sinh chi phí.' },
            { icon: <MdBiotech className="text-3xl" />, title: 'Vô Trùng Chuẩn ISO', desc: 'Hệ thống vô trùng 1 chiều đảm bảo an toàn tuyệt đối tránh lây nhiễm chéo.' },
            { icon: <RiAwardFill className="text-3xl" />, title: 'Bác Sĩ Trực Tiếp Khám', desc: '100% ca điều trị được thực hiện trực tiếp bởi bác sĩ chuyên khoa.' },
          ].map((c, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white mb-1">
                {c.icon}
              </div>
              <h3 className="font-bold text-base">{c.title}</h3>
              <p className="text-xs text-white/80 leading-relaxed">{c.desc}</p>
            </div>
          ))}
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

      {/* ── AI Chatbot Widget (Floating) ── */}
      <AIChatbot />

    </div>
  );
};
