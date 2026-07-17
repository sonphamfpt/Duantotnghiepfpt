import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/errorHandler';

const OTP_TTL = 60; // 60 giây hạn sử dụng mã
const LIMIT_TTL = 3600; // 1 giờ (3600 giây)
const MAX_SENDS = 5;
const MAX_FAILS = 5;

export const normalizeOtpPhone = (phone: string): string => phone.trim().replace(/[\s-]/g, '');

const formatTtl = (seconds: number): string => {
  if (seconds <= 0) return 'không xác định';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes} phút ${remainSeconds.toString().padStart(2, '0')} giây`;
};

export const otpHelper = {
  /**
   * Sinh mã OTP 6 chữ số ngẫu nhiên, lưu vào Redis và in ra Console Log
   */
  async generateOtp(phone: string): Promise<string> {
    const phoneTrim = normalizeOtpPhone(phone);
    const redisKey = `otp:${phoneTrim}`;
    const lockKey = `otp_locked:${phoneTrim}`;
    const countKey = `otp_count:${phoneTrim}`;

    // 1. Kiểm tra xem số điện thoại có đang bị khóa không
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockKey);
      console.warn('\n======================================================');
      console.warn(`🚫 [OTP LOCKED] SĐT: ${phoneTrim}`);
      console.warn(`⏳ Còn phải chờ: ${formatTtl(ttl)}`);
      console.warn('======================================================\n');
      throw new AppError(403, 'Số điện thoại của bạn đã bị khóa xác thực trong 1 giờ do nhập sai quá 5 lần liên tiếp.', 'OTP_LOCKEDOUT');
    }

    // 2. Kiểm tra giới hạn số lần gửi trong 1 giờ
    const currentSendsStr = await redis.get(countKey);
    const currentSends = currentSendsStr ? parseInt(currentSendsStr, 10) : 0;
    if (currentSends >= MAX_SENDS) {
      const ttl = await redis.ttl(countKey);
      console.warn('\n======================================================');
      console.warn(`🚫 [OTP RATE LIMIT] SĐT: ${phoneTrim}`);
      console.warn(`📊 Số lần gửi trong cửa sổ hiện tại: ${currentSends}/${MAX_SENDS}`);
      console.warn(`⏳ Gửi lại sau: ${formatTtl(ttl)}`);
      console.warn('======================================================\n');
      throw new AppError(429, `Bạn đã vượt quá giới hạn gửi OTP (tối đa ${MAX_SENDS} lần/giờ). Vui lòng thử lại sau.`, 'OTP_RATE_LIMIT_EXCEEDED');
    }

    // 3. Tăng bộ đếm số lần gửi
    if (currentSends === 0) {
      await redis.set(countKey, '1', 'EX', LIMIT_TTL);
    } else {
      await redis.incr(countKey);
    }

    // 4. Sinh mã và lưu vào Redis
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(redisKey, code, 'EX', OTP_TTL);

    console.log('\n======================================================');
    console.log(`✉️ [SMS SIMULATION] Gửi OTP đến SĐT: ${phoneTrim}`);
    console.log(`🔑 MÃ XÁC THỰC OTP: ${code}`);
    console.log(`⏰ Hạn sử dụng: ${OTP_TTL} giây`);
    console.log(`📊 Số lần đã gửi trong giờ: ${currentSends + 1}/${MAX_SENDS}`);
    console.log('======================================================\n');

    return code;
  },

  /**
   * Xác thực mã OTP người dùng nhập vào
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const phoneTrim = normalizeOtpPhone(phone);
    const redisKey = `otp:${phoneTrim}`;
    const lockKey = `otp_locked:${phoneTrim}`;
    const failsKey = `otp_fails:${phoneTrim}`;
    const countKey = `otp_count:${phoneTrim}`;

    // 1. Kiểm tra xem có đang bị khóa không
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      throw new AppError(403, 'Số điện thoại của bạn đã bị khóa xác thực trong 1 giờ do nhập sai quá 5 lần liên tiếp.', 'OTP_LOCKEDOUT');
    }

    const storedCode = await redis.get(redisKey);

    // Nếu mã OTP không tồn tại hoặc hết hạn
    if (!storedCode) {
      await this.handleFailedAttempt(phoneTrim, failsKey, lockKey);
      throw new AppError(400, 'Mã OTP không đúng hoặc đã hết hạn. Vui lòng lấy mã mới.', 'INVALID_OTP');
    }

    if (storedCode === code.trim()) {
      // Xác thực thành công -> xóa mã OTP và các bộ đếm liên quan để reset
      await redis.del(redisKey);
      await redis.del(failsKey);
      // NOTE: Do NOT delete `countKey` here. Keeping the send-count
      // preserves the rate-limit window (e.g. 5 sends per hour) even
      // after a successful verification. Deleting it previously caused
      // the hourly counter to reset unexpectedly when users re-request
      // OTPs (e.g. during rescheduling).
      return true;
    }

    // Nếu mã nhập sai
    await this.handleFailedAttempt(phoneTrim, failsKey, lockKey);
    return false;
  },

  /**
   * Xử lý khi nhập sai mã OTP: Tăng số lần sai, nếu đạt 5 lần thì khóa 1 giờ
   */
  async handleFailedAttempt(phone: string, failsKey: string, lockKey: string) {
    const currentFailsStr = await redis.get(failsKey);
    const currentFails = currentFailsStr ? parseInt(currentFailsStr, 10) : 0;
    const newFails = currentFails + 1;

    if (newFails >= MAX_FAILS) {
      // Khóa số điện thoại trong 1 giờ (3600 giây)
      await redis.set(lockKey, 'true', 'EX', LIMIT_TTL);
      await redis.del(failsKey);
      throw new AppError(403, 'Số điện thoại của bạn đã bị khóa xác thực trong 1 giờ do nhập sai quá 5 lần liên tiếp.', 'OTP_LOCKEDOUT');
    } else {
      if (currentFails === 0) {
        await redis.set(failsKey, newFails.toString(), 'EX', LIMIT_TTL);
      } else {
        await redis.incr(failsKey);
      }
      throw new AppError(400, `Mã OTP không đúng. Còn lại ${MAX_FAILS - newFails} lượt thử trước khi bị khóa.`, 'INVALID_OTP');
    }
  }
};
