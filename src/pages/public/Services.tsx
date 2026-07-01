import React, { useEffect, useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { BookingModal } from '../../components/BookingModal';
import { Icon } from '../../components/Icon';

const DEFAULT_SERVICE_IMAGE =
  'https://images.pexels.com/photos/3845625/pexels-photo-3845625.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';

const ServiceImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (imgSrc !== DEFAULT_SERVICE_IMAGE) setImgSrc(DEFAULT_SERVICE_IMAGE);
      }}
    />
  );
};

// ── Service Metadata (extended) ──
const SERVICE_META: Record<string, {
  icon: string;
  category: string;
  desc: string;
  duration: string;
  badge?: string;
  badgeColor?: string;
  highlights: string[];
  image: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
}> = {
  'S-01': {
    icon: 'clean_hands',
    category: 'Chăm Sóc Cơ Bản',
    desc: 'Loại bỏ mảng bám, cao răng cứng đầu trên răng và dưới nướu, ngăn ngừa viêm nướu và hôi miệng hiệu quả lâu dài.',
    duration: '15 – 30 phút',
    highlights: ['Dụng cụ siêu âm hiện đại', 'Đánh bóng răng sau cạo', 'Khuyên dùng mỗi 6 tháng'],
    image: 'https://images.pexels.com/photos/3845625/pexels-photo-3845625.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#0d9488',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
  },

  'S-02': {
    icon: 'brightness_high',
    category: 'Thẩm Mỹ Răng',
    desc: 'Công nghệ ánh sáng Laser kết hợp gel tẩy trắng chính hãng Mỹ, nâng tông từ 2–4 bậc chỉ sau 60 phút an toàn.',
    duration: '45 – 60 phút',
    badge: 'HOT',
    badgeColor: 'bg-rose-500 text-white',
    highlights: ['Công nghệ Philips Zoom', 'Không ê buốt', 'Hiệu quả ngay sau 1 lần'],
    image: 'https://images.pexels.com/photos/6627536/pexels-photo-6627536.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#eab308',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },

  'S-03': {
    icon: 'dentistry',
    category: 'Phục Hồi Răng',
    desc: 'Phục hồi hình dáng và chức năng nhai cho răng sứt mẻ, sâu bằng Composite cao cấp, màu sắc trùng khớp tự nhiên.',
    duration: '30 – 45 phút',
    highlights: ['Composite A3-shade matching', 'Không cần mài răng nhiều', 'Bền đến 7 năm'],
    image: 'https://images.pexels.com/photos/3845557/pexels-photo-3845557.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#2563eb',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },

  'S-04': {
    icon: 'healing',
    category: 'Phẫu Thuật',
    desc: 'Phẫu thuật nhổ răng khôn mọc lệch, mọc ngầm bằng sóng siêu âm Piezotome, hạn chế tối đa sưng đau và chảy máu.',
    duration: '45 – 60 phút',
    highlights: ['Sóng siêu âm Piezotome', 'Gây tê không đau', 'Hồi phục nhanh 2–3 ngày'],
    image: 'https://images.pexels.com/photos/3779708/pexels-photo-3779708.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#dc2626',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },

  'S-05': {
    icon: 'biotech',
    category: 'Điều Trị Nội Nha',
    desc: 'Điều trị tủy triệt để bằng máy trâm xoay, loại bỏ tủy viêm, trám kín ống tủy — bảo tồn tối đa răng thật.',
    duration: '60 – 90 phút',
    highlights: ['Máy trâm xoay ProTaper', 'X-quang định vị ống tủy', 'Không đau sau điều trị'],
    image: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=600&q=80',
    accentColor: '#7c3aed',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },

  'S-06': {
    icon: 'rebase',
    category: 'Cấy Ghép Implant',
    desc: 'Trụ Titanium cắm trực tiếp vào xương hàm thay thế chân răng thật, tải lực nhai vĩnh cửu, không ảnh hưởng răng bên cạnh.',
    duration: '60 – 90 phút/giai đoạn',
    badge: 'PREMIUM',
    badgeColor: 'bg-indigo-600 text-white',
    highlights: ['Implant Straumann Thụy Sĩ', 'Bảo hành 25 năm', 'Tỷ lệ thành công 98.7%'],
    image:  'https://images.unsplash.com/photo-1588776814546-1ffedac39b40?auto=format&fit=crop&w=600&q=80',
    accentColor: '#4f46e5',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },

  'S-07': {
    icon: 'grid_view',
    category: 'Chỉnh Nha',
    desc: 'Mắc cài kim loại/sứ hoặc khay trong suốt Invisalign, dịch chuyển răng về đúng vị trí, sửa khớp cắn lệch hiệu quả.',
    duration: '12 – 24 tháng',
    badge: 'PHỔ BIẾN',
    badgeColor: 'bg-emerald-600 text-white',
    highlights: ['Invisalign & mắc cài sứ', 'Theo dõi kỹ thuật số', 'Kế hoạch cá nhân hóa'],
    image: 'https://images.pexels.com/photos/6627536/pexels-photo-6627536.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#059669',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },

  'S-08': {
    icon: 'assignment',
    category: 'Chẩn Đoán',
    desc: 'Kiểm tra toàn diện sức khỏe răng miệng, chụp X-quang chuẩn đoán và lập phác đồ điều trị chi tiết cùng bác sĩ chuyên khoa.',
    duration: '15 – 30 phút',
    badge: 'MIỄN PHÍ',
    badgeColor: 'bg-green-500 text-white',
    highlights: ['Chụp X-quang toàn hàm', 'Phân tích AI hỗ trợ chẩn đoán', 'Miễn phí lần đầu'],
    image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80',    accentColor: '#16a34a',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },

  'S-09': {
    icon: 'diamond',
    category: 'Phục Hình Sứ',
    desc: 'Mão sứ toàn sứ Zirconia độ trong cao, phủ lên răng hư, đổi màu, tạo hình lại nụ cười hoàn hảo bền vững.',
    duration: '2 – 3 buổi hẹn',
    highlights: ['Zirconia IPS e.max', 'Màu sắc tự nhiên như răng thật', 'Không gây dị ứng'],
    image: 'https://images.pexels.com/photos/6627421/pexels-photo-6627421.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#db2777',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
  },

  'S-10': {
    icon: 'child_care',
    category: 'Nha Khoa Trẻ Em',
    desc: 'Khám, trám, nhổ sữa và phòng ngừa sâu răng cho trẻ em từ 3 tuổi, môi trường thân thiện giúp trẻ không sợ nha sĩ.',
    duration: '15 – 30 phút',
    highlights: ['Chuyên gia nhi khoa', 'Phòng khám màu sắc vui', 'Trám Fluor phòng ngừa'],
    image: 'https://images.pexels.com/photos/6627421/pexels-photo-6627421.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#f59e0b',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },

  'S-11': {
    icon: 'lens_blur',
    category: 'Phẫu Thuật Nướu',
    desc: 'Điều trị cười hở nướu, cắt viền nướu bất đối xứng và điều trị viêm nha chu mãn tính bằng công nghệ Laser Er:YAG.',
    duration: '45 – 90 phút',
    highlights: ['Laser Er:YAG không đau', 'Hồi phục nhanh 48h', 'Kết quả thẩm mỹ rõ ngay'],
    image: 'https://images.pexels.com/photos/3845624/pexels-photo-3845624.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    accentColor: '#0891b2',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
  },

  'S-12': {
    icon: 'image_search',
    category: 'Chẩn Đoán Hình Ảnh',
    desc: 'Chụp X-quang kỹ thuật số Panoramic, CT Cone Beam 3D giúp chẩn đoán chính xác vị trí, cấu trúc xương hàm trước phẫu thuật.',
    duration: '15 – 30 phút',
    highlights: ['CT Cone Beam 3D', 'Liều bức xạ cực thấp', 'Kết quả ngay 10 phút'],
    image: 'https://images.unsplash.com/photo-1559757175-7cb057fba93c?auto=format&fit=crop&w=600&q=80',    accentColor: '#64748b',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
  },
};

const CATEGORIES = ['Tất cả', 'Chăm Sóc Cơ Bản', 'Thẩm Mỹ Răng', 'Phục Hồi Răng', 'Phẫu Thuật', 'Điều Trị Nội Nha', 'Cấy Ghép Implant', 'Chỉnh Nha', 'Chẩn Đoán'];

export const Services: React.FC = () => {
  const { services } = useClinic();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const enriched = services.map(s => ({
    ...s,
    meta: SERVICE_META[s.id] ?? {
      icon: 'dentistry', category: 'Khác', desc: 'Dịch vụ nha khoa chuyên sâu tại GoodSmile.', duration: '30 – 60 phút',
      badge: undefined, badgeColor: undefined, highlights: [], image: DEFAULT_SERVICE_IMAGE,
      accentColor: '#00478d', bgColor: 'bg-blue-50', textColor: 'text-blue-700',
    }
  }));

  const filtered = enriched.filter(s => {
    const matchCat = activeCategory === 'Tất cả' || s.meta.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.meta.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedSvc = selectedService ? enriched.find(s => s.id === selectedService) : null;

  return (
    <div className="bg-background min-h-screen">

      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] py-20 px-6 md:px-16">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 text-white/90 rounded-full text-xs font-bold mb-5 border border-white/20">
            <Icon name="medical_services" className="text-[14px]" />
            12 Chuyên Khoa · Công Nghệ 4.0
          </div>
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Dịch Vụ Nha Khoa<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">Toàn Diện & Chuyên Sâu</span>
              </h1>
              <p className="text-white/80 text-base mt-4 max-w-lg leading-relaxed">
                Từ chăm sóc cơ bản đến phẫu thuật phức tạp — GoodSmile áp dụng công nghệ đầu ngành, đội ngũ chuyên gia quốc tế và quy trình minh bạch để đảm bảo kết quả tối ưu cho mỗi bệnh nhân.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
              {[
                { val: '12+', label: 'Chuyên khoa' },
                { val: '98%', label: 'Hài lòng' },
                { val: '15+', label: 'Năm KN' },
              ].map((s, i) => (
                <div key={i} className="text-center bg-white/10 rounded-2xl px-5 py-4 border border-white/15 backdrop-blur-sm">
                  <p className="text-3xl font-extrabold text-white">{s.val}</p>
                  <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Filter Bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              <Icon name="search" />
            </div>
            <input
              type="text"
              placeholder="Tìm dịch vụ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Category pills — horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-12">

        {/* Result count */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-on-surface-variant">
            Hiển thị <span className="font-bold text-on-surface">{filtered.length}</span> dịch vụ
            {activeCategory !== 'Tất cả' && <> trong <span className="font-bold text-primary">"{activeCategory}"</span></>}
          </p>
          <button
            onClick={() => setIsBookingOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Icon name="calendar_month" className="text-[16px]" />
            Đặt lịch ngay
          </button>
        </div>

        {/* Service Grid — Masonry-inspired variable layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((svc) => {
            const meta = svc.meta;
            return (
              <div
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className="group relative bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
              >
                {/* Image Header */}
                <div className="relative h-44 overflow-hidden">
                  <ServiceImage
                    src={meta.image}
                    alt={svc.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

                  {/* Category pill on image */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm ${meta.bgColor} ${meta.textColor} border border-current/20`}>
                      {meta.category}
                    </span>
                  </div>

                  {/* Badge */}
                  {meta.badge && (
                    <div className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${meta.badgeColor}`}>
                      {meta.badge}
                    </div>
                  )}

                  {/* Duration on image */}
                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Icon name="schedule" className="text-[10px]" />
                    {meta.duration}
                  </div>

                  {/* Icon overlay bottom-left */}
                  <div className="absolute bottom-3 left-3 w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                    <div className="text-white text-[16px]">
                      <Icon name={meta.icon} />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col flex-1 p-5 space-y-3">
                  <h3 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors leading-snug">{svc.name}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">{meta.desc}</p>

                  {/* Highlights */}
                  <ul className="space-y-1.5">
                    {meta.highlights.slice(0, 3).map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.accentColor + '20' }}>
                          <div className="text-[10px]" style={{ color: meta.accentColor }}>
                            <Icon name="check" />
                          </div>
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-outline font-bold uppercase tracking-wide">Chi phí trọn gói</p>
                      <p className="text-lg font-extrabold" style={{ color: meta.accentColor }}>
                        {svc.price === 0 ? (
                          <span className="text-emerald-600">Miễn phí</span>
                        ) : (
                          `₫${svc.price.toLocaleString()}`
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold" style={{ color: meta.accentColor }}>
                      Xem chi tiết
                      <Icon name="arrow_forward" className="text-[14px] transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Icon name="search_off" className="text-5xl text-slate-300 flex justify-center" />
            <p className="text-on-surface-variant mt-3 font-semibold">Không tìm thấy dịch vụ phù hợp</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('Tất cả'); }} className="mt-3 text-primary text-sm hover:underline cursor-pointer">Xóa bộ lọc</button>
          </div>
        )}

        {/* ── Process Section ── */}
        <section className="mt-20 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-on-surface">Quy Trình Điều Trị Chuẩn Quốc Tế</h2>
            <p className="text-on-surface-variant text-sm mt-2">4 bước đơn giản — từ đặt lịch đến hoàn thành điều trị</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-1/8 right-1/8 h-0.5 bg-gradient-to-r from-primary to-secondary z-0" style={{ left: '12.5%', right: '12.5%' }}></div>

            {[
              { step: '01', icon: 'calendar_month', title: 'Đặt Lịch', desc: 'Online 24/7 qua app, web, hoặc hotline. Xác nhận SMS trong 15 phút.', color: 'bg-primary text-on-primary' },
              { step: '02', icon: 'assignment', title: 'Khám & Chẩn Đoán', desc: 'Bác sĩ thăm khám, chụp X-quang và lập phác đồ điều trị cá nhân hóa.', color: 'bg-blue-600 text-white' },
              { step: '03', icon: 'dentistry', title: 'Thực Hiện Điều Trị', desc: 'Điều trị bằng thiết bị hiện đại, bác sĩ chuyên khoa đồng hành xuyên suốt.', color: 'bg-secondary text-on-secondary' },
              { step: '04', icon: 'verified', title: 'Theo Dõi Hậu Điều Trị', desc: 'Nhắc lịch tái khám, hỗ trợ 24/7 qua Zalo và ứng dụng GoodSmile.', color: 'bg-purple-600 text-white' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 relative z-10">
                <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center shadow-lg mb-4`}>
                  <Icon name={step.icon} className="text-2xl" />
                </div>
                <span className="text-[9px] font-extrabold text-outline uppercase tracking-widest mb-1">Bước {step.step}</span>
                <h4 className="font-bold text-sm text-on-surface mb-2">{step.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust badges ── */}
        <section className="bg-surface-container rounded-2xl p-8 mb-12 border border-outline-variant">
          <p className="text-center text-[10px] font-bold text-outline uppercase tracking-widest mb-6">Được Chứng Nhận Bởi</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: 'workspace_premium', label: 'ISO 9001:2015', sub: 'Quản lý chất lượng' },
              { icon: 'security', label: 'HIPAA Compliant', sub: 'Bảo mật dữ liệu' },
              { icon: 'medical_services', label: 'Bộ Y Tế VN', sub: 'Giấy phép hoạt động' },
              { icon: 'star', label: 'Straumann Partner', sub: 'Implant cao cấp' },
              { icon: 'verified', label: 'Invisalign Diamond', sub: 'Niềng trong suốt' },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name={badge.icon} className="text-primary text-xl" />
                </div>
                <p className="font-bold text-xs text-on-surface">{badge.label}</p>
                <p className="text-[9px] text-outline">{badge.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <div className="premium-glow rounded-2xl p-10 text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5"></div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-white/5"></div>
          </div>
          <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl font-extrabold">Chưa tìm thấy dịch vụ phù hợp?</h2>
            <p className="text-white/80 mt-2 text-sm">Đặt lịch khám tổng quát miễn phí — bác sĩ sẽ chẩn đoán chính xác và tư vấn kế hoạch điều trị tối ưu nhất cho bạn.</p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm hover:shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              Đặt khám miễn phí →
            </button>
            <button className="border border-white/40 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all cursor-pointer">
              Gọi 1800-SMILE
            </button>
          </div>
        </div>
      </div>

      {/* ── Service Detail Modal ── */}
      {selectedSvc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal image header */}
            <div className="relative h-52 overflow-hidden shrink-0">
              <ServiceImage src={selectedSvc.meta.image} alt={selectedSvc.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
              <div className="absolute bottom-4 left-5">
                <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${selectedSvc.meta.bgColor} ${selectedSvc.meta.textColor}`}>
                  {selectedSvc.meta.category}
                </span>
                <h2 className="text-white font-extrabold text-xl mt-1">{selectedSvc.name}</h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              <p className="text-on-surface-variant text-sm leading-relaxed">{selectedSvc.meta.desc}</p>

              {/* Key info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-4 ${selectedSvc.meta.bgColor}`}>
                  <p className="text-[9px] font-bold uppercase text-outline">Thời gian</p>
                  <p className={`font-bold text-sm mt-1 ${selectedSvc.meta.textColor}`}>{selectedSvc.meta.duration}</p>
                </div>
                <div className={`rounded-xl p-4 ${selectedSvc.meta.bgColor}`}>
                  <p className="text-[9px] font-bold uppercase text-outline">Chi phí</p>
                  <p className={`font-bold text-sm mt-1 ${selectedSvc.meta.textColor}`}>
                    {selectedSvc.price === 0 ? 'Miễn phí' : `₫${selectedSvc.price.toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <p className="text-[10px] font-bold uppercase text-outline tracking-widest mb-3">Điểm nổi bật</p>
                <ul className="space-y-2">
                  {selectedSvc.meta.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-on-surface">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: selectedSvc.meta.accentColor + '20' }}>
                        <div className="text-[14px]" style={{ color: selectedSvc.meta.accentColor }}>
                          <Icon name="check_circle" />
                        </div>
                      </div>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Doctor recommendation */}
              <div className="bg-surface-container rounded-xl p-4 flex items-center gap-4">
                <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=80&h=80&q=80" alt="Doctor" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                <div>
                  <p className="text-[10px] text-outline font-bold uppercase">Bác sĩ tư vấn</p>
                  <p className="font-bold text-sm text-on-surface">Bác sĩ Lê Minh</p>
                  <p className="text-xs text-on-surface-variant">Chuyên gia Nội nha & Điều trị Tủy</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex gap-3 shrink-0">
              <button
                onClick={() => setSelectedService(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface-variant font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => { setSelectedService(null); setIsBookingOpen(true); }}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Đặt lịch dịch vụ này →
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
};
