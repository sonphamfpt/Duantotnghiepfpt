import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

// Danh sách tất cả event types trong hệ thống phòng khám
export type ClinicEventType =
  | 'queue:checkin'          // Bệnh nhân mới check-in
  | 'queue:status_changed'   // Trạng thái hàng chờ thay đổi (InChair / Completed)
  | 'invoice:created'        // Hóa đơn mới được tạo (sau khi bác sĩ lưu bệnh án)
  | 'invoice:paid'           // Hóa đơn đã thanh toán
  | 'shift:swap_requested';  // Bác sĩ yêu cầu đổi ca trực

export interface ClinicEventPayload {
  event: ClinicEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

class SocketManager {
  private io: Server | null = null;

  /**
   * Khởi tạo Socket.io gắn vào HTTP server.
   * Phải gọi hàm này trong server.ts sau khi tạo httpServer.
   */
  init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
      // Cho phép polling fallback nếu WebSocket không được hỗ trợ
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 [Socket.io] Client kết nối: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        console.log(`🔌 [Socket.io] Client ngắt kết nối: ${socket.id} — Lý do: ${reason}`);
      });
    });

    console.log('✅ [Socket.io] WebSocket server đã khởi động thành công.');
  }

  /**
   * Phát sự kiện đến tất cả client đang kết nối.
   * Gọi hàm này trong controller sau mỗi action nghiệp vụ quan trọng.
   */
  emit(event: ClinicEventType, data: Record<string, unknown> = {}): void {
    if (!this.io) {
      console.warn(`⚠️  [Socket.io] Chưa khởi tạo — bỏ qua emit: ${event}`);
      return;
    }

    const payload: ClinicEventPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.io.emit(event, payload);
    console.log(`📡 [Socket.io] Emit → ${event}`, data);
  }

  /**
   * Đóng WebSocket server (dùng trong graceful shutdown)
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close(() => {
          console.log('🔌 [Socket.io] WebSocket server đã đóng.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getIO(): Server | null {
    return this.io;
  }
}

// Singleton instance — dùng xuyên suốt toàn bộ backend
export const socketManager = new SocketManager();
