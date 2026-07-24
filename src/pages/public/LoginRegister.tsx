import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { BrandLogo } from '../../components/BrandLogo';
import { OtpVerificationModal } from '../../components/OtpVerificationModal';
import { ForgotPasswordModal } from '../../components/ForgotPasswordModal';
import { clinicApi } from '../../services/api/clinicApi';

const DEMO_ACCOUNTS = [
  { phone: '0909000002', password: '12345678', role: 'receptionist' as UserRole, label: 'Lễ Tân',    icon: 'folder_shared',       color: 'hover:border-orange-500 hover:bg-orange-50/50 text-orange-700 bg-orange-50/30 border-orange-100 hover:shadow-orange-100/50' },
  { phone: '0909000014', password: '12345678', role: 'dentist'      as UserRole, label: 'BS. N. Hương', icon: 'dentistry',           color: 'hover:border-blue-500 hover:bg-blue-50/50 text-blue-700 bg-blue-50/30 border-blue-100 hover:shadow-blue-100/50' },
  { phone: '0909000011', password: '12345678', role: 'dentist'      as UserRole, label: 'BS. Lê Minh',  icon: 'dentistry',           color: 'hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-700 bg-indigo-50/30 border-indigo-100 hover:shadow-indigo-100/50' },
  { phone: '0909000013', password: '12345678', role: 'dentist'      as UserRole, label: 'BS. H. Nam',   icon: 'dentistry',           color: 'hover:border-cyan-500 hover:bg-cyan-50/50 text-cyan-700 bg-cyan-50/30 border-cyan-100 hover:shadow-cyan-100/50' },
  { phone: '0909000003', password: '12345678', role: 'cashier'      as UserRole, roleLabel: 'Thu Ngân', label: 'Thu Ngân',  icon: 'payments',            color: 'hover:border-amber-500 hover:bg-amber-50/50 text-amber-700 bg-amber-50/30 border-amber-100 hover:shadow-amber-100/50' },
  { phone: '0909000001', password: '12345678', role: 'manager'      as UserRole, label: 'Quản Lý',  icon: 'admin_panel_settings', color: 'hover:border-purple-500 hover:bg-purple-50/50 text-purple-700 bg-purple-50/30 border-purple-100 hover:shadow-purple-100/50' },
  { phone: '0901234567', password: '12345678', role: 'patient'      as UserRole, label: 'Bệnh Nhân', icon: 'person',              color: 'hover:border-green-500 hover:bg-green-50/50 text-green-700 bg-green-50/30 border-green-100 hover:shadow-green-100/50' },
];

