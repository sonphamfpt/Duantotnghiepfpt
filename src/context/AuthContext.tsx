import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '../services/api/authApi';
import { socket } from '../services/socketClient';

export type UserRole = 'patient' | 'receptionist' | 'dentist' | 'cashier' | 'manager';

export interface UserPermissions {
  admission: boolean;
  clinical: boolean;
  checkout: boolean;
  settings: boolean;
}

interface UserProfile {
  name: string;
  roleName: string;
  avatar: string;
  id?: string;
  rawUserId?: string;
  details?: string;
  phone?: string;
  permissions?: UserPermissions;
}

interface AuthContextType {
  role: UserRole;
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loginWithCredentials: (phone: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  registerPatient: (data: { fullName: string; phone: string; dateOfBirth: string; gender: string; password: string; otpToken: string; address?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapping role → hiển thị tên chức danh và avatar mặc định
const ROLE_PROFILES: Record<UserRole, Omit<UserProfile, 'id' | 'name' | 'phone'>> = {
  patient: {
    roleName: 'Bệnh nhân',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  },
  receptionist: {
    roleName: 'Lễ tân điều phối',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quầy tiếp đón 01 - Ca sáng',
  },
  dentist: {
    roleName: 'Bác sĩ Nha khoa',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Phòng khám chuyên khoa',
  },
  cashier: {
    roleName: 'Thu ngân thanh toán',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quầy thanh toán - Ca sáng',
  },
  manager: {
    roleName: 'Quản trị viên hệ thống',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quyền truy cập: Toàn phần',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('patient');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Khôi phục phiên đăng nhập khi load trang từ localStorage token
  React.useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('goodsmile_token');
      if (!storedToken) {
        setIsInitializing(false);
        return;
      }

      setToken(storedToken);

      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const userRes = response.data;
          const roleCode = (typeof userRes.role === 'object' ? userRes.role.code : userRes.role) as UserRole;

          const defaultProfile = ROLE_PROFILES[roleCode];
          let profileId = userRes.userId;

          if (roleCode === 'dentist' && userRes.dentistId) {
            profileId = `D-${userRes.dentistId.toString().padStart(2, '0')}`;
          } else if (roleCode === 'patient' && userRes.patientId) {
            profileId = `P-${userRes.patientId.toString()}`;
          }

          setRole(roleCode);
          setToken(storedToken);
          setUser({
            id: profileId,
            rawUserId: userRes.userId.toString(),
            name: userRes.fullName,
            roleName: defaultProfile?.roleName || roleCode,
            avatar: defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
            details: defaultProfile?.details,
            phone: userRes.phone || undefined,
            permissions: (userRes as any).permissions || undefined,
          });
          setIsAuthenticated(true);
        } else {
          // Token không hợp lệ → xóa đi
          localStorage.removeItem('goodsmile_token');
          setToken(null);
        }
      } catch (err) {
        console.error('Lỗi khi khôi phục phiên đăng nhập:', err);
        localStorage.removeItem('goodsmile_token');
        setToken(null);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  // ─── Real-Time Kickout & Permission Listener ────────────────────────────────
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleStatusChanged = (data: { userId: string; status: string }) => {
      if (user && user.rawUserId && String(user.rawUserId) === String(data.userId)) {
        if (data.status === 'Inactive') {
          alert('⚠️ THÔNG BÁO TỪ HỆ THỐNG:\nTài khoản của bạn đã bị NGƯNG HOẠT ĐỘNG bởi Quản trị viên phòng khám.\nBạn sẽ được tự động đăng xuất khỏi hệ thống ngay lập tức.');
          logout();
          window.location.href = '/login';
        }
      }
    };

    const handlePermissionChanged = (data: { userId: string; permissions: UserPermissions }) => {
      if (user && user.rawUserId && String(user.rawUserId) === String(data.userId)) {
        console.log('⚡ [Real-time RBAC] Phân quyền tài khoản đã thay đổi:', data.permissions);
        setUser((prev) => (prev ? { ...prev, permissions: data.permissions } : prev));

        // Kiểm tra xem vai trò chuyên môn hiện tại có bị tước quyền chính không
        const currentRole = role;
        const p = data.permissions;
        let isRevoked = false;
        let moduleName = '';

        if (currentRole === 'receptionist' && !p.admission) {
          isRevoked = true;
          moduleName = 'Đón tiếp (Lễ tân)';
        } else if (currentRole === 'dentist' && !p.clinical) {
          isRevoked = true;
          moduleName = 'Khám lâm sàng (Bác sĩ)';
        } else if (currentRole === 'cashier' && !p.checkout) {
          isRevoked = true;
          moduleName = 'Tính tiền (Thu ngân)';
        } else if (currentRole === 'manager' && !p.settings) {
          isRevoked = true;
          moduleName = 'Cấu hình hệ thống (Quản lý)';
        }

        if (isRevoked) {
          alert(`⚠️ THÔNG BÁO TỪ HỆ THỐNG:\nQuyền truy cập phân hệ ${moduleName} của bạn đã bị Quản trị viên thu hồi.\nBạn sẽ được tự động đăng xuất khỏi hệ thống ngay lập tức.`);
          logout();
          window.location.href = '/login';
        }
      }
    };

    socket.on('staff:status_changed', handleStatusChanged);
    socket.on('staff:permission_changed', handlePermissionChanged);
    return () => {
      socket.off('staff:status_changed', handleStatusChanged);
      socket.off('staff:permission_changed', handlePermissionChanged);
    };
  }, [user]);

  const loginWithCredentials = async (phone: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const response = await authApi.login(phone, password);

      if (!response.success || !response.data) {
        return { success: false, error: response.message || 'Đăng nhập thất bại.' };
      }

      const { token: newToken, user: userRes } = response.data;
      const roleCode = (typeof userRes.role === 'object' ? userRes.role.code : userRes.role) as UserRole;
      const defaultProfile = ROLE_PROFILES[roleCode];

      let profileId = userRes.userId;
      if (roleCode === 'dentist' && userRes.dentistId) {
        profileId = `D-${userRes.dentistId.toString().padStart(2, '0')}`;
      } else if (roleCode === 'patient' && userRes.patientId) {
        profileId = `P-${userRes.patientId.toString()}`;
      }

      localStorage.setItem('goodsmile_token', newToken);
      setToken(newToken);
      setRole(roleCode);
      setUser({
        id: profileId,
        rawUserId: userRes.userId.toString(),
        name: userRes.fullName,
        roleName: defaultProfile?.roleName || roleCode,
        avatar: defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        details: defaultProfile?.details,
        phone: userRes.phone || undefined,
        permissions: (userRes as any).permissions || undefined,
      });
      setIsAuthenticated(true);

      return { success: true, role: roleCode };

    } catch (err: any) {
      console.error('Lỗi khi đăng nhập API:', err);
      return { success: false, error: err.message || 'Không thể kết nối đến máy chủ API.' };
    }
  };

  const registerPatient = async (data: { fullName: string; phone: string; dateOfBirth: string; gender: string; password: string; otpToken: string; address?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.register(data.fullName, data.phone, data.password, data.otpToken, data.dateOfBirth, data.gender, data.address);

      if (!response.success) {
        return { success: false, error: response.message || 'Đăng ký tài khoản thất bại.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Lỗi đăng ký API:', err);
      return { success: false, error: err.message || 'Không thể kết nối đến máy chủ API.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('goodsmile_token');
    setToken(null);
    setRole('patient');
    setUser(null);
    setIsAuthenticated(false);

  };

  return (
    <AuthContext.Provider value={{ role, user, token, isAuthenticated, isInitializing, loginWithCredentials, logout, registerPatient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export ROLE_PROFILES để các component khác dùng nếu cần
export { ROLE_PROFILES };
