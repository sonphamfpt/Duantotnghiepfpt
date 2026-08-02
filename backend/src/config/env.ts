import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL phải là một URL hợp lệ"),
  REDIS_URL: z.string().url("REDIS_URL phải là một URL hợp lệ"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET phải có tối thiểu 8 ký tự"),
  // Danh sách các domain frontend được phép (ngăn cách bằng dấu phẩy)
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  // VNPay Payment Gateway Sandbox
  VNP_TMN_CODE: z.string().default('YVB8E61U'),
  VNP_HASH_SECRET: z.string().default('GMHVFELKJPYNJODEJQLLRAXDALIRQHMZ'),
  VNP_URL: z.string().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNP_RETURN_URL: z.string().default('http://localhost:5173/patient-portal'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Lỗi cấu hình môi trường (.env):");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
