import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';


interface NavItem {
  label: string;
  icon: string;
  path: string;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
  };

  const getRoleAccentClass = () => {
    switch (role) {
      case 'patient': return 'border-secondary';
      case 'receptionist': return 'border-orange-500';
      case 'dentist': return 'border-primary';
      case 'cashier': return 'border-amber-600';
      case 'manager': return 'border-purple-600';
      default: return 'border-outline-variant';
    }
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'patient': return { title: 'Cổng Bệnh Nhân', badge: 'bg-secondary/10 text-secondary border-secondary/20', dot: 'bg-secondary' };
      case 'receptionist': return { title: 'Quản Lý Tiếp Đón', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
      case 'dentist': return { title: 'Hồ Sơ Lâm Sàng', badge: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' };
      case 'cashier': return { title: 'Thu Ngân & Tài Chính', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-600' };
      case 'manager': return { title: 'Quản Trị Hệ Thống', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-600' };
      default: return { title: 'GoodSmile Pro', badge: 'bg-surface-container text-outline border-outline-variant', dot: 'bg-outline' };
    }
  };

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'patient':
        return [
          { label: 'Bảng điều khiển', icon: 'dashboard', path: '/patient' },
          { label: 'Đặt lịch khám', icon: 'calendar_add_on', path: '/patient?tab=booking' },
          { label: 'Lịch hẹn của tôi', icon: 'calendar_month', path: '/patient?tab=appointments' },
          { label: 'Hàng chờ thực tế', icon: 'groups', path: '/patient?tab=queue' },
          { label: 'Hồ sơ bệnh án', icon: 'folder_shared', path: '/patient?tab=records' },
          { label: 'Lịch sử giao dịch', icon: 'history', path: '/patient?tab=billing' },
        ];
      case 'receptionist':
        return [
          { label: 'Bàn tiếp nhận', icon: 'folder_shared', path: '/dashboard/receptionist' },
          { label: 'Hàng chờ trực tiếp', icon: 'pending_actions', path: '/dashboard/receptionist?tab=queue' },
          { label: 'Lịch hẹn phòng khám', icon: 'receipt_long', path: '/dashboard/receptionist?tab=appointments' },
          { label: 'Trung tâm công việc', icon: 'assignment_turned_in', path: '/dashboard/receptionist?tab=reminders' },
          { label: 'Lịch sử tiếp đón', icon: 'history', path: '/dashboard/receptionist?tab=history' },
        ];
      case 'dentist':
        return [
          { label: 'Hàng chờ bác sĩ', icon: 'pending_actions', path: '/dashboard/dentist' },
          { label: 'Bàn khám lâm sàng', icon: 'dashboard', path: '/dashboard/dentist?tab=workspace' },
          { label: 'Hồ sơ bệnh án EMR', icon: 'folder_shared', path: '/dashboard/dentist?tab=records' },
          { label: 'Lịch làm việc', icon: 'calendar_month', path: '/dashboard/dentist?tab=schedule' },
        ];
      case 'cashier':
        return [
          { label: 'Thu phí hóa đơn', icon: 'payments', path: '/dashboard/cashier' },
          { label: 'Sổ quỹ & Báo cáo ca', icon: 'analytics', path: '/dashboard/cashier?tab=report' },
          { label: 'Lịch sử thanh toán', icon: 'history', path: '/dashboard/cashier?tab=history' },
        ];
      case 'manager':
        return [
          { label: 'Tổng quan phòng khám', icon: 'monitoring', path: '/dashboard/manager' },
          { label: 'Quản lý khách hàng', icon: 'person_search', path: '/dashboard/manager?tab=patients' },
          { label: 'Bảng theo dõi hàng chờ', icon: 'pending_actions', path: '/dashboard/manager?tab=queue' },
          { label: 'Doanh thu phòng khám', icon: 'receipt_long', path: '/dashboard/manager?tab=revenue' },
          { label: 'Lịch làm việc bác sĩ', icon: 'calendar_month', path: '/dashboard/manager?tab=schedule' },
          { label: 'Nhân sự & Phân quyền', icon: 'groups', path: '/dashboard/manager?tab=rbac' },
          { label: 'Cấu hình giá dịch vụ', icon: 'settings', path: '/dashboard/manager?tab=settings' },
          { label: 'Đánh giá & AI Phản hồi', icon: 'rate_review', path: '/dashboard/manager?tab=reviews' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const roleConfig = getRoleConfig();

  const isNavActive = (item: NavItem) => {
    if (item.path.includes('?')) {
      const [itemPathname, itemSearch] = item.path.split('?');
      if (location.pathname !== itemPathname) return false;
      const itemParams = new URLSearchParams(itemSearch);
      const currentParams = new URLSearchParams(location.search);
      let isMatch = true;
      itemParams.forEach((value, key) => {
        if (currentParams.get(key) !== value) {
          isMatch = false;
        }
      });
      return isMatch;
    }
    return location.pathname === item.path && (location.search === '' || !location.search.includes('tab='));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">

      {/* ── Sidebar ── */}
      <aside className="w-[240px] h-full bg-surface-container-low border-r border-outline-variant flex flex-col shrink-0 shadow-sm">

        {/* Logo */}
        <div className="px-4 py-6 flex flex-col items-center gap-2 border-b border-outline-variant/50 w-full text-center bg-white">
          <BrandLogo size="sm" variant="dark" />
          <p className="text-[9px] uppercase tracking-widest text-[#005eb8] font-bold mt-2 bg-[#eff6ff] px-2.5 py-1 rounded border border-[#bfdbfe]">
            {roleConfig.title}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item, index) => {
            const active = isNavActive(item);
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all duration-150 ${active
                    ? 'bg-secondary-container text-on-secondary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
              >
                <Icon name={item.icon} className="text-[20px]" />
                <span className="text-xs font-semibold truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-2 py-3 border-t border-outline-variant space-y-0.5">
          {role === 'patient' && (
            <button
              onClick={() => navigate('/')}
              className="w-full text-left text-on-surface-variant hover:bg-surface-container-high hover:text-primary rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all cursor-pointer"
            >
              <Icon name="home" className="text-[20px] text-primary" />
              <span className="text-xs font-semibold">Quay lại trang chủ</span>
            </button>
          )}
          {role === 'patient' && (
            <button
              onClick={() => navigate('/patient?tab=ai')}
              className="w-full text-left text-on-surface-variant hover:bg-surface-container-high rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all cursor-pointer"
            >
              <Icon name="smart_toy" className="text-[20px]" />
              <span className="text-xs font-semibold">AI tư vấn sức khỏe</span>
            </button>
          )}
          <button
            onClick={() => navigate('/queue-board')}
            className="w-full text-left text-on-surface-variant hover:bg-surface-container-high rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all cursor-pointer"
          >
            <Icon name="monitor" className="text-[20px]" />
            <span className="text-xs font-semibold">Bảng hàng chờ TV</span>
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full text-left text-error hover:bg-error-container/20 rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all cursor-pointer"
          >
            <Icon name="logout" className="text-[20px]" />
            <span className="text-xs font-semibold">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header */}
        <header className="h-14 bg-surface border-b border-outline-variant flex justify-between items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            {role === 'patient' && (
              <button
                onClick={() => navigate('/')}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-outline-variant/60 cursor-pointer shadow-sm active:scale-95"
                title="Quay lại Trang chủ GoodSmile"
              >
                <Icon name="home" className="text-[18px] text-primary" />
                <span className="hidden sm:inline">Quay lại trang chủ</span>
              </button>
            )}
            <div className="text-sm font-semibold text-on-surface-variant hidden sm:block">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full border flex items-center gap-1.5 text-[10px] font-bold ${roleConfig.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${roleConfig.dot}`}></span>
              <span className="hidden sm:inline">Phòng khám: Hoạt động</span>
            </div>

            <button
              onClick={() => alert('Báo động khẩn cấp y tế đã được phát đi!')}
              className="p-2 text-error hover:bg-error-container rounded-full transition-colors active:scale-95"
              title="Y tế khẩn cấp"
            >
              <Icon name="emergency" className="text-[22px]" />
            </button>

            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative">
              <Icon name="notifications" className="text-[22px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full"></span>
            </button>

            {/* User profile widget */}
            <div className="flex items-center gap-2 pl-3 border-l border-outline-variant">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-on-surface">{user?.name}</p>
                <p className="text-[9px] text-on-surface-variant">{user?.roleName}</p>
              </div>
              <img
                src={user?.avatar}
                alt={user?.name}
                className={`w-9 h-9 rounded-full object-cover border-2 ${getRoleAccentClass()}`}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfdfe]">
          {/* Real-Time Permission Guard Banner */}
          {role === 'receptionist' && user?.permissions && !user.permissions.admission && (
            <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm">
              <div className="flex items-center gap-3">
                <Icon name="warning" className="text-amber-600 text-xl shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">⚠️ Quyền Đón Tiếp Đã Bị Quản Lý Tạm Rút (Real-Time)</h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">Quản trị viên vừa rút quyền Đón tiếp (admission) của tài khoản này. Bạn không thể thực hiện check-in hoặc đón tiếp bệnh nhân mới.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 text-[10px] font-mono font-extrabold rounded-lg shrink-0">RBAC Enforced</span>
            </div>
          )}

          {role === 'dentist' && user?.permissions && !user.permissions.clinical && (
            <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm">
              <div className="flex items-center gap-3">
                <Icon name="warning" className="text-amber-600 text-xl shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">⚠️ Quyền Khám Lâm Sàng Đã Bị Quản Lý Tạm Rút (Real-Time)</h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">Quản trị viên vừa rút quyền Lâm sàng (clinical) của tài khoản này. Vui lòng liên hệ Quản lý để mở lại quyền khám.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 text-[10px] font-mono font-extrabold rounded-lg shrink-0">RBAC Enforced</span>
            </div>
          )}

          {role === 'cashier' && user?.permissions && !user.permissions.checkout && (
            <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm">
              <div className="flex items-center gap-3">
                <Icon name="warning" className="text-amber-600 text-xl shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">⚠️ Quyền Tính Tiền Thu Ngân Đã Bị Quản Lý Tạm Rút (Real-Time)</h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">Quản trị viên vừa rút quyền Tính tiền (checkout) của tài khoản này. Bạn không thể thực hiện thu tiền hóa đơn.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 text-[10px] font-mono font-extrabold rounded-lg shrink-0">RBAC Enforced</span>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* ── Logout Confirm Modal ── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto">
                <Icon name="logout" className="text-error text-3xl" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">Xác nhận đăng xuất?</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Bạn sắp đăng xuất khỏi tài khoản <strong>{user?.name}</strong>.<br />
                  Mọi thay đổi chưa lưu sẽ bị mất.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-error text-white font-bold text-sm hover:bg-error/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icon name="logout" className="text-[16px]" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
