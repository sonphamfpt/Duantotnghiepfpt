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
  email?: string;
  permissions?: UserPermissions;
  patientProfile?: {
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    criticalAllergy?: string | null;
    medicalCondition?: string | null;
  };
  dentistProfile?: {
    specialty?: string | null;
    degree?: string | null;
    experienceYears?: number | null;
    bio?: string | null;
    motto?: string | null;
  };
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
  updateUserAvatar: (avatarUrl: string) => void;
  refreshUser: () => Promise<void>;
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
  const [lockModal, setLockModal] = useState<{
    visible: boolean;
    countdown: number;
    type: 'deactivated' | 'permission';
    moduleName?: string;
  } | null>(null);

  // Đếm ngược & tự đăng xuất khi modal hiện
  useEffect(() => {
    if (!lockModal?.visible) return;
    if (lockModal.countdown <= 0) {
      logout();
      window.location.href = '/login';
      return;
    }
    const timer = setTimeout(() => {
      setLockModal(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockModal]);

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

          const BACKEND_BASE = 'http://localhost:5000';
          const resolveAvatar = (url?: string) => {
            if (!url) return defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
            if (url.startsWith('http')) return url;
            return `${BACKEND_BASE}${url}`;
          };

          setRole(roleCode);
          setToken(storedToken);
          setUser({
            id: profileId,
            rawUserId: userRes.userId.toString(),
            name: userRes.fullName,
            roleName: defaultProfile?.roleName || roleCode,
            avatar: resolveAvatar(userRes.avatarUrl),
            details: defaultProfile?.details,
            phone: userRes.phone || undefined,
            email: userRes.email || undefined,
            permissions: (userRes as any).permissions || undefined,
            patientProfile: (userRes as any).patientProfile || undefined,
            dentistProfile: (userRes as any).dentistProfile || undefined,
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
          setLockModal({ visible: true, countdown: 5, type: 'deactivated' });
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
          setLockModal({ visible: true, countdown: 5, type: 'permission', moduleName });
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

      const BACKEND_BASE = 'http://localhost:5000';
      const resolveAvatar = (url?: string) => {
        if (!url) return defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
        if (url.startsWith('http')) return url;
        return `${BACKEND_BASE}${url}`;
      };

      localStorage.setItem('goodsmile_token', newToken);
      setToken(newToken);
      setRole(roleCode);
      setUser({
        id: profileId,
        rawUserId: userRes.userId.toString(),
        name: userRes.fullName,
        roleName: defaultProfile?.roleName || roleCode,
        avatar: resolveAvatar(userRes.avatarUrl),
        details: defaultProfile?.details,
        phone: userRes.phone || undefined,
        email: userRes.email || undefined,
        permissions: (userRes as any).permissions || undefined,
        patientProfile: (userRes as any).patientProfile || undefined,
        dentistProfile: (userRes as any).dentistProfile || undefined,
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

  const updateUserAvatar = (avatarUrl: string) => {
    setUser(prev => prev ? { ...prev, avatar: avatarUrl } : prev);
  };

  const refreshUser = async () => {
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
        const BACKEND_BASE = 'http://localhost:5000';
        const resolveAvatar = (url?: string) => {
          if (!url) return defaultProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
          if (url.startsWith('http')) return url;
          return `${BACKEND_BASE}${url}`;
        };
        setUser({
          id: profileId,
          rawUserId: userRes.userId.toString(),
          name: userRes.fullName,
          roleName: defaultProfile?.roleName || roleCode,
          avatar: resolveAvatar(userRes.avatarUrl),
          details: defaultProfile?.details,
          phone: userRes.phone || undefined,
          email: userRes.email || undefined,
          permissions: (userRes as any).permissions || undefined,
          patientProfile: (userRes as any).patientProfile || undefined,
          dentistProfile: (userRes as any).dentistProfile || undefined,
        });
      }
    } catch (e) {
      console.error('Refresh user error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ role, user, token, isAuthenticated, isInitializing, loginWithCredentials, logout, registerPatient, updateUserAvatar, refreshUser }}>
      {children}

      {/* ── Modal Cảnh báo Tài khoản bị Khóa / Quyền bị Thu hồi ── */}
      {lockModal?.visible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            padding: '40px 48px',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(239,68,68,0.4)',
            animation: 'fadeIn 0.3s ease',
          }}>
            {/* Icon cảnh báo */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid #ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span style={{ fontSize: 36 }}>🔒</span>
            </div>

            <h2 style={{ color: '#ef4444', fontSize: 20, fontWeight: 800, marginBottom: 12, letterSpacing: 0.5 }}>
              {lockModal.type === 'deactivated'
                ? 'TÀI KHOẢN BỊ NGƯNG HOẠT ĐỘNG'
                : 'QUYỀN TRUY CẬP BỊ THU HỒI'}
            </h2>

            <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
              {lockModal.type === 'deactivated'
                ? 'Tài khoản của bạn đã bị Quản trị viên phòng khám ngưng hoạt động.'
                : `Quyền truy cập phân hệ "${lockModal.moduleName}" của bạn đã bị thu hồi bởi Quản trị viên.`}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 28 }}>
              Mọi thay đổi dữ liệu đang thực hiện sẽ được lưu lại. Vui lòng liên hệ Quản trị viên để biết thêm thông tin.
            </p>

            {/* Countdown */}
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '16px 24px', marginBottom: 24,
            }}>
              <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Tự động đăng xuất sau</p>
              <p style={{ color: '#ef4444', fontSize: 40, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                {lockModal.countdown}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>giây</p>
            </div>

            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              style={{
                background: '#ef4444', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '12px 32px', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', width: '100%',
              }}
            >
              Đăng xuất ngay
            </button>
          </div>
        </div>
      )}
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
