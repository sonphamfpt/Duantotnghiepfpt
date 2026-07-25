import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { Icon } from '../../components/Icon';


export const DoctorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dentists } = useClinic();

  // Find the base dentist record in state
  const dentist = dentists.find(d => d.id === id);
  const profile = dentist;

  React.useEffect(() => {
    if (dentist) {
      document.title = `${dentist.name} - GoodSmile Clinic`;
    }
  }, [dentist]);

  // Get other doctors (excluding the current one)
  const otherDoctors = dentists.filter(d => d.id !== id);

  if (!dentist || !profile) {
    return (
      <div className="bg-[#f8fafc] min-h-screen py-20 px-6 font-body-md text-center">
        <div className="max-w-md mx-auto bg-white border border-[#e2e8f0] p-8 rounded-lg shadow-sm">
          <Icon name="error" className="text-red-500 text-6xl mb-4" />
          <h2 className="text-2xl font-bold text-[#0f172a] mb-2">Không tìm thấy bác sĩ</h2>
          <p className="text-[#64748b] mb-6">Thông tin bác sĩ không tồn tại hoặc đã được cập nhật lại.</p>
          <Link
            to="/doctors"
            className="inline-flex items-center gap-2 bg-[#005eb8] text-white px-5 py-2.5 font-bold hover:bg-[#004a94] transition-colors"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body-md">
      
      {/* ── Premium Hero Banner (Consistent across public pages) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] py-16 px-6 md:px-16">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="mb-4">
            <Link to="/doctors" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold transition-colors">
              <Icon name="arrow_back" className="text-[16px]" />
              Danh sách bác sĩ
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-white/80 font-bold tracking-widest uppercase text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20">
                {profile.degree}
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-2 leading-tight">
                {dentist.name}
              </h1>
              <p className="text-white/80 text-lg mt-2 font-medium">
                {profile.specialty}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Avatar & Quick Info */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Photo Card */}
              <div className="bg-white border border-[#e2e8f0] p-6 shadow-sm flex flex-col items-center">
                <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-white shadow-md bg-white mb-6">
                  <img src={dentist.avatar} alt={dentist.name} className="w-full h-full object-cover" />
                </div>
                
                {/* Stats */}
                <div className="w-full grid grid-cols-2 gap-2 mb-6 text-center">
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3">
                    <p className="text-[10px] text-[#64748b] uppercase font-bold tracking-wider">Kinh nghiệm</p>
                    <p className="text-xl font-bold text-[#005eb8] mt-1">{profile.experience} năm</p>
                  </div>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3">
                    <p className="text-[10px] text-[#64748b] uppercase font-bold tracking-wider">Ca lâm sàng</p>
                    <p className="text-xl font-bold text-[#005eb8] mt-1">{profile.cases}</p>
                  </div>
                </div>

                {/* Booking Button */}
                <button
                  onClick={() => navigate(`/book?dentistId=${dentist.id}`)}
                  className="w-full bg-[#005eb8] text-white py-3 px-4 font-bold flex justify-center items-center gap-2 hover:bg-[#004a94] transition-colors cursor-pointer"
                >
                  <Icon name="event_available" className="text-[18px]" />
                  Đặt Lịch Với Bác Sĩ
                </button>
              </div>

              {/* Motto Box */}
              <div className="bg-gradient-to-br from-[#eff6ff] to-[#f0fdf4] border border-[#bfdbfe] p-6 shadow-sm relative overflow-hidden">
                <span className="absolute top-2 right-4 text-6xl text-[#93c5fd]/30 font-serif pointer-events-none">“</span>
                <h3 className="text-xs font-bold uppercase text-[#1d4ed8] tracking-wider mb-2">Châm ngôn y đức</h3>
                <p className="text-sm font-semibold text-[#1e3a8a] italic leading-relaxed relative z-10">
                  "{profile.motto}"
                </p>
              </div>

            </div>

            {/* Right Column: Detailed CV */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Bio & Strengths */}
              <div className="bg-white border border-[#e2e8f0] p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] mb-3 pb-2 border-b border-[#e2e8f0] flex items-center gap-2">
                    <Icon name="person" className="text-[#005eb8]" />
                    Giới thiệu chung
                  </h2>
                  <p className="text-[#334155] leading-relaxed text-base">
                    {profile.bio}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase text-[#475569] mb-3 flex items-center gap-2">
                    <Icon name="health_and_safety" className="text-[#005eb8] text-[18px]" />
                    Thế mạnh điều trị chuyên sâu
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.clinicalStrengths?.map((strength, i) => (
                      <span key={i} className="text-sm bg-[#f1f5f9] text-[#334155] px-4 py-2 border border-[#e2e8f0] font-medium">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Education & Work Experience */}
              <div className="bg-white border border-[#e2e8f0] p-6 md:p-8 shadow-sm space-y-8">
                
                {/* Education */}
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] mb-4 pb-2 border-b border-[#e2e8f0] flex items-center gap-2">
                    <Icon name="school" className="text-[#005eb8]" />
                    Quá trình đào tạo & Bằng cấp
                  </h2>
                  <ul className="space-y-4">
                    {profile.education?.map((edu, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="bg-[#eff6ff] text-[#1d4ed8] p-1.5 rounded shrink-0">
                          <Icon name="school" className="text-[18px]" />
                        </div>
                        <div>
                          <p className="text-sm md:text-base font-semibold text-[#1e293b]">{edu}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Work Experience */}
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] mb-4 pb-2 border-b border-[#e2e8f0] flex items-center gap-2">
                    <Icon name="work" className="text-[#005eb8]" />
                    Lịch sử công tác
                  </h2>
                  <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6 py-2">
                    {profile.workHistory?.map((work, i) => {
                      const [time, desc] = work.split(': ');
                      return (
                        <div key={i} className="relative">
                          {/* Dot marker */}
                          <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 bg-[#005eb8] border-2 border-white rounded-full"></div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">{time}</p>
                          <p className="text-sm md:text-base font-semibold text-[#1e293b] mt-1">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] mb-4 pb-2 border-b border-[#e2e8f0] flex items-center gap-2">
                    <Icon name="verified" className="text-[#005eb8]" />
                    Chứng chỉ & Hiệp hội thành viên
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.certifications?.map((cert, i) => (
                      <div key={i} className="flex gap-2 items-center bg-[#f8fafc] border border-[#e2e8f0] p-3">
                        <Icon name="verified" className="text-[#15803d]" />
                        <span className="text-sm font-bold text-[#334155]">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Section: Other Doctors ── */}
      <section className="py-16 bg-[#f1f5f9] border-t border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-[#005eb8] font-bold text-xs uppercase tracking-widest bg-white px-3 py-1 border border-[#cbd5e1]">
                Đội Ngũ Chuyên Gia
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mt-3">
                Các Bác Sĩ Khác
              </h2>
            </div>
            <Link 
              to="/doctors" 
              className="text-[#005eb8] hover:text-[#004a94] text-sm font-bold flex items-center gap-1 transition-colors"
            >
              Xem tất cả danh sách
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {otherDoctors.map(doc => {
              const displayTitle = doc.degree || 'Bác sĩ nha khoa';
              const displayName = doc.name;
              const shortBio = doc.bio || doc.specialty || doc.role;

              return (
                <Link
                  to={`/doctors/${doc.id}`}
                  key={doc.id}
                  className="bg-white border border-[#e2e8f0] rounded-2xl hover:border-[#005eb8] hover:scale-[1.03] transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col items-center p-6 group cursor-pointer text-center"
                >
                  {/* Doctor Avatar */}
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm mb-4 shrink-0 bg-white">
                    <img 
                      src={doc.avatar} 
                      alt={doc.name} 
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
                    />
                  </div>
                  
                  {/* Doctor Info */}
                  <div className="flex-1 flex flex-col items-center w-full min-w-0">
                    <span className="text-[10px] font-extrabold text-[#006d33] uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-2">
                      {displayTitle}
                    </span>
                    <h3 className="text-base font-extrabold text-[#0f172a] group-hover:text-[#005eb8] transition-colors truncate w-full">
                      {displayName}
                    </h3>
                    <p className="text-xs text-[#64748b] font-semibold mt-1 truncate w-full">
                      {doc.specialty || doc.role}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] font-medium mt-2 line-clamp-2 w-full text-center leading-relaxed">
                      {shortBio}
                    </p>
                  </div>

                  {/* View Profile Button */}
                  <div className="mt-4 pt-3 w-full border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold text-[#005eb8] group-hover:text-[#004a94] transition-colors">
                    <span>Xem thông tin chi tiết</span>
                    <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
