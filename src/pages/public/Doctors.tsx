import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { Icon } from '../../components/Icon';

const CATEGORIES = ['Tất cả chuyên khoa', 'Bảo tồn & Vi Phẫu', 'Phẫu thuật Hàm Mặt & Implant', 'Phục Hình Thẩm Mỹ', 'Chỉnh Nha & Niềng Răng'];
const DEFAULT_DOCTOR_AVATAR = 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop';

export const Doctors: React.FC = () => {
  const { dentists } = useClinic();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Tất cả chuyên khoa');

  useEffect(() => {
    document.title = 'Đội Ngũ Bác Sĩ - GoodSmile Clinic';
  }, []);

  const enrichedDentists = dentists.map(d => ({
    ...d,
    displayTitle: d.degree || 'Bác sĩ nha khoa',
    displayName: d.name,
    shortBio: d.bio || d.specialty || d.role,
    profile: {
      specialty: d.specialty || 'Bác sĩ Răng Hàm Mặt',
      degree: d.degree || 'Bác sĩ',
      education: d.education || [],
      experience: d.experience || 5,
      cases: d.cases || '500+ ca',
      clinicalStrengths: d.clinicalStrengths || [],
      certifications: d.certifications || [],
      universityLogo: 'school',
      bio: d.bio || '',
      motto: d.motto || '',
      workHistory: d.workHistory || []
    }
  }));

  const filtered = enrichedDentists.filter(doc => {
    if (activeCategory === 'Tất cả chuyên khoa') return true;
    const specLower = (doc.profile.specialty + ' ' + doc.role + ' ' + doc.shortBio).toLowerCase();
    if (activeCategory === 'Bảo tồn & Vi Phẫu') {
      return specLower.includes('bảo tồn') || specLower.includes('vi phẫu') || specLower.includes('nội nha') || specLower.includes('tủy') || specLower.includes('sâu');
    }
    if (activeCategory === 'Phẫu thuật Hàm Mặt & Implant') {
      return specLower.includes('phẫu thuật') || specLower.includes('implant') || specLower.includes('hàm mặt') || specLower.includes('răng khôn');
    }
    if (activeCategory === 'Phục Hình Thẩm Mỹ') {
      return specLower.includes('phục hình') || specLower.includes('thẩm mỹ') || specLower.includes('sứ') || specLower.includes('tẩy trắng');
    }
    if (activeCategory === 'Chỉnh Nha & Niềng Răng') {
      return specLower.includes('chỉnh nha') || specLower.includes('niềng');
    }
    return specLower.includes(activeCategory.toLowerCase());
  });

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body-md">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] py-20 px-6 md:px-16">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center space-y-4">
          <span className="text-white/80 font-bold tracking-widest uppercase text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Hội Đồng Y Khoa GoodSmile
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Đội Ngũ Bác Sĩ <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">Chuyên Môn Cao</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Quy tụ các chuyên gia nha khoa đầu ngành, tốt nghiệp và tu nghiệp tại các trường y khoa danh tiếng trong và ngoài nước.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="bg-white border-b border-[#e2e8f0] sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 overflow-x-auto custom-scrollbar flex gap-2 justify-start md:justify-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-2 text-sm font-bold border transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#005eb8] text-white border-[#005eb8]'
                  : 'bg-white text-[#475569] border-[#cbd5e1] hover:bg-[#f1f5f9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Grid of Vertical Cards */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#e2e8f0] p-8">
              <Icon name="search_off" className="text-slate-400 text-5xl mb-2" />
              <p className="text-[#64748b] font-bold">Không tìm thấy bác sĩ nào thuộc chuyên khoa này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filtered.map(doc => (
                <Link
                  to={`/doctors/${doc.id}`}
                  key={doc.id}
                  className="bg-white border-2 border-slate-200 hover:border-amber-400 hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-md flex flex-col overflow-hidden text-center group cursor-pointer"
                >
                  <div className="aspect-[4/5] bg-slate-50 overflow-hidden relative border-b border-slate-100">
                    <img 
                      src={doc.avatar} 
                      alt={doc.name} 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_DOCTOR_AVATAR;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <span className="bg-[#005eb8] text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1 shadow-sm">
                        Xem hồ sơ chi tiết
                        <Icon name="arrow_forward" className="text-[12px]" />
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {doc.displayTitle}
                    </span>

                    <h2 className="text-lg font-extrabold text-[#00478d] group-hover:text-[#005eb8] transition-colors mb-3 line-clamp-1">
                      {doc.displayName}
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mt-auto">
                      {doc.shortBio}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Clinical Standards */}
      <section className="py-16 bg-white border-t border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#005eb8] font-bold text-xs uppercase tracking-widest bg-[#eff6ff] px-3 py-1 border border-[#bfdbfe]">
              Tiêu Chuẩn Lâm Sàng
            </span>
            <h2 className="text-3xl font-extrabold text-[#0f172a] mt-3">
              Cam Kết Chất Lượng Y Khoa GoodSmile
            </h2>
            <p className="text-[#64748b] text-sm mt-2">
              Chúng tôi không chỉ có đội ngũ y bác sĩ giỏi chuyên môn mà còn duy trì những quy chuẩn nghiêm ngặt nhất để mang lại sự an tâm tuyệt đối cho khách hàng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-8 hover:shadow-sm transition-shadow">
              <div className="bg-[#eff6ff] text-[#1d4ed8] w-12 h-12 flex items-center justify-center mb-6">
                <Icon name="verified" className="text-[28px]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">100% Bác Sĩ Chính Quy</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Tất cả bác sĩ tại hệ thống đều tốt nghiệp chính quy chuyên ngành Răng Hàm Mặt từ các trường đại học y danh tiếng, có đầy đủ chứng chỉ hành nghề hợp pháp.
              </p>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-8 hover:shadow-sm transition-shadow">
              <div className="bg-[#f0fdf4] text-[#15803d] w-12 h-12 flex items-center justify-center mb-6">
                <Icon name="health_and_safety" className="text-[28px]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">Vô Trùng Tiêu Chuẩn Quốc Tế</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Áp dụng quy trình kiểm soát nhiễm khuẩn khép kín nghiêm ngặt. Mỗi khách hàng sử dụng một bộ tay khoan và bộ dụng cụ riêng biệt đã hấp sấy vô trùng tuyệt đối.
              </p>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-8 hover:shadow-sm transition-shadow">
              <div className="bg-[#fdf2f8] text-[#be185d] w-12 h-12 flex items-center justify-center mb-6">
                <Icon name="psychology" className="text-[28px]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">Công Nghệ Đi Đầu</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Hệ thống trang thiết bị tối tân như máy chụp phim Conebeam CT 3D, máy nhổ răng khôn Piezotome, kính hiển vi vi phẫu phục vụ chẩn đoán chính xác tuyệt đối.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#00478d] to-[#006d33] py-16 px-6 md:px-16 text-center text-white">
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Đăng Ký Tư Vấn Trực Tiếp Cùng Hội Đồng Y Khoa
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Nhận lịch khám ưu tiên, miễn phí chụp phim X-Quang khảo sát răng và nhận phác đồ điều trị chi tiết từ các chuyên gia đầu ngành của chúng tôi.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/book')}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-8 py-3.5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer inline-flex items-center gap-2"
            >
              <Icon name="calendar_month" className="text-[20px]" />
              Đặt Lịch Hẹn Ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
