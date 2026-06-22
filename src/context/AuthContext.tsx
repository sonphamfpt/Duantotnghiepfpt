import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'patient' | 'receptionist' | 'dentist' | 'cashier' | 'manager';

interface UserProfile {
  name: string;
  roleName: string;
  avatar: string;
  id?: string;
  details?: string;
}

interface AuthContextType {
  role: UserRole;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  loginWithCredentials: (email: string, password: string) => { success: boolean; role?: UserRole; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PROFILES: Record<UserRole, UserProfile> = {
  patient: {
    id: 'P-8821',
    name: 'Trần Nguyễn Minh',
    roleName: 'Thành viên Platinum',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  },
  receptionist: {
    name: 'Nguyễn Lễ Tân',
    roleName: 'Lễ tân điều phối',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quầy tiếp đón 01 - Ca sáng'
  },
  dentist: {
    id: 'D-04',
    name: 'Bác sĩ Nguyễn Hương',
    roleName: 'Bác sĩ Chỉnh nha Cao cấp',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Phòng khám chuyên khoa 110'
  },
  cashier: {
    name: 'Nguyễn Thu Ngân',
    roleName: 'Thu ngân thanh toán',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quầy thanh toán 02 - Ca sáng'
  },
  manager: {
    name: 'Admin Quản lý',
    roleName: 'Quản trị viên hệ thống',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    details: 'Quyền truy cập: Toàn phần'
  }
};

// Tài khoản demo — mỗi vai trò 1 credential
const DEMO_CREDENTIALS: Record<string, { role: UserRole; password: string }> = {
  'letan@goodsmile.vn':     { role: 'receptionist', password: 'letan123' },
  'bacsi@goodsmile.vn':     { role: 'dentist',      password: 'bacsi123' },
  'thungan@goodsmile.vn':   { role: 'cashier',      password: 'thungan123' },
  'admin@goodsmile.vn':     { role: 'manager',      password: 'admin123' },
  'benhnhan@goodsmile.vn':  { role: 'patient',      password: 'benhnhan123' },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('patient');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (newRole: UserRole) => {
    setRole(newRole);
    setUser(ROLE_PROFILES[newRole]);
    setIsAuthenticated(true);
  };

  const loginWithCredentials = (email: string, password: string): { success: boolean; role?: UserRole; error?: string } => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check admin-created staff accounts in localStorage
    try {
      const staffRaw = localStorage.getItem('goodsmile_staff_accounts');
      const staffAccounts: Array<{ email: string; password: string; role: UserRole; name: string }> = staffRaw ? JSON.parse(staffRaw) : [];
      const staffMatch = staffAccounts.find((s) => s.email.trim().toLowerCase() === normalizedEmail);
      if (staffMatch) {
        if (staffMatch.password !== password) {
          return { success: false, error: 'Mật khẩu không đúng. Vui lòng thử lại.' };
        }
        // Build a dynamic profile for this staff member
        setRole(staffMatch.role);
        setUser({
          name: staffMatch.name,
          roleName: ROLE_PROFILES[staffMatch.role]?.roleName || staffMatch.role,
          avatar: ROLE_PROFILES[staffMatch.role]?.avatar || '',
        });
        setIsAuthenticated(true);
        return { success: true, role: staffMatch.role };
      }
    } catch (_) {
      // ignore localStorage errors
    }

    // 2. Fall back to hardcoded demo credentials
    const cred = DEMO_CREDENTIALS[normalizedEmail];
    if (!cred) {
      return { success: false, error: 'Email không tồn tại trong hệ thống.' };
    }
    if (cred.password !== password) {
      return { success: false, error: 'Mật khẩu không đúng. Vui lòng thử lại.' };
    }
    login(cred.role);
    return { success: true, role: cred.role };
  };

  const logout = () => {
    setRole('patient');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ role, user, isAuthenticated, login, loginWithCredentials, logout }}>
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
export { ROLE_PROFILES };
