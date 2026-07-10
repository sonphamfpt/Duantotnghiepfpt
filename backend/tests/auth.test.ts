import { authService } from '../src/modules/auth/service';
import { prisma } from '../src/config/prisma';
import { AppError } from '../src/middlewares/errorHandler';

// Mock toàn bộ Prisma Client để kiểm thử độc lập mà không cần kết nối DB thực
jest.mock('../src/config/prisma', () => {
  const mockTx = {
    user: {
      create: jest.fn(),
    },
    patient: {
      create: jest.fn(),
    },
  };

  return {
    prisma: {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      membershipTier: {
        findUnique: jest.fn(),
      },
      patient: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      dentist: {
        findUnique: jest.fn(),
      },
      // Mô phỏng transaction bằng cách chạy trực tiếp callback
      $transaction: jest.fn((callback) => callback(mockTx)),
    },
  };
});

import bcrypt from 'bcrypt';

describe('AuthService - Unit Tests (Mocked Prisma)', () => {
  let mockHashedPassword = '';

  beforeAll(async () => {
    mockHashedPassword = await bcrypt.hash('12345678', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('Đăng nhập thành công với email và mật khẩu đúng', async () => {
      const mockUser = {
        userId: BigInt(123),
        fullName: 'Bác sĩ Lê Minh',
        email: 'leminh@goodsmile.vn',
        phone: '0901222333',
        passwordHash: mockHashedPassword,
        status: 'Active',
        role: {
          roleId: 3,
          code: 'dentist',
          name: 'Bác sĩ nha khoa',
        },
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.dentist.findUnique as jest.Mock).mockResolvedValue({
        dentistId: BigInt(45),
      });

      const result = await authService.login('leminh@goodsmile.vn', '12345678');

      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        userId: '123',
        role: 'dentist',
        fullName: 'Bác sĩ Lê Minh',
        dentistId: '45',
        patientId: undefined,
      });
      expect(prisma.user.findFirst).toHaveBeenCalledTimes(1);
    });

    test('Đăng nhập thất bại khi sai mật khẩu', async () => {
      const mockUser = {
        userId: BigInt(123),
        fullName: 'Bác sĩ Lê Minh',
        email: 'leminh@goodsmile.vn',
        phone: '0901222333',
        passwordHash: mockHashedPassword,
        status: 'Active',
        role: {
          roleId: 3,
          code: 'dentist',
        },
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('leminh@goodsmile.vn', 'wrongpassword')
      ).rejects.toThrow(new AppError(401, 'Tài khoản hoặc mật khẩu không chính xác.', 'INVALID_CREDENTIALS'));
    });

    test('Đăng nhập thất bại khi tài khoản bị khóa (Inactive)', async () => {
      const mockUser = {
        userId: BigInt(123),
        fullName: 'Bác sĩ Lê Minh',
        email: 'leminh@goodsmile.vn',
        passwordHash: mockHashedPassword,
        status: 'Inactive',
        role: {
          code: 'dentist',
        },
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('leminh@goodsmile.vn', '12345678')
      ).rejects.toThrow(new AppError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản lý.', 'ACCOUNT_DISABLED'));
    });
  });

  describe('register', () => {
    test('Đăng ký bệnh nhân mới thành công', async () => {
      // Giả lập không trùng số điện thoại/email
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ roleId: 1, code: 'patient' });
      (prisma.membershipTier.findUnique as jest.Mock).mockResolvedValue({ tierId: 1, code: 'STANDARD' });

      // Mock dữ liệu trả về từ transaction
      const mockCreatedUser = { userId: BigInt(999), fullName: 'Nguyễn Văn A', phone: '0912345678' };
      const mockCreatedPatient = { patientId: BigInt(888), fullName: 'Nguyễn Văn A', phone: '0912345678' };

      const mockTx = prisma.$transaction as jest.Mock;
      const mockTxResult = mockTx.mockImplementation(async (callback) => {
        const txObj = {
          user: {
            create: jest.fn().mockResolvedValue(mockCreatedUser),
          },
          patient: {
            create: jest.fn().mockResolvedValue(mockCreatedPatient),
          },
        };
        return callback(txObj);
      });

      const result = await authService.register({
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@gmail.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        userId: '999',
        role: 'patient',
        fullName: 'Nguyễn Văn A',
        patientId: '888',
      });
    });

    test('Đăng ký thất bại khi trùng số điện thoại', async () => {
      // Giả lập số điện thoại đã tồn tại
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ userId: BigInt(55) });

      await expect(
        authService.register({
          fullName: 'Trùng Số Điện Thoại',
          phone: '0901234567',
          password: 'password123',
        })
      ).rejects.toThrow(new AppError(409, 'Số điện thoại này đã được sử dụng.', 'PHONE_ALREADY_EXISTS'));
    });
  });
});
