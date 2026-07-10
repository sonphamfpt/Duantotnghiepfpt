import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('⚡ Kết nối Redis thành công!');
});

redis.on('error', (err) => {
  console.error('❌ Lỗi kết nối Redis:', err);
});
