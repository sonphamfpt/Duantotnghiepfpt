import React, { createContext, useContext, useState, ReactNode } from 'react';
import { authApi } from '../services/api/authApi';

export type UserRole = 'patient' | 'receptionist' | 'dentist' | 'cashier' | 'manager';

interface UserProfile {
  name: string;
  roleName: string;
  avatar: string;
  id?: string;
  details?: string;
  phone?: string;
}

interface AuthContextType {
  role: UserRole;
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  registerPatient: (data: { fullName: string; phone: string; email?: string; password: string }) => Promise<{ success: boolean; error?: string }>;
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

  // Khôi phục phiên đăng nhập khi load trang từ localStorage token
  React.useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('goodsmile_token');
      if (!storedToken) return;

      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const userRes = response.data.user;
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
            name: userRes.fullName,
            roleName: defaultProfile?.roleName || roleCode,
            avatar: defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
            details: defaultProfile?.details,
            phone: userRes.phone || undefined,
          });
          setIsAuthenticated(true);
        } else {
          // Token không hợp lệ → xóa đi
          localStorage.removeItem('goodsmile_token');
        }
      } catch (err) {
        console.error('Lỗi khi khôi phục phiên đăng nhập:', err);
      }
    };

    checkAuth();
  }, []);

  const loginWithCredentials = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const response = await authApi.login(email, password);

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
        name: userRes.fullName,
        roleName: defaultProfile?.roleName || roleCode,
        avatar: defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        details: defaultProfile?.details,
        phone: userRes.phone || undefined,
      });
      setIsAuthenticated(true);

      return { success: true, role: roleCode };

    } catch (err: any) {
      console.error('Lỗi khi đăng nhập API:', err);
      return { success: false, error: err.message || 'Không thể kết nối đến máy chủ API.' };
    }
  };

  const registerPatient = async (data: { fullName: string; phone: string; email?: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.register(data.fullName, data.phone, data.password);

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
    <AuthContext.Provider value={{ role, user, token, isAuthenticated, loginWithCredentials, logout, registerPatient }}>
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