export const LoginRegister: React.FC = () => {
  const { loginWithCredentials, registerPatient } = useAuth();
  const navigate = useNavigate();

  // Tab control
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('Nam');
  const [regBirthDate, setRegBirthDate] = useState('2000-01-01');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showRegisterOtpModal, setShowRegisterOtpModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [regConfirmError, setRegConfirmError] = useState('');
  
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Field-level errors (hiển thị ngay dưới từng trường)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (field: string) => setFieldErrors(prev => ({ ...prev, [field]: '' }));

  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Navigation redirect helper
  const redirectAfterLogin = (role: UserRole) => {
    if (role === 'patient') navigate('/patient');
    else navigate(`/dashboard/${role}`);
  };

  // Auto-fill form from Demo Account Grid (using Phone Number)
  const handleFillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIsLoginTab(true);
    setEmail(acc.phone);
    setPassword(acc.password);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Tra cứu số điện thoại bệnh nhân để tự động điền (autofill)
  const handlePhoneChange = async (val: string) => {
    setRegPhone(val);
    setIsAutoFilled(false);
    setPhoneError('');
    // Reset các trường auto-fill khi SĐT thay đổi
    setRegName('');
    setRegGender('Nam');
    setRegBirthDate('2000-01-01');
    setRegAddress('');

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);

    const phone = val.trim().replace(/[\s-]/g, '');
    if (phone.length < 10) return;

    setPhoneLookupLoading(true);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await clinicApi.lookupPatientByPhone(phone);
        setPhoneLookupLoading(false);
        if (res.success && res.data?.found) {
          const d = res.data;

          if (d.hasAccount) {
            // TH1: SĐT đã có tài khoản → cảnh báo ngay tại field, KHÔNG auto-fill
            setPhoneError('Số điện thoại này đã có tài khoản. Vui lòng chuyển sang tab Đăng nhập.');
            setIsAutoFilled(false);
          } else {
            // TH2: Có hồ sơ bệnh nhân nhưng chưa có tài khoản → auto-fill thông tin
            // (Lễ tân hoặc bác sĩ đã nhập hồ sơ trước đó)
            if (d.fullName) setRegName(d.fullName);
            if (d.gender) setRegGender(d.gender);
            if (d.dateOfBirth) setRegBirthDate(d.dateOfBirth);
            if (d.address) setRegAddress(d.address);
            setIsAutoFilled(true);
            setPhoneError('');
          }
        }
        // TH3: SĐT hoàn toàn mới (found = false) → để trống, không làm gì thêm
      } catch (err) {
        setPhoneLookupLoading(false);
      }
    }, 600);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const isValidVNPhone = (p: string) => /^(0[3|5|7|8|9])[0-9]{8}$|^(0[1-9])[0-9]{9}$/.test(p);
  const getPasswordStrength = (pw: string): number => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Rất mạnh'];
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
  const regPwStrength = getPasswordStrength(regPassword);

  // ─── Validate Form ────────────────────────────────────────────────────────
  const validateForm = () => {
    if (isLoginTab) {
      if (!email.trim()) {
        setErrorMsg('Vui lòng nhập Email hoặc Số điện thoại.');
        return false;
      }
      if (email.trim().length < 3) {
        setErrorMsg('Tài khoản quá ngắn, vui lòng kiểm tra lại.');
        return false;
      }
      if (!password) {
        setErrorMsg('Vui lòng nhập mật khẩu.');
        return false;
      }
      if (password.length < 6) {
        setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
        return false;
      }
    } else {
      const errs: Record<string, string> = {};

      // SĐT
      const cleanPhone = regPhone.trim();
      if (!cleanPhone) {
        errs.phone = 'Vui lòng nhập số điện thoại.';
      } else if (phoneError) {
        errs.phone = phoneError;
      } else if (!isValidVNPhone(cleanPhone)) {
        errs.phone = 'Số điện thoại Việt Nam không hợp lệ (VD: 0987654321).';
      }

      // Họ tên
      const cleanName = regName.trim();
      if (!cleanName) {
        errs.name = 'Vui lòng nhập họ và tên.';
      } else if (cleanName.length < 2) {
        errs.name = 'Họ tên phải có ít nhất 2 ký tự.';
      } else if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanName)) {
        errs.name = 'Họ tên không được chứa số hoặc ký tự đặc biệt.';
      }

      // Ngày sinh
      if (!regBirthDate) {
        errs.birthDate = 'Vui lòng chọn ngày sinh.';
      } else {
        const birthDateObj = new Date(regBirthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDateObj.getFullYear();
        if (birthDateObj > today) {
          errs.birthDate = 'Ngày sinh không được ở tương lai.';
        } else if (birthDateObj.getFullYear() < 1900) {
          errs.birthDate = 'Năm sinh tối thiểu từ năm 1900.';
        } else if (age < 1) {
          errs.birthDate = 'Tuổi phải từ 1 trở lên.';
        } else if (age > 120) {
          errs.birthDate = 'Ngày sinh không hợp lệ.';
        }
      }

      // Địa chỉ
      if (!regAddress.trim()) {
        errs.address = 'Vui lòng nhập địa chỉ liên hệ.';
      }

      // Mật khẩu
      if (!regPassword) {
        errs.password = 'Vui lòng nhập mật khẩu.';
      } else if (regPassword.length < 6) {
        errs.password = 'Mật khẩu phải chứa ít nhất 6 ký tự.';
      } else if (regPassword !== regPassword.trim()) {
        errs.password = 'Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng.';
      }

      // Xác nhận mật khẩu
      if (!regConfirmPassword) {
        errs.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
      } else if (regPassword && regPassword !== regConfirmPassword) {
        errs.confirmPassword = 'Mật khẩu xác nhận không khớp.';
      }

      if (Object.values(errs).some(v => v)) {
        setFieldErrors(errs);
        return false;
      }
      setFieldErrors({});
    }
    return true;
  };

  const completeRegistration = async (otpToken: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const result = await registerPatient({
      fullName: regName.trim(),
      phone: regPhone.trim(),
      dateOfBirth: regBirthDate,
      gender: regGender,
      password: regPassword,
      otpToken,
      address: regAddress.trim() || undefined,
    });

    setIsLoading(false);
    setShowRegisterOtpModal(false);

    if (result.success) {
      setSuccessMsg('Đăng ký tài khoản thành công! Bạn đang được chuyển về trang Đăng nhập...');

      setTimeout(() => {
        setIsLoginTab(true);
        setEmail(regPhone.trim()); // Đăng nhập mặc định bằng SĐT
        setPassword(regPassword);
        setSuccessMsg('');
        setRegName('');
        setRegPhone('');
        setRegGender('Nam');
        setRegBirthDate('2000-01-01');
        setRegAddress('');
        setRegPassword('');
        setRegConfirmPassword('');
        setIsAutoFilled(false);
      }, 1500);
    } else {
      setErrorMsg(result.error || 'Đăng ký tài khoản thất bại.');
    }
  };

  // Submit handler (Handling both login and registration)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    if (isLoginTab) {
      const result = await loginWithCredentials(email, password);
      setIsLoading(false);

      if (result.success && result.role) {
        redirectAfterLogin(result.role);
      } else {
        setErrorMsg(result.error || 'Đăng nhập thất bại.');
      }
      return;
    }

    setIsLoading(false);
    setShowRegisterOtpModal(true);
  };
  return (
    <>
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden font-body-md select-none">
      {/* Custom premium style definitions */}
      <style>{`
        @keyframes mesh-move-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -80px) scale(1.25); }
        }
        @keyframes mesh-move-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-70px, 50px) scale(1.15); }
        }
        .mesh-glow-1 {
          animation: mesh-move-1 16s ease-in-out infinite;
        }
        .mesh-glow-2 {
          animation: mesh-move-2 20s ease-in-out infinite;
        }
        .bg-grid-pattern {
          background-size: 24px 24px;
          background-image: radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px);
        }
        .btn-shine {
          position: relative;
          overflow: hidden;
        }
        .btn-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: rgba(255, 255, 255, 0.25);
          transform: rotate(30deg);
          transition: none;
        }
        .btn-shine:hover::after {
          left: 120%;
          transition: all 0.7s ease-in-out;
        }
        
        /* Custom scrollbar for right panel on desktop */
        @media (min-width: 1024px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        }
      `}</style>
        
      {/* ── Left: Branding / Showcase Column (Hidden on mobile/tablet) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative bg-slate-950 overflow-hidden flex-col justify-between p-12 text-white h-full shrink-0">
        
        {/* Base Dark/Glow Gradients */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950"></div>
        
        {/* Dynamic Mesh Blur Glows */}
        <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-primary/20 rounded-full blur-[110px] pointer-events-none mesh-glow-1"></div>
        <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[110px] pointer-events-none mesh-glow-2"></div>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent z-0"></div>

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2">
            <BrandLogo size="md" variant="white" showText={true} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-blue-300 bg-blue-500/15 px-3 py-1.5 rounded-full border border-blue-400/20 shadow-inner">
            SYSTEM v4.5
          </span>
        </div>

        {/* Center Showcase Content */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="space-y-4">
            <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              Nền tảng nha khoa kỹ thuật số hiện đại
            </p>
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Quản lý toàn diện phòng khám thông minh
            </h1>
            <p className="text-slate-400 text-base leading-relaxed font-medium">
              Tối ưu hóa quy trình khám chữa bệnh, đồng bộ hồ sơ bệnh án thời gian thực, quản lý thu chi và nâng cao trải nghiệm khách hàng chỉ trên một giao diện duy nhất.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
              <p className="text-2xl font-black text-white">10K+</p>
              <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-wider mt-1">Bệnh nhân</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
              <p className="text-2xl font-black text-emerald-400">99.8%</p>
              <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-wider mt-1">Hài lòng</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
              <p className="text-2xl font-black text-blue-400">24/7</p>
              <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-wider mt-1">AI Hỗ trợ</p>
            </div>
          </div>

          {/* Showcase Features list */}
          <div className="space-y-3 pt-2">
            {[
              { icon: 'event_available', text: 'Đặt lịch trực tuyến & Sắp xếp hàng chờ thông minh' },
              { icon: 'medical_services', text: 'Bệnh án điện tử EMR đồng bộ hồ sơ bệnh lý' },
              { icon: 'analytics', text: 'Phân tích doanh thu & Quản lý sổ quỹ tự động' }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 border border-white/5 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors duration-200">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-400/20">
                  <Icon name={f.icon} className="text-[18px] text-blue-400" />
                </div>
                <span className="font-semibold text-slate-200">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex justify-between items-center text-xs text-slate-500 border-t border-white/10 pt-5">
          <p>© 2026 GoodSmile Clinic. Bảo mật tiêu chuẩn HIPAA.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors font-medium">Điều khoản</a>
            <a href="#" className="hover:text-slate-300 transition-colors font-medium">Liên hệ</a>
          </div>
        </div>
      </div>

      {/* ── Right: Authentication Panels (Centered on Mobile & Desktop) ── */}
      <div className="flex-1 bg-slate-50 bg-grid-pattern flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative overflow-y-auto h-auto lg:h-full custom-scrollbar">

        {/* Back to Home button */}
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-slate-600 text-sm font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 hover:shadow-md transition-all duration-200 cursor-pointer shadow-sm"
          >
            <Icon name="arrow_back" className="text-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
            Trang chủ
          </button>
        </div>

        {/* Mobile Logo display */}
        <div className="lg:hidden flex justify-center mb-6">
          <div className="bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-xl shadow-slate-100 flex items-center gap-2">
            <BrandLogo size="md" variant="dark" showText={true} />
          </div>
        </div>

        <div className="max-w-[480px] w-full mx-auto my-auto space-y-6">
          
          {/* Header section */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLoginTab ? 'Chào mừng trở lại!' : 'Đăng ký tài khoản'}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {isLoginTab 
                ? 'Vui lòng đăng nhập để truy cập hệ thống phòng khám.' 
                : 'Đăng ký tài khoản bệnh nhân để quản lý hồ sơ khám của bạn.'}
            </p>
          </div>

          {/* Glassmorphic Form Card Container */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 relative">
            
            {/* Tab Switcher with sliding indicator */}
            <div className="relative flex bg-slate-100/80 p-1.5 rounded-2xl mb-6">
              <div 
                className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white shadow-md transition-all duration-300 ease-out pointer-events-none"
                style={{
                  width: 'calc(50% - 3px)',
                  transform: isLoginTab ? 'translateX(0)' : 'translateX(100%)'
                }}
              />
              <button
                type="button"
                onClick={() => { setIsLoginTab(true); setErrorMsg(''); setSuccessMsg(''); }}
                className={`relative z-10 flex-1 py-2.5 text-center text-xs sm:text-sm font-black transition-colors duration-300 cursor-pointer ${
                  isLoginTab ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ĐĂNG NHẬP
              </button>
              <button
                type="button"
                onClick={() => { setIsLoginTab(false); setErrorMsg(''); setSuccessMsg(''); }}
                className={`relative z-10 flex-1 py-2.5 text-center text-xs sm:text-sm font-black transition-colors duration-300 cursor-pointer ${
                  !isLoginTab ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ĐĂNG KÝ
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Form fields: Login tab */}
              {isLoginTab ? (
                <>
                  {/* Login Email */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Tài khoản (Email hoặc SĐT)
                    </label>
                    <div className="relative group">
                      <Icon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]" />
                      <input
                        type="text"
                        placeholder="name@example.com hoặc số điện thoại..."
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Login Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                        Mật khẩu
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(true)}
                        className="text-[11px] text-primary font-black hover:underline transition-all cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative group">
                      <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-[18px] cursor-pointer"
                      >
                        <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="rounded-lg border-slate-300 text-primary focus:ring-primary/30 w-4 h-4 cursor-pointer" 
                      />
                      Ghi nhớ đăng nhập
                    </label>
                  </div>
                </>
              ) : (
                <>
                  {/* Register Phone (First for auto-lookup) */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Số điện thoại *
                    </label>
                    <div className="relative group">
                      <Icon
                        name="call"
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${
                          phoneError ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'
                        }`}
                      />
                      <input
                        type="tel"
                        placeholder="Nhập SĐT để tra cứu nhanh..."
                        value={regPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${
                          phoneError
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/30'
                            : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                        }`}
                      />
                      {phoneLookupLoading && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400 animate-spin">⏳</span>
                      )}
                      {!phoneLookupLoading && isAutoFilled && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 text-[18px]">✓</span>
                      )}
                    </div>

                    {/* Phone error — SĐT đã có tài khoản */}
                    {phoneError && (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2 animate-in slide-in-from-top-1">
                        <div className="flex items-center gap-1.5">
                          <Icon name="error" className="text-red-500 text-[15px] shrink-0" />
                          <p className="text-[11px] font-semibold text-red-700">{phoneError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setIsLoginTab(true); setEmail(regPhone); setErrorMsg(''); setPhoneError(''); }}
                          className="ml-2 shrink-0 inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <Icon name="login" className="text-[12px]" />
                          Đăng nhập ngay
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Auto-filled status banner — chỉ hiện khi có hồ sơ nhưng chưa có tài khoản */}
                  {isAutoFilled && !phoneError && (
                    <div className="flex items-start gap-2 text-emerald-800 text-[11px] bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 animate-in slide-in-from-top-1">
                      <Icon name="person_check" className="text-[16px] shrink-0 mt-0.5 text-emerald-600" />
                      <span className="font-bold leading-normal">
                        ✅ Tìm thấy hồ sơ bệnh nhân! Hệ thống đã tự điền thông tin từ CSDL. Hãy đặt mật khẩu để kích hoạt tài khoản.
                      </span>
                    </div>
                  )}

                  {/* Register Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Họ và tên
                    </label>
                    <div className="relative group">
                      <Icon name="person" className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${fieldErrors.name ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={regName}
                        onChange={(e) => { setRegName(e.target.value); clearFieldError('name'); }}
                        className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${fieldErrors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/20' : 'border-slate-200 focus:border-primary focus:ring-primary/10'}`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1">
                        <Icon name="error" className="text-[13px] shrink-0" />{fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Register Birth Date & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Birth Date */}
                    <div className="space-y-1.5">
                      <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                        Ngày sinh *
                      </label>
                      <div className="relative group">
                        <Icon name="calendar_month" className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${fieldErrors.birthDate ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
                        <input
                          type="date"
                          min="1900-01-01"
                          max={new Date().toISOString().split('T')[0]}
                          value={regBirthDate}
                          onChange={(e) => { setRegBirthDate(e.target.value); clearFieldError('birthDate'); }}
                          className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm cursor-pointer ${fieldErrors.birthDate ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/20' : 'border-slate-200 focus:border-primary focus:ring-primary/10'}`}
                        />
                      </div>
                      {fieldErrors.birthDate && (
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1">
                          <Icon name="error" className="text-[13px] shrink-0" />{fieldErrors.birthDate}
                        </p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                        Giới tính *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 h-[46px] items-center">
                        {[
                          { value: 'Nam', icon: 'male', label: 'Nam' },
                          { value: 'Nữ', icon: 'female', label: 'Nữ' },
                          { value: 'Khác', icon: 'wc', label: 'Khác' },
                        ].map((g) => {
                          const isSelected = regGender === g.value;
                          return (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => { setRegGender(g.value); setErrorMsg(''); }}
                              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.03]'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                              }`}
                            >
                              <Icon name={g.icon} className={`text-[15px] ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                              <span>{g.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Register Address */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Địa chỉ liên hệ
                    </label>
                    <div className="relative group">
                      <Icon name="home" className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${fieldErrors.address ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
                      <input
                        type="text"
                        placeholder="Số nhà, đường, phường, quận, thành phố..."
                        value={regAddress}
                        onChange={(e) => { setRegAddress(e.target.value); clearFieldError('address'); }}
                        className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${fieldErrors.address ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/20' : 'border-slate-200 focus:border-primary focus:ring-primary/10'}`}
                      />
                    </div>
                    {fieldErrors.address && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1">
                        <Icon name="error" className="text-[13px] shrink-0" />{fieldErrors.address}
                      </p>
                    )}
                  </div>

                  {/* Register Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <div className="relative group">
                      <Icon name="lock" className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${fieldErrors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Tối thiểu 6 ký tự..."
                        value={regPassword}
                        maxLength={64}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          clearFieldError('password');
                          clearFieldError('confirmPassword');
                          // Re-check confirm real-time
                          if (regConfirmPassword && e.target.value !== regConfirmPassword) {
                            setRegConfirmError('Mật khẩu xác nhận không khớp.');
                          } else {
                            setRegConfirmError('');
                          }
                        }}
                        className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${fieldErrors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/20' : 'border-slate-200 focus:border-primary focus:ring-primary/10'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-[18px] cursor-pointer"
                      >
                        <Icon name={showRegPassword ? 'visibility_off' : 'visibility'} />
                      </button>
                    </div>

                    {/* Password Strength Bar */}
                    {regPassword.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${regPwStrength >= lvl ? strengthColor[regPwStrength] : 'bg-slate-200'}`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10.5px] font-semibold ${regPwStrength <= 1 ? 'text-red-500' : regPwStrength === 2 ? 'text-orange-500' : regPwStrength === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          Độ mạnh: {strengthLabel[regPwStrength]}
                          {regPwStrength < 3 && ' — nên thêm chữ hoa, số hoặc ký tự đặc biệt'}
                        </p>
                      </div>
                    )}

                    {fieldErrors.password && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1">
                        <Icon name="error" className="text-[13px] shrink-0" />{fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                      Xác nhận mật khẩu *
                    </label>
                    <div className="relative group">
                      <Icon name="lock_reset" className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[18px] ${(fieldErrors.confirmPassword || regConfirmError) ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary'}`} />
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu..."
                        value={regConfirmPassword}
                        maxLength={64}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          clearFieldError('confirmPassword');
                          if (e.target.value && e.target.value !== regPassword) {
                            setRegConfirmError('Mật khẩu xác nhận không khớp.');
                          } else {
                            setRegConfirmError('');
                          }
                        }}
                        className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${
                          (fieldErrors.confirmPassword || regConfirmError)
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/20'
                            : regConfirmPassword && !regConfirmError
                            ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100'
                            : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-[18px] cursor-pointer"
                      >
                        <Icon name={showRegConfirmPassword ? 'visibility_off' : 'visibility'} />
                      </button>
                    </div>
                    {(fieldErrors.confirmPassword || regConfirmError) && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-1">
                        <Icon name="error" className="text-[13px] shrink-0" />{fieldErrors.confirmPassword || regConfirmError}
                      </p>
                    )}
                    {regConfirmPassword && !regConfirmError && !fieldErrors.confirmPassword && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                        <Icon name="check_circle" className="text-[13px] shrink-0" />Mật khẩu khớp!
                      </p>
                    )}
                  </div>

                </>
              )}

              {/* Error Banner — chỉ hiển thị lỗi API server (đăng nhập sai, lỗi mạng...) */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 text-red-700 text-xs bg-red-50 border border-red-100 rounded-2xl p-3.5 animate-in fade-in duration-200">
                  <Icon name="error" className="text-[18px] shrink-0 mt-0.5" />
                  <span className="font-bold leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="flex items-start gap-2.5 text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 animate-in fade-in duration-200">
                  <Icon name="check_circle" className="text-[18px] shrink-0 mt-0.5" />
                  <span className="font-bold leading-relaxed">{successMsg}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-primary text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-primary/25 hover:bg-primary/95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed btn-shine"
              >
                {isLoading ? (
                  <>
                    <Icon name="progress_activity" className="text-[18px] animate-spin" />
                    {isLoginTab ? 'Đang xác minh thông tin...' : 'Đang thiết lập tài khoản...'}
                  </>
                ) : (
                  isLoginTab ? 'ĐĂNG NHẬP NGAY' : 'TẠO TÀI KHOẢN MỚI'
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo System Access Section */}
          <div className="bg-white/60 backdrop-blur-xl border border-slate-100/50 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Tài khoản dùng thử
              </span>
              <span className="text-[9px] text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-lg font-black tracking-wider">
                DEMO PORTAL
              </span>
            </div>

            {/* Demo Account Grid cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleFillDemo(acc)}
                  className={`border text-[10.5px] font-black p-2.5 rounded-2xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-sm text-center ${acc.color}`}
                  title={`SĐT: ${acc.phone}\nMật khẩu: ${acc.password}`}
                >
                  <Icon name={acc.icon} className="text-[20px]" />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-slate-400 text-center font-semibold italic">
              * Click chọn thẻ nhân sự ở trên để điền tự động dữ liệu thử nghiệm.
            </p>

            {/* Hint text về mật khẩu chung demo */}
            <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400 border-t border-slate-100 pt-3">
              <Icon name="info" className="text-[12px] text-slate-300" />
              <span>Mật khẩu tất cả tài khoản demo: <strong className="text-slate-500">12345678</strong></span>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="text-center text-[10px] text-slate-400 mt-6 pt-4 border-t border-slate-100">
          © 2026 GoodSmile Clinic. Bảo mật chuẩn HIPAA.
        </div>
      </div>
      
    </div>
    <OtpVerificationModal
      isOpen={showRegisterOtpModal}
      onClose={() => setShowRegisterOtpModal(false)}
      onVerified={completeRegistration}
      phoneNumber={regPhone.trim()}
    />
    <ForgotPasswordModal
      isOpen={showForgotPasswordModal}
      onClose={() => setShowForgotPasswordModal(false)}
      onSuccess={(resetPhone) => {
        setIsLoginTab(true);
        setEmail(resetPhone);
        setSuccessMsg('Đặt lại mật khẩu thành công. Vui lòng nhập mật khẩu mới để đăng nhập.');
      }}
    />
    </>
  );
};
