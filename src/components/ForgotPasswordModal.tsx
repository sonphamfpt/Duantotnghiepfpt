import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { authApi } from '../services/api/authApi';
import { request } from '../services/api/apiClient';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Validate số điện thoại Việt Nam: bắt đầu 0, 10-11 chữ số */
const isValidVNPhone = (phone: string) =>
  /^(0[3|5|7|8|9])[0-9]{8}$|^(0[1-9])[0-9]{9}$/.test(phone);

/** Tính độ mạnh mật khẩu (0-4) */
const getPasswordStrength = (pw: string): number => {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const strengthLabel = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Rất mạnh'];
const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const OTP_LENGTH = 6;
  const COUNTDOWN_SECONDS = 60;

  // Flow Step: 1 = Phone Input, 2 = OTP Verification, 3 = Reset Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI & Loading states
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPhone('');
      setPhoneError('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpToken('');
      setNewPassword('');
      setConfirmPassword('');
      setConfirmError('');
      setError('');
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [isOpen]);

  // Countdown timer for re-sending OTP
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  // Trigger shake animation on error
  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ─── Phone validate real-time ────────────────────────────────────────────
  const handlePhoneChange = (value: string) => {
    // Chỉ cho phép nhập số
    const digits = value.replace(/\D/g, '');
    setPhone(digits);
    setError('');
    if (digits.length > 0 && !isValidVNPhone(digits)) {
      setPhoneError('Số điện thoại Việt Nam phải bắt đầu bằng 0 và có 10 chữ số.');
    } else {
      setPhoneError('');
    }
  };

  // ─── Bước 1: Gửi OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      triggerError('Vui lòng nhập số điện thoại đăng ký tài khoản.');
      return;
    }
    if (!isValidVNPhone(cleanPhone)) {
      triggerError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (bắt đầu bằng 0, 10 chữ số).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authApi.sendForgotPasswordOtp(cleanPhone);
      setStep(2);
      setCountdown(COUNTDOWN_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      console.error('Lỗi khi gửi OTP quên mật khẩu:', err);
      triggerError(err.message || 'Không tìm thấy tài khoản tương ứng với số điện thoại này.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Xử lý nhập ô OTP 6 số ──────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, OTP_LENGTH).split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);

    const nextFocus = Math.min(digits.length, OTP_LENGTH - 1);
    otpRefs.current[nextFocus]?.focus();
  };

  // ─── Bước 2: Xác thực mã OTP ────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      triggerError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số OTP.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanPhone = phone.trim();
      const res = await request<any>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, code, purpose: 'forgot' }),
      });

      const token = res.data?.otpToken;
      if (!token) {
        throw new Error('Mã OTP không đúng hoặc đã hết hạn.');
      }

      setOtpToken(token);
      setStep(3);
    } catch (err: any) {
      console.error('Lỗi khi xác thực OTP:', err);
      triggerError(err.message || 'Mã OTP không chính xác. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Bước 3: Đặt mật khẩu mới ───────────────────────────────────────────
  const pwStrength = getPasswordStrength(newPassword);

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== newPassword) {
      setConfirmError('Mật khẩu xác nhận không khớp.');
    } else {
      setConfirmError('');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate khoảng trắng
    if (newPassword !== newPassword.trim()) {
      triggerError('Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng.');
      return;
    }
    if (newPassword.length < 6) {
      triggerError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanPhone = phone.trim();
      await authApi.resetPassword(cleanPhone, otpToken, newPassword);
      setStep(4);
      if (onSuccess) {
        onSuccess(cleanPhone);
      }
    } catch (err: any) {
      console.error('Lỗi khi đặt lại mật khẩu:', err);
      triggerError(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative transition-all duration-300 ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0a2540] to-[#005eb8] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-secondary-container">
              <Icon
                name={
                  step === 1
                    ? 'lock_reset'
                    : step === 2
                    ? 'mark_email_read'
                    : step === 3
                    ? 'key'
                    : 'check_circle'
                }
                className="text-[24px]"
              />
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold">
                {step === 1 && 'Quên mật khẩu'}
                {step === 2 && 'Xác thực mã OTP'}
                {step === 3 && 'Tạo mật khẩu mới'}
                {step === 4 && 'Thành công!'}
              </h3>
              <p className="text-xs text-slate-200">
                {step === 1 && 'Nhập số điện thoại đăng ký để nhận mã khôi phục'}
                {step === 2 && `Mã xác thực đã gửi tới ${phone}`}
                {step === 3 && 'Nhập mật khẩu mới cho tài khoản của bạn'}
                {step === 4 && 'Mật khẩu đã được cập nhật thành công'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Icon name="error" className="text-red-500 shrink-0 text-[18px]" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Input Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  Số điện thoại đăng ký *
                </label>
                <div className="relative group">
                  <Icon
                    name="call"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]"
                  />
                  <input
                    type="tel"
                    placeholder="09x hoặc 03x... (10 số)"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={11}
                    className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${
                      phoneError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : phone && isValidVNPhone(phone)
                        ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100'
                        : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                    }`}
                    autoFocus
                  />
                  {phone && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValidVNPhone(phone)
                        ? <Icon name="check_circle" className="text-emerald-500 text-[18px]" />
                        : <Icon name="cancel" className="text-red-400 text-[18px]" />}
                    </span>
                  )}
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Icon name="info" className="text-[14px]" />{phoneError}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">Số điện thoại dùng để đăng ký tài khoản GoodSmile.</p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !phone || !isValidVNPhone(phone)}
                className="w-full py-3.5 bg-gradient-to-r from-secondary to-primary text-white font-bold rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Đang gửi mã...</span>
                  </>
                ) : (
                  <>
                    <Icon name="send" className="text-[18px]" />
                    <span>Gửi mã OTP qua SMS</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Input OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2 text-center">
                <label className="block text-xs font-bold text-slate-700">
                  Nhập mã 6 chữ số vừa nhận
                </label>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
                <span>Không nhận được mã?</span>
                {countdown > 0 ? (
                  <span className="text-slate-400">Gửi lại sau ({countdown}s)</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Gửi lại OTP mới
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                >
                  Đổi SĐT
                </button>
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== OTP_LENGTH}
                  className="flex-1 py-3.5 bg-gradient-to-r from-secondary to-primary text-white font-bold rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {isLoading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Mật khẩu mới */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  Mật khẩu mới *
                </label>
                <div className="relative group">
                  <Icon
                    name="lock"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự..."
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                      // Re-check confirm
                      if (confirmPassword && e.target.value !== confirmPassword) {
                        setConfirmError('Mật khẩu xác nhận không khớp.');
                      } else {
                        setConfirmError('');
                      }
                    }}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all shadow-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-[18px] cursor-pointer"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                  </button>
                </div>

                {/* Password Strength Bar */}
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            pwStrength >= lvl ? strengthColor[pwStrength] : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[11px] font-semibold ${
                      pwStrength <= 1 ? 'text-red-500' :
                      pwStrength === 2 ? 'text-orange-500' :
                      pwStrength === 3 ? 'text-yellow-600' : 'text-emerald-600'
                    }`}>
                      Độ mạnh: {strengthLabel[pwStrength]}
                      {pwStrength < 3 && ' — nên thêm chữ hoa, số hoặc ký tự đặc biệt'}
                    </p>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative group">
                  <Icon
                    name="lock_reset"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]"
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => handleConfirmChange(e.target.value)}
                    className={`w-full bg-slate-50/50 border rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all shadow-sm ${
                      confirmError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : confirmPassword && !confirmError
                        ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100'
                        : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-[18px] cursor-pointer"
                  >
                    <Icon name={showConfirm ? 'visibility_off' : 'visibility'} />
                  </button>
                </div>
                {confirmError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Icon name="info" className="text-[14px]" />{confirmError}
                  </p>
                )}
                {confirmPassword && !confirmError && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Icon name="check_circle" className="text-[14px]" />Mật khẩu khớp!
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || !!confirmError || !confirmPassword}
                className="w-full py-3.5 bg-gradient-to-r from-secondary to-primary text-white font-bold rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Đang đặt lại mật khẩu...' : 'Lưu mật khẩu mới'}
              </button>
            </form>
          )}

          {/* Step 4: Success Confirmation */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Icon name="check_circle" className="text-[36px]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Đổi mật khẩu thành công!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mật khẩu mới của bạn đã được lưu vào hệ thống. Bạn có thể đăng nhập ngay bây giờ.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-md cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
