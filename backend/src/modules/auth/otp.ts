import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/errorHandler';

// ─── Cấu hình chung ────────────────────────────────────────────────────────────
const OTP_TTL = 60;      // 60 giây hạn sử dụng mã
const LIMIT_TTL = 3600;  // 1 giờ (3600 giây) cửa sổ rate-limit
const MAX_SENDS = 5;     // Tối đa 5 lần gửi / 1 giờ / 1 namespace
const MAX_FAILS = 5;     // Tối đa 5 lần nhập sai trước khi bị khóa

/**
 * Loại OTP — mỗi loại có namespace Redis riêng biệt,
 * hạn mức 5 lần/giờ độc lập với nhau.
 *
 *  - 'register' : OTP xác thực số điện thoại khi đăng ký tài khoản
 *  - 'booking'  : OTP xác nhận đặt lịch hẹn
 *  - 'forgot'   : OTP để đặt lại mật khẩu (quên mật khẩu)
 */
export type OtpPurpose = 'register' | 'booking' | 'forgot';

export const normalizeOtpPhone = (phone: string): string => phone.trim().replace(/[\s-]/g, '');

const formatTtl = (seconds: number): string => {
  if (seconds <= 0) return 'không xác định';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes} phút ${remainSeconds.toString().padStart(2, '0')} giây`;
};

const purposeLabel: Record<OtpPurpose, string> = {
  register: 'Đăng ký',
  booking: 'Đặt lịch',
  forgot: 'Quên mật khẩu',
};

/**
 * Xây dựng các Redis key theo namespace của từng mục đích.
 * Ví dụ: otp:register:0901234567, otp_count:booking:0901234567
 */
const buildKeys = (purpose: OtpPurpose, phone: string) => ({
  otpKey: `otp:${purpose}:${phone}`,
  lockKey: `otp_locked:${purpose}:${phone}`,
  countKey: `otp_count:${purpose}:${phone}`,
  failsKey: `otp_fails:${purpose}:${phone}`,
});

export const otpHelper = {
  /**
   * Sinh mã OTP 6 chữ số ngẫu nhiên, lưu vào Redis và in ra Console Log.
   *
   * @param phone   Số điện thoại (sẽ được normalize tự động)
   * @param purpose Mục đích gửi OTP ('register' | 'booking' | 'forgot')
   */
  async generateOtp(phone: string, purpose: OtpPurpose = 'register'): Promise<string> {
    const phoneTrim = normalizeOtpPhone(phone);

    // Validate định dạng số điện thoại Việt Nam
    const vnPhoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!vnPhoneRegex.test(phoneTrim)) {
      throw new AppError(
        400,
        'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam 10 chữ số (đầu số 03, 05, 07, 08, 09).',
        'INVALID_PHONE_NUMBER'
      );
    }

    const { otpKey, lockKey, countKey } = buildKeys(purpose, phoneTrim);
    const label = purposeLabel[purpose];

    // 1. Kiểm tra bị khóa
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockKey);
      console.warn('\n======================================================');
      console.warn(`🚫 [OTP LOCKED][${label}] SĐT: ${phoneTrim}`);
      console.warn(`⏳ Còn phải chờ: ${formatTtl(ttl)}`);
      console.warn('======================================================\n');
      throw new AppError(
        403,
        `Số điện thoại của bạn đã bị khóa OTP ${label} trong 1 giờ do nhập sai quá ${MAX_FAILS} lần liên tiếp.`,
        'OTP_LOCKEDOUT'
      );
    }

    // 1b. Kiểm tra 60s cooldown (không cho phép spam nút gửi liên tục)
    const existingOtp = await redis.get(otpKey);
    if (existingOtp) {
      const ttl = await redis.ttl(otpKey);
      throw new AppError(
        429,
        `Mã OTP vừa mới được gửi tới SĐT ${phoneTrim}. Vui lòng chờ ${ttl} giây trước khi yêu cầu mã mới.`,
        'OTP_COOLDOWN'
      );
    }

    // 2. Kiểm tra rate-limit gửi
    const currentSendsStr = await redis.get(countKey);
    const currentSends = currentSendsStr ? parseInt(currentSendsStr, 10) : 0;
    if (currentSends >= MAX_SENDS) {
      const ttl = await redis.ttl(countKey);
      console.warn('\n======================================================');
      console.warn(`🚫 [OTP RATE LIMIT][${label}] SĐT: ${phoneTrim}`);
      console.warn(`📊 Số lần gửi: ${currentSends}/${MAX_SENDS}`);
      console.warn(`⏳ Gửi lại sau: ${formatTtl(ttl)}`);
      console.warn('======================================================\n');
      throw new AppError(
        429,
        `Bạn đã vượt quá giới hạn gửi OTP ${label} (tối đa ${MAX_SENDS} lần/giờ). Vui lòng thử lại sau ${formatTtl(ttl)}.`,
        'OTP_RATE_LIMIT_EXCEEDED'
      );
    }

    // 3. Tăng bộ đếm
    if (currentSends === 0) {
      await redis.set(countKey, '1', 'EX', LIMIT_TTL);
    } else {
      await redis.incr(countKey);
    }

    // 4. Sinh và lưu mã OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(otpKey, code, 'EX', OTP_TTL);

    console.log('\n======================================================');
    console.log(`✉️  [SMS OTP REALTIME][${label}] Gửi OTP đến SĐT: ${phoneTrim}`);
    console.log(`🔑 MÃ XÁC THỰC OTP: ${code}`);
    console.log(`⏰ Hạn sử dụng: ${OTP_TTL} giây`);
    console.log(`📊 Số lần đã gửi trong giờ: ${currentSends + 1}/${MAX_SENDS}`);
    console.log('======================================================\n');

    return code;
  },

  /**
   * Xác thực mã OTP người dùng nhập vào.
   *
   * @param phone   Số điện thoại
   * @param code    Mã 6 chữ số người dùng nhập
   * @param purpose Mục đích OTP ('register' | 'booking' | 'forgot')
   */
  async verifyOtp(phone: string, code: string, purpose: OtpPurpose = 'register'): Promise<boolean> {
    const phoneTrim = normalizeOtpPhone(phone);
    const { otpKey, lockKey, failsKey } = buildKeys(purpose, phoneTrim);
    const label = purposeLabel[purpose];

    // 1. Kiểm tra khóa
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockKey);
      throw new AppError(
        403,
        `Số điện thoại của bạn đã bị khóa OTP ${label} trong 1 giờ do nhập sai quá ${MAX_FAILS} lần liên tiếp. Thử lại sau ${formatTtl(ttl)}.`,
        'OTP_LOCKEDOUT'
      );
    }

    const storedCode = await redis.get(otpKey);

    // OTP không tồn tại hoặc hết hạn
    if (!storedCode) {
      await this.handleFailedAttempt(phoneTrim, failsKey, lockKey, label);
      throw new AppError(400, `Mã OTP ${label} không đúng hoặc đã hết hạn. Vui lòng lấy mã mới.`, 'INVALID_OTP');
    }

    if (storedCode === code.trim()) {
      // Xác thực thành công — xóa OTP và bộ đếm lỗi, giữ lại countKey
      await redis.del(otpKey);
      await redis.del(failsKey);
      return true;
    }

    // Mã sai
    await this.handleFailedAttempt(phoneTrim, failsKey, lockKey, label);
    return false;
  },

  /**
   * Xử lý khi nhập sai OTP: tăng bộ đếm lỗi, khóa khi đạt ngưỡng.
   */
  async handleFailedAttempt(phone: string, failsKey: string, lockKey: string, label: string = '') {
    const currentFailsStr = await redis.get(failsKey);
    const currentFails = currentFailsStr ? parseInt(currentFailsStr, 10) : 0;
    const newFails = currentFails + 1;

    if (newFails >= MAX_FAILS) {
      await redis.set(lockKey, 'true', 'EX', LIMIT_TTL);
      await redis.del(failsKey);
      throw new AppError(
        403,
        `Số điện thoại của bạn đã bị khóa OTP${label ? ' ' + label : ''} trong 1 giờ do nhập sai quá ${MAX_FAILS} lần liên tiếp.`,
        'OTP_LOCKEDOUT'
      );
    } else {
      if (currentFails === 0) {
        await redis.set(failsKey, newFails.toString(), 'EX', LIMIT_TTL);
      } else {
        await redis.incr(failsKey);
      }
      throw new AppError(
        400,
        `Mã OTP không đúng. Còn lại ${MAX_FAILS - newFails} lượt thử trước khi bị khóa.`,
        'INVALID_OTP'
      );
    }
  },
};
