import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { role, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthAction = () => {
    if (user) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface">
      {/* TopNavBar */}
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-container-padding-desktop py-3">
        <div className="flex items-center gap-stack-md">
          <Link to="/" className="hover:opacity-95 transition-opacity">
            <BrandLogo size="md" variant="dark" />
          </Link>
          <nav className="hidden md:flex items-center gap-stack-lg ml-stack-lg">
            <Link
              to="/"
              className={`font-label-md text-base py-base transition-colors ${
                isActive('/')
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              Trang Chủ
            </Link>
            <Link
              to="/about"
              className={`font-label-md text-base py-base transition-colors ${
                isActive('/about')
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              Về chúng tôi
            </Link>
            <Link
              to="/services"
              className={`font-label-md text-base py-base transition-colors ${
                isActive('/services')
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              Dịch vụ
            </Link>
            <Link
              to="/doctors"
              className={`font-label-md text-base py-base transition-colors ${
                isActive('/doctors')
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              Đội ngũ bác sĩ
            </Link>
            <Link
              to="/contact"
              className={`font-label-md text-base px-4 py-2 border-2 rounded-lg font-bold transition-all ${
                isActive('/contact')
                  ? 'bg-[#005eb8] text-white border-yellow-400 shadow-sm'
                  : 'bg-[#005eb8]/5 text-[#005eb8] border-[#005eb8] hover:bg-[#005eb8] hover:text-white hover:border-yellow-400'
              }`}
            >
              Liên hệ
            </Link>
            <Link
              to="/book"
              className={`font-label-md text-base px-4 py-2 border-2 rounded-lg font-bold transition-all ${
                isActive('/book')
                  ? 'bg-[#005eb8] text-white border-yellow-400 shadow-sm'
                  : 'bg-[#005eb8]/5 text-[#005eb8] border-[#005eb8] hover:bg-[#005eb8] hover:text-white hover:border-yellow-400'
              }`}
            >
              Đặt lịch khám
            </Link>

          </nav>
        </div>
        
        <div className="flex items-center gap-stack-md">
          {user && (
            <Link
              to={role === 'patient' ? '/patient' : `/dashboard/${role}`}
              className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 font-bold font-label-md text-sm px-4 py-2 hover:bg-primary/20 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Icon name="space_dashboard" className="text-[18px]" />
              <span>{role === 'patient' ? 'Trang cá nhân' : 'Vào bàn làm việc'}</span>
            </Link>
          )}
          <button
            onClick={handleAuthAction}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold font-label-md text-base active:scale-95 transition-all shadow-sm"
          >
            {user ? 'Đăng xuất' : 'Đăng nhập'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-high px-container-padding-desktop py-stack-lg border-t border-outline-variant mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-stack-lg">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <BrandLogo size="md" variant="dark" />
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant mt-stack-md max-w-sm">
              Giải pháp nha khoa chuyên sâu toàn diện, nâng cao hiệu quả điều trị và chất lượng nụ cười của bạn.
            </p>
            <div className="flex gap-stack-md mt-stack-lg">
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary border border-outline-variant hover:bg-primary hover:text-white transition-all">
                <Icon name="public" className="text-lg" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary border border-outline-variant hover:bg-primary hover:text-white transition-all">
                <Icon name="mail" className="text-lg" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary border border-outline-variant hover:bg-primary hover:text-white transition-all">
                <Icon name="call" className="text-lg" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm mb-stack-md">Sản phẩm</h4>
            <ul className="space-y-base text-body-md font-body-md text-on-surface-variant">
              <li onClick={() => {}} className="hover:text-primary cursor-pointer transition-colors">Dịch vụ & Chi phí</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Tính năng AI tư vấn</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Hướng dẫn sử dụng</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Hệ thống lâm sàng</li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm mb-stack-md">Hỗ trợ</h4>
            <ul className="space-y-base text-body-md font-body-md text-on-surface-variant">
              <li className="hover:text-primary cursor-pointer transition-colors">Trung tâm trợ giúp</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Điều khoản dịch vụ</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Chính sách bảo mật</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Liên hệ khẩn cấp</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-stack-lg pt-stack-md border-t border-outline-variant text-center text-label-md font-label-md text-on-surface-variant">
          © 2026 GoodSmile Dental. Tất cả quyền được bảo lưu.
        </div>
      </footer>
    </div>
  );
};
