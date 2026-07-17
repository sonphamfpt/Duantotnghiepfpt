import { io, Socket } from 'socket.io-client';

// Đọc URL backend từ biến môi trường Vite (đồng bộ với apiClient)
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

// Tạo kết nối Socket.io singleton
// autoConnect: false → kết nối thủ công trong ClinicContext
const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});

// Log sự kiện kết nối để debug
socket.on('connect', () => {
  console.log('🔌 [Socket.io] Đã kết nối WebSocket:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 [Socket.io] Mất kết nối WebSocket:', reason);
});

socket.on('connect_error', (err) => {
  console.warn('⚠️  [Socket.io] Lỗi kết nối:', err.message);
});

export { socket };
