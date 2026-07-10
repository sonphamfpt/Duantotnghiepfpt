import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './Icon';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (otpToken: string) => void;
  phoneNumber: string;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  phoneNumber,
}) => {
  const OTP_LENGTH = 6;
  const COUNTDOWN_SECONDS = 60;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SECONDS = 120;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset fields on open
  const resetOtpState = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
  }, []);

  // Init OTP on open
  useEffect(() => {
    if (isOpen) {
      resetOtpState();
      setAttempts(0);
      setIsLocked(false);
      setLockoutCountdown(0);
      setIsVerified(false);
      setShake(false);
      // Focus first input after a tick
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, resetOtpState]);

  // Countdown for resend
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked || lockoutCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockoutCountdown((p) => {
        if (p <= 1) {
          setIsLocked(false);
          setAttempts(0);
          setError('');
          resetOtpState();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked, lockoutCountdown, resetOtpState]);

  if (!isOpen) return null;

  // Mask phone: 0901 234 567 => 0901 *** 567
  const maskedPhone = phoneNumber.length >= 4
    ? phoneNumber.slice(0, 4) + ' *** ' + phoneNumber.slice(-3)
    : phoneNumber;

  const handleInputChange = (index: number, value: string) => {
    if (isLocked || isVerified) return;

    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-focus next
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = newOtp.join('');
      if (fullCode.length === OTP_LENGTH) {
        verifyOtp(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (isLocked || isVerified) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    // Focus the next empty or last
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === OTP_LENGTH) {
      verifyOtp(pasted);
    }
  };

  const verifyOtp = async (code: string) => {
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber.trim(), code: code.trim() }),
      });
      const resData = await response.json();

      if (!response.ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setShake(true);
        setTimeout(() => setShake(false), 600);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setLockoutCountdown(LOCKOUT_SECONDS);
          setError(`Đã nhập sai ${MAX_ATTEMPTS} lần. Vui lòng đợi ${LOCKOUT_SECONDS} giây để thử lại.`);
        } else {
          setError(resData.message || `Mã OTP không đúng. Còn ${MAX_ATTEMPTS - newAttempts} lượt thử.`);
        }

        // Clear inputs
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }

      // Success
      setIsVerified(true);
      setError('');
      setTimeout(() => {
        onVerified(resData.data.otpToken);
      }, 800);
    } catch (err) {
      console.error('Lỗi khi xác thực OTP:', err);
      setError('Lỗi kết nối máy chủ khi xác thực OTP.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isLocked) return;
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber.trim() }),
      });
      const resData = await response.json();
      if (!response.ok) {
        setError(resData.message || 'Không thể gửi mã OTP mới.');
        return;
      }
      setCountdown(COUNTDOWN_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.error('Lỗi khi gửi lại OTP:', err);
      setError('Lỗi kết nối máy chủ khi gửi lại OTP.');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-on-primary flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <Icon name="verified_user" />
            Xác thực OTP
          </h3>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors"
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Simulated SMS Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="sms" className="text-amber-700 text-[18px]" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Tin nhắn mô phỏng (Demo)</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                Vì đây là phiên bản thử nghiệm, hệ thống đã in mã OTP ra dòng lệnh <strong className="text-amber-950">(Console Log)</strong> của máy chủ Backend. Bạn hãy xem trong Terminal chạy backend để lấy mã nhập nhé!
              </p>
            </div>
          </div>

          {/* Phone info */}
          <div className="text-center space-y-1">
            <p className="text-sm text-on-surface-variant">
              Mã xác thực đã được gửi đến số điện thoại
            </p>
            <p className="font-bold text-on-surface text-lg tracking-wider flex items-center justify-center gap-2">
              <Icon name="smartphone" className="text-primary text-[20px]" />
              {maskedPhone}
            </p>
          </div>

          {/* OTP Input */}
          <div
            className={`flex justify-center gap-3 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLocked || isVerified}
                className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition-all duration-200 ${
                  isVerified
                    ? 'border-green-500 bg-green-50 text-green-700 scale-105'
                    : isLocked
                    ? 'border-outline-variant bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                    : error
                    ? 'border-red-400 bg-red-50/50 text-on-surface focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30'
                    : digit
                    ? 'border-primary bg-primary/5 text-on-surface'
                    : 'border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30'
                }`}
              />
            ))}
          </div>

          {/* Success indicator */}
          {isVerified && (
            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl py-3 animate-in fade-in zoom-in-95">
              <Icon name="check_circle" className="text-[24px]" />
              <span className="font-bold">Xác thực thành công!</span>
            </div>
          )}

          {/* Error message */}
          {error && !isVerified && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm animate-in fade-in">
              <Icon name="error" className="text-[18px] shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Lockout timer */}
          {isLocked && (
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-bold">
                <Icon name="lock_clock" className="text-[18px]" />
                Đã khóa — Mở lại sau {formatTime(lockoutCountdown)}
              </div>
            </div>
          )}

          {/* Resend + Attempts info */}
          {!isVerified && !isLocked && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant text-xs">
                {attempts > 0 && `Đã thử ${attempts}/${MAX_ATTEMPTS} lần`}
              </span>
              {countdown > 0 ? (
                <span className="text-on-surface-variant text-xs flex items-center gap-1">
                  <Icon name="timer" className="text-[14px]" />
                  Gửi lại sau {countdown}s
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-primary font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Icon name="refresh" className="text-[14px]" />
                  Gửi lại mã mới
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-outline-variant text-on-surface rounded-xl font-bold cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            Hủy bỏ
          </button>
        </div>
      </div>

      {/* Shake animation keyframe (inline) */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};
