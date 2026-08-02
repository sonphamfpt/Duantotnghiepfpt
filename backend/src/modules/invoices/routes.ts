import { Router } from 'express';
import * as controller from './controller';
import { authGuard } from '../../middlewares/authGuard';
import { rbacGuard } from '../../middlewares/rbacGuard';

const router = Router();

// Endpoint công khai cho Callback/IPN VNPay (Tự bảo mật qua Chữ ký Checksum HMAC-SHA512)
router.get('/vnpay-return', controller.vnPayReturnHandler);
router.get('/vnpay-ipn', controller.vnPayReturnHandler);

// Tất cả các API bên dưới yêu cầu người dùng phải đăng nhập thành công
router.use(authGuard);

// API dành riêng cho Thu ngân / Lễ tân / Quản lý thực hiện thanh toán trực tiếp & quản lý hóa đơn
router.get('/', rbacGuard({ permission: 'checkout', roles: ['cashier', 'receptionist', 'manager'] }), controller.getInvoicesHandler);
router.post('/:id/pay', rbacGuard({ permission: 'checkout', roles: ['cashier', 'receptionist', 'manager'] }), controller.payInvoiceHandler);
router.post('/patients/:patientId/recharge', rbacGuard({ permission: 'checkout', roles: ['cashier', 'receptionist', 'manager'] }), controller.rechargeWalletHandler);

// API hỗ trợ tạo VNPay URL (Bệnh nhân hoặc Nhân viên phòng khám đều có thể gọi)
router.post('/:id/create-vnpay-url', controller.createVnPayUrlHandler);

// API xem thông tin chi tiết hóa đơn & lịch sử thanh toán
router.get('/:id', controller.getInvoiceByIdHandler);
router.get('/patients/:patientId/billing', controller.getPatientBillingHandler);

export default router;
