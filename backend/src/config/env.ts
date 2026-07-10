import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL phải là một URL hợp lệ"),
  REDIS_URL: z.string().url("REDIS_URL phải là một URL hợp lệ"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET phải có tối thiểu 8 ký tự"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Lỗi cấu hình môi trường (.env):");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
