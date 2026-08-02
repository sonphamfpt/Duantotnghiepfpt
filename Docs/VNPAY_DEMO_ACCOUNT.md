# 💳 TÀI KHOẢN THẺ TEST VNPAY SANDBOX (DEMO)

Tài liệu hướng dẫn & tài khoản demo thanh toán thử nghiệm qua cổng **VNPay Sandbox** dành cho kiểm thử viên, lập trình viên và người dùng trải nghiệm hệ thống **Nha Khoa GoodSmile**.

---

## 🏦 1. Thông Tin Thẻ Test VNPay Sandbox (Ngân Hàng NCB)

Khi thực hiện thanh toán trực tuyến qua cổng VNPay, quý khách / kiểm thử viên vui lòng chọn ngân hàng **NCB** và nhập thông tin thẻ như sau:

| Thông tin | Dữ liệu Test Demo |
| :--- | :--- |
| **Ngân Hàng (Bank)** | **NCB** (Ngân hàng Quốc Dân) |
| **Số Thẻ (Card Number)** | `9704198526191432198` |
| **Tên Chủ Thẻ (Card Holder)** | `NGUYEN VAN A` |
| **Ngày Phát Hành (Release Date)** | `07/15` |
| **Mã Xác Thực OTP (OTP Code)** | `123456` |

---

## 📱 2. Quy Trình Thanh Toán Test VNPay Trên Hệ Thống

1. **Bước 1:** Đăng nhập Cổng Bệnh Nhân tại `/patient?tab=billing` hoặc chọn hóa đơn cần thanh toán.
2. **Bước 2:** Bấm nút **Thanh toán VNPAY** hoặc **Đóng tiền qua VNPAY**.
3. **Bước 3:** Hệ thống tự động chuyển sang giao diện Cổng VNPay Sandbox.
4. **Bước 4:** Chọn phương thức **Thẻ nội địa & tài khoản ngân hàng** -> Chọn Logo ngân hàng **NCB**.
5. **Bước 5:** Nhập thông tin số thẻ `9704198526191432198`, tên `NGUYEN VAN A`, ngày phát hành `07/15`.
6. **Bước 6:** Nhập OTP `123456` để xác nhận thanh toán thành công.
7. **Bước 7:** VNPay tự động chuyển hướng về lại hệ thống GoodSmile và ghi nhận hóa đơn đã thanh toán thành công 100%!

---

## ⚙️ 3. Cấu Hình VNPay Backend Sandbox (Tham khảo)

- **VNPay Url:** `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- **Return Url:** `http://localhost:5173/patient?tab=billing`

---
*Ghi chú: Tài khoản này chỉ dùng cho mục đích kiểm thử trên môi trường VNPay Sandbox, hoàn toàn an toàn và không trừ tiền thật.*
