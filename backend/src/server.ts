import http from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { socketManager } from './config/socket';

const PORT = env.PORT;

// Tạo HTTP server từ Express app để Socket.io có thể đính vào
const httpServer = http.createServer(app);

// Khởi tạo WebSocket server
socketManager.init(httpServer);

// Khởi động HTTP + WS server
httpServer.listen(PORT, () => {
  console.log(`🚀 [GoodSmile API] Máy chủ đang chạy tại: http://localhost:${PORT}`);
  console.log(`🔌 [GoodSmile WS]  WebSocket sẵn sàng tại: ws://localhost:${PORT}`);
});

// Xử lý tắt server an toàn khi nhận tín hiệu kết thúc (Graceful Shutdown)
const shutdown = async () => {
  console.log('\n🛑 Đang đóng máy chủ...');

  // Đóng WebSocket trước
  await socketManager.close();

  httpServer.close(async () => {
    console.log('HTTP server đã đóng.');

    await prisma.$disconnect();
    console.log('Kết nối Database (Prisma) đã ngắt.');

    await redis.quit();
    console.log('Kết nối Redis đã ngắt.');

    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
