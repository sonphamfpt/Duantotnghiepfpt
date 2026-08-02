import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RoleCode } from '@prisma/client';
import { normalizeOtpPhone } from './otp';

export class AuthService {
  /**
   * Đăng ký tài khoản cho Bệnh nhân mới
   */
  async register(data: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    otpToken: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
  }) {
    const { fullName, phone, email, password, otpToken, dateOfBirth, gender, address } = data;
    const normalizedPhone = normalizeOtpPhone(phone);

    try {
      const decoded = jwt.verify(otpToken, env.JWT_SECRET) as { phone: string; verified: boolean };
      if (!decoded.verified || normalizeOtpPhone(decoded.phone) !== normalizedPhone) {
        throw new AppError(400, 'Số điện thoại xác thực OTP không khớp với thông tin đăng ký.', 'INVALID_OTP_TOKEN');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(400, 'Mã xác thực OTP không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới.', 'INVALID_OTP_TOKEN');
    }

    // 1. Kiểm tra xem Số điện thoại đã được đăng ký chưa
    const existingUserByPhone = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });
    if (existingUserByPhone) {
      throw new AppError(409, 'Số điện thoại này đã được sử dụng.', 'PHONE_ALREADY_EXISTS');
    }

    // 2. Kiểm tra xem Email đã được đăng ký chưa
    if (email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUserByEmail) {
        throw new AppError(409, 'Email này đã được sử dụng.', 'EMAIL_ALREADY_EXISTS');
      }
    }

    // 3. Lấy thông tin Role và Membership Tier mặc định
    const role = await prisma.role.findUnique({
      where: { code: RoleCode.patient },
    });
    if (!role) {
      throw new AppError(500, 'Không tìm thấy vai trò bệnh nhân trên hệ thống.', 'ROLE_NOT_FOUND');
    }

    const defaultTier = await prisma.membershipTier.findUnique({
      where: { code: 'STANDARD' },
    });
    if (!defaultTier) {
      throw new AppError(500, 'Không tìm thấy phân hạng thành viên Standard.', 'TIER_NOT_FOUND');
    }

    // 4. Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Thực hiện Transaction tạo User và liên kết/tạo Patient
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          roleId: role.roleId,
          fullName,
          phone: normalizedPhone,
          email: email || null,
          passwordHash,
          status: 'Active',
        },
      });

      // Tìm bệnh nhân cũ theo Số điện thoại
      const existingPatient = await tx.patient.findUnique({
        where: { phone: normalizedPhone },
      });

      let targetPatient;
      if (existingPatient) {
        if (existingPatient.userId) {
          throw new AppError(409, 'Hồ sơ bệnh nhân này đã được liên kết với một tài khoản khác.', 'PATIENT_ALREADY_LINKED');
        }

        // Cập nhật liên kết userId cho bệnh nhân cũ
        targetPatient = await tx.patient.update({
          where: { patientId: existingPatient.patientId },
          data: {
            userId: newUser.userId,
            fullName: existingPatient.fullName || fullName,
            dateOfBirth: existingPatient.dateOfBirth || (dateOfBirth ? new Date(dateOfBirth) : null),
            gender: existingPatient.gender || gender || null,
            address: existingPatient.address || address || null,
          },
        });
      } else {
        // Tạo bệnh nhân mới tinh
        targetPatient = await tx.patient.create({
          data: {
            userId: newUser.userId,
            fullName,
            phone: normalizedPhone,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender || null,
            address: address || null,
            tierId: defaultTier.tierId,
            loyaltyPoints: 0,
          },
        });
      }

      return { user: newUser, patient: targetPatient };
    });

    // 6. Ký Token JWT
    const token = jwt.sign(
      {
        userId: result.user.userId.toString(),
        role: RoleCode.patient,
        fullName: result.user.fullName,
        patientId: result.patient.patientId.toString(),
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        userId: result.user.userId.toString(),
        role: RoleCode.patient,
        fullName: result.user.fullName,
        patientId: result.patient.patientId.toString(),
      },
    };
  }

  /**
   * Đăng nhập hệ thống (Bằng Email cho nhân viên hoặc Số điện thoại cho bệnh nhân)
   */
  async login(identifier: string, password: string) {
    // 1. Tìm kiếm User theo Email hoặc Số điện thoại
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      include: {
        role: true,
        staffPermission: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'Tài khoản hoặc mật khẩu không chính xác.', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'Inactive') {
      throw new AppError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản lý.', 'ACCOUNT_DISABLED');
    }

    if (!user.passwordHash) {
      throw new AppError(401, 'Tài khoản chưa thiết lập mật khẩu đăng nhập.', 'PASSWORD_NOT_SET');
    }

    // 2. So sánh mật khẩu băm
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, 'Tài khoản hoặc mật khẩu không chính xác.', 'INVALID_CREDENTIALS');
    }

    // 2.1 Kiểm tra phân quyền truy cập phân hệ theo Vai trò
    if (user.role.code !== RoleCode.patient) {
      const perm = user.staffPermission;
      if (user.role.code === RoleCode.receptionist && perm && !perm.admission) {
        throw new AppError(403, 'Tài khoản Lễ tân của bạn chưa được cấp quyền Đón tiếp. Vui lòng liên hệ Quản lý.', 'PERMISSION_DENIED');
      }
      if (user.role.code === RoleCode.dentist && perm && !perm.clinical) {
        throw new AppError(403, 'Tài khoản Bác sĩ của bạn chưa được cấp quyền Khám lâm sàng. Vui lòng liên hệ Quản lý.', 'PERMISSION_DENIED');
      }
      if (user.role.code === RoleCode.cashier && perm && !perm.checkout) {
        throw new AppError(403, 'Tài khoản Thu ngân của bạn chưa được cấp quyền Tính tiền. Vui lòng liên hệ Quản lý.', 'PERMISSION_DENIED');
      }
      if (user.role.code === RoleCode.manager && perm && !perm.settings) {
        throw new AppError(403, 'Tài khoản Quản lý của bạn chưa được cấp quyền Cấu hình hệ thống. Vui lòng liên hệ Quản lý.', 'PERMISSION_DENIED');
      }
    }

    // 3. Tìm các ID liên kết DentistId hoặc PatientId nếu có
    let dentistId: string | undefined;
    let patientId: string | undefined;

    if (user.role.code === RoleCode.dentist) {
      const dentist = await prisma.dentist.findUnique({
        where: { userId: user.userId },
      });
      if (dentist) dentistId = dentist.dentistId.toString();
    } else if (user.role.code === RoleCode.patient) {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });
      if (patient) patientId = patient.patientId.toString();
    }

    // 4. Ký Token JWT
    const token = jwt.sign(
      {
        userId: user.userId.toString(),
        role: user.role.code,
        fullName: user.fullName,
        dentistId,
        patientId,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        userId: user.userId.toString(),
        role: user.role.code,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatarUrl,
        dentistId,
        patientId,
      },
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại & các quyền hạn chi tiết (Staff Permissions)
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        role: true,
        staffPermission: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'Không tìm thấy thông tin tài khoản.', 'USER_NOT_FOUND');
    }

    let dentistId: string | undefined;
    let patientId: string | undefined;
    let patientProfile: any = null;
    let dentistProfile: any = null;

    if (user.role.code === RoleCode.dentist) {
      const dentist = await prisma.dentist.findUnique({
        where: { userId: user.userId },
      });
      if (dentist) {
        dentistId = dentist.dentistId.toString();
        dentistProfile = {
          specialty: dentist.specialty,
          degree: dentist.degree,
          experienceYears: dentist.experienceYears,
          bio: dentist.bio,
          motto: dentist.motto,
        };
      }
    } else if (user.role.code === RoleCode.patient) {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });
      if (patient) {
        patientId = patient.patientId.toString();
        patientProfile = {
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : null,
          gender: patient.gender,
          address: patient.address,
          criticalAllergy: patient.criticalAllergy,
          medicalCondition: patient.medicalCondition,
        };
      }
    }

    return {
      userId: user.userId.toString(),
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role.code,
      dentistId,
      patientId,
      patientProfile,
      dentistProfile,
      permissions: user.role.code === RoleCode.manager
        ? { admission: true, clinical: true, checkout: true, settings: true } // Manager bypass toàn bộ
        : user.staffPermission
          ? {
              admission: user.staffPermission.admission,
              clinical: user.staffPermission.clinical,
              checkout: user.staffPermission.checkout,
              settings: user.staffPermission.settings,
            }
          : null,
    };
  }

  /**
   * Cập nhật thông tin cá nhân tùy theo Role
   */
  async updateProfile(userId: string, body: any) {
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      include: { role: true },
    });
    if (!user) throw new AppError(404, 'Không tìm thấy tài khoản.', 'USER_NOT_FOUND');

    const { fullName, email, dateOfBirth, gender, address, criticalAllergy, medicalCondition, specialty, degree, experienceYears, bio, motto } = body;

    return await prisma.$transaction(async (tx) => {
      // 1. Update User basic info
      const updateUserData: any = {};
      if (fullName && fullName.trim()) updateUserData.fullName = fullName.trim();
      if (email !== undefined) updateUserData.email = email ? email.trim() : null;

      if (Object.keys(updateUserData).length > 0) {
        await tx.user.update({
          where: { userId: user.userId },
          data: updateUserData,
        });
      }

      // 2. Update Patient specific info if role is Patient
      if (user.role.code === RoleCode.patient) {
        const patient = await tx.patient.findUnique({ where: { userId: user.userId } });
        if (patient) {
          await tx.patient.update({
            where: { patientId: patient.patientId },
            data: {
              fullName: fullName && fullName.trim() ? fullName.trim() : patient.fullName,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              gender: gender !== undefined ? gender : patient.gender,
              address: address !== undefined ? address : patient.address,
              criticalAllergy: criticalAllergy !== undefined ? criticalAllergy : patient.criticalAllergy,
              medicalCondition: medicalCondition !== undefined ? medicalCondition : patient.medicalCondition,
            },
          });
        }
      }

      // 3. Update Dentist specific info if role is Dentist
      if (user.role.code === RoleCode.dentist) {
        const dentist = await tx.dentist.findUnique({ where: { userId: user.userId } });
        if (dentist) {
          await tx.dentist.update({
            where: { dentistId: dentist.dentistId },
            data: {
              specialty: specialty !== undefined ? specialty : dentist.specialty,
              degree: degree !== undefined ? degree : dentist.degree,
              experienceYears: experienceYears !== undefined ? (experienceYears ? Number(experienceYears) : null) : dentist.experienceYears,
              bio: bio !== undefined ? bio : dentist.bio,
              motto: motto !== undefined ? motto : dentist.motto,
            },
          });
        }
      }

      return { message: 'Cập nhật thông tin cá nhân thành công!' };
    });
  }

  /**
   * Yêu cầu gửi OTP để Quên mật khẩu
   */
  async requestPasswordResetOtp(phone: string) {
    const normalizedPhone = normalizeOtpPhone(phone);
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new AppError(404, 'Không tìm thấy tài khoản tương ứng với số điện thoại này.', 'USER_NOT_FOUND');
    }

    const { otpHelper } = require('./otp');
    // Dùng namespace 'forgot' — độc lập với OTP đăng ký và đặt lịch
    await otpHelper.generateOtp(normalizedPhone, 'forgot');
    return { phone: normalizedPhone };
  }

  /**
   * Đặt lại mật khẩu mới bằng otpToken
   */
  async resetPassword(data: { phone: string; otpToken: string; newPassword: string }) {
    const { phone, otpToken, newPassword } = data;
    const normalizedPhone = normalizeOtpPhone(phone);

    try {
      const decoded = jwt.verify(otpToken, env.JWT_SECRET) as { phone: string; verified: boolean };
      if (!decoded.verified || normalizeOtpPhone(decoded.phone) !== normalizedPhone) {
        throw new AppError(400, 'Mã xác thực OTP không hợp lệ hoặc không khớp với số điện thoại.', 'INVALID_OTP_TOKEN');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(400, 'Mã xác thực OTP đã hết hạn hoặc không hợp lệ. Vui lòng lấy mã mới.', 'INVALID_OTP_TOKEN');
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new AppError(404, 'Không tìm thấy tài khoản người dùng.', 'USER_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { userId: user.userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}

export const authService = new AuthService();
