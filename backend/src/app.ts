import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

// ─── Module Routers ───────────────────────────────────────────────────────────
import appointmentsRouter from './modules/appointments/routes';
import authRouter from './modules/auth/routes';
import queuesRouter from './modules/queues/router';
import medicalRecordsRouter from './modules/medical-records/router';
import invoicesRouter from './modules/invoices/routes';
import treatmentPlansRouter from './modules/treatment-plans/routes';
import shiftsRouter from './modules/shifts/routes';
import reportsRouter from './modules/reports/routes';
import patientsRouter from './modules/patients/routes';
import dentistsRouter from './modules/dentists/routes';
import servicesRouter from './modules/services/routes';
import staffRouter from './modules/staff/routes';
import logsRouter from './modules/logs/routes';
import reviewsRouter from './modules/reviews/routes';
import roomsRouter from './modules/rooms/routes';
import medicinesRouter from './modules/medicines/routes';


import { errorHandler } from './middlewares/errorHandler';
import { env } from './config/env';

const app = express();

// 1. Bảo mật và Cấu hình CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    const allowed = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-otp-token'],
}));

// 2. Chuyển đổi JSON Body đầu vào
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2b. Serve static files (avatar images)
app.use('/avatars', express.static(path.join(__dirname, 'public/avatars')));

// 3. Đường dẫn gốc kiểm tra trạng thái hoạt động
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Chào mừng bạn đến với API quản lý phòng khám Nha khoa GoodSmile! 🦷',
    timestamp: new Date().toISOString(),
  });
});

// 4. Đăng ký tất cả Module Routes
app.use('/api/auth',             authRouter);
app.use('/api/appointments',     appointmentsRouter);
app.use('/api/queues',           queuesRouter);
app.use('/api/medical-records',  medicalRecordsRouter);
app.use('/api/invoices',         invoicesRouter);
app.use('/api/treatment-plans',  treatmentPlansRouter);
app.use('/api/shifts',           shiftsRouter);
app.use('/api/reports',          reportsRouter);
app.use('/api/patients',         patientsRouter);
app.use('/api/dentists',         dentistsRouter);
app.use('/api/services',         servicesRouter);
app.use('/api/staff',            staffRouter);
app.use('/api/logs',             logsRouter);
app.use('/api/reviews',          reviewsRouter);
app.use('/api/rooms',            roomsRouter);
app.use('/api/medicines',        medicinesRouter);


// 5. Middleware xử lý lỗi tập trung (bắt buộc đặt cuối cùng)
app.use(errorHandler);

export default app;
