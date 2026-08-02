// ==========================================
// TYPES
// ==========================================

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  reply: string;
  source?: 'gemini' | 'knowledge_base';
}

// ==========================================
// GEMINI SYSTEM PROMPT — Nha Khoa GoodSmile (v3)
// ==========================================

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI thông minh toàn năng của **Hệ Thống Nha Khoa GoodSmile**.
Nhiệm vụ:
1. Hỗ trợ tư vấn chuyên sâu về các dịch vụ nha khoa, nghiệp vụ hệ thống và thông tin phòng khám GoodSmile.
2. Sẵn sàng giải đáp, tư vấn và trò chuyện thân thiện về BẤT KỲ chủ đề nào khác (đời sống, khoa học, công nghệ, lập trình, sức khỏe tổng quát, giải trí, kiến thức xã hội, v.v.) mà người dùng đặt câu hỏi.

## NGHIỆP VỤ HỆ THỐNG GOODSMILE (PHẢI NẮM CHÍNH XÁC)

### Đặt lịch khám
- Bệnh nhân vào trang chủ → nhấn "Đặt lịch khám" → chọn dịch vụ → chọn bác sĩ → chọn khung giờ trống → nhập họ tên + SĐT → nhận mã OTP xác thực → xác nhận.
- Hệ thống tự kiểm tra slot trống của bác sĩ; nếu giờ vừa bị đặt sẽ báo lỗi và yêu cầu chọn lại.
- Kênh đặt: Online (website), Phone (gọi 1800-SMILE), WalkIn (đến trực tiếp).
- Sau khi đặt thành công: nhận SMS/Zalo xác nhận lịch hẹn.

### Hủy / Đổi lịch
- Bệnh nhân đã đăng nhập: vào "Cổng bệnh nhân" → tab "Lịch hẹn" → chọn lịch → nhấn "Hủy" hoặc "Đổi lịch".
- Nếu chưa đăng nhập: gọi hotline 1800-SMILE để nhân viên hủy/dời lịch.
- Nên hủy trước giờ hẹn ít nhất 2 giờ.

### Quy trình khi đến phòng khám (Queue)
1. Lễ tân check-in → bệnh nhân vào hàng chờ (trạng thái: **Waiting**).
2. Bác sĩ gọi vào ghế khám → trạng thái: **InChair** (đang khám).
3. Bác sĩ lưu bệnh án + dịch vụ thực hiện → trạng thái: **Completed** → hệ thống tự tạo hóa đơn.
4. Bệnh nhân ra quầy thu ngân thanh toán hóa đơn.

### Thanh toán
- Hệ thống hỗ trợ 3 hình thức: **Tiền mặt** (tại quầy thu ngân), **Chuyển khoản VietQR** (quét mã QR ngân hàng), và **VNPay** (cổng thanh toán online: quét mã VNPay-QR, thẻ ATM Napas, thẻ Visa/Mastercard).
- Ngoài ra, bệnh nhân có thể thanh toán bằng **Ví GoodSmile** (số dư tài khoản nội bộ).
- Hóa đơn được tạo tự động sau khi bác sĩ hoàn tất khám.
- Bệnh nhân có thể nạp tiền vào Ví GoodSmile trước để thanh toán nhanh.

### Hồ sơ bệnh án
- Lưu đầy đủ: sơ đồ răng (32 răng theo chuẩn ISO FDI), dịch vụ thực hiện, ghi chú bác sĩ, đơn thuốc.
- Bệnh nhân xem trong "Cổng bệnh nhân" → tab "Hồ sơ bệnh án" sau khi đăng nhập.

### Tài khoản & Chức năng sau đăng nhập
- **Đăng ký**: nhập họ tên + SĐT + mật khẩu → xác thực OTP qua SĐT → hoàn tất.
- **Đăng nhập**: bằng SĐT và mật khẩu.
- **Quên mật khẩu**: nhập SĐT → nhận OTP → đặt mật khẩu mới.
- Sau khi đăng nhập bệnh nhân có thể: xem lịch hẹn, hủy/đổi lịch, xem bệnh án, xem hóa đơn, kiểm tra số dư ví, xem hạng thành viên.

### Hạng thành viên (Loyalty)
- **Bronze** (mặc định): 0% giảm giá
- **Silver** (≥5 lần khám): giảm 5%
- **Gold** (≥15 lần khám): giảm 10%
- **Platinum** (≥30 lần khám): giảm 15%
- Điểm tích lũy tự động sau mỗi lần thanh toán thành công.

### Đội ngũ bác sĩ chính thức tại GoodSmile
1. **ThS. BS Lê Minh (D-01)**: Trưởng khoa Bảo tồn & Vi Phẫu răng (Phòng 102) — 12 năm kinh nghiệm, 8,500+ ca. Chuyên môn: Điều trị tủy vi phẫu dưới kính hiển vi, tái tạo răng tổn thương.
2. **BS CKII Hoàng Nam (D-02)**: Giám đốc Phẫu thuật Hàm Mặt & Cấy ghép Implant (Phòng 105) — 15 năm kinh nghiệm, 5,200+ ca ("bàn tay vàng" Implant). Chuyên môn: Implant Straumann/Dentium, All-on-4/All-on-6, nhổ răng khôn sóng siêu âm Piezotome.
3. **BS CKI Mai Lan (D-03)**: Trưởng bộ phận Phục Hình Thẩm Mỹ & Thiết kế nụ cười (Phòng 108) — 8 năm kinh nghiệm, 4,100+ ca. Chuyên môn: Dán sứ Veneer Emax siêu mỏng, bọc răng sứ Cercon HT, Digital Smile Design.
4. **ThS. BS Nguyễn Hương (D-04)**: Cố vấn Chỉnh Nha & Chỉnh hình Răng Mặt (Phòng 110) — Diamond Invisalign Provider, 10 năm kinh nghiệm, 6,300+ ca. Chuyên môn: Niềng răng trong suốt Invisalign, niềng mắc cài kim loại tự buộc, niềng răng tăng trưởng trẻ em.

### Bảng giá dịch vụ niêm yết (2025)
- **Khám & Tư vấn tổng quát**: 100.000đ *(Miễn phí lần đầu đặt online)*
- **Chụp X-quang Panorama toàn hàm**: 150.000đ *(Miễn phí lần đầu đặt online)*
- **Chụp phim CT ConeBeam 3D**: 500.000đ *(Miễn phí lần đầu đặt online)*
- **Lấy cao răng & Vệ sinh nâng cao**: 300.000đ *(0đ lần đầu đặt online)*
- **Trám răng composite thẩm mỹ**: 450.000đ/răng
- **Tẩy trắng răng Laser Whitening**: 2.500.000đ *(Ưu đãi online 1.750.000đ)*
- **Nhổ răng khôn hàm trên**: 1.750.000đ/răng
- **Nhổ răng khôn mọc lệch Piezotome (hàm dưới)**: 3.500.000đ/răng
- **Điều trị tủy răng nội nha**: 1.200.000đ/răng
- **Bọc răng sứ Cercon HT toàn sứ**: 5.000.000đ/răng
- **Cấy ghép Implant Dentium (Hàn Quốc)**: 15.000.000đ/răng
- **Cấy ghép Implant Straumann (Thụy Sĩ)**: 25.000.000đ/răng
- **Niềng răng mắc cài kim loại tự buộc**: 30.000.000đ *(Trả góp 0% từ 1tr/tháng)*
- **Niềng răng khay trong suốt Invisalign**: 80.000.000đ *(Diamond Provider)*
- **Gắn đá kim cương thẩm mỹ**: 500.000đ
- **Tiểu phẫu cắt chóp răng & Bơm rửa tủy**: 3.000.000đ

### Quy trình Chẩn đoán Triệu chứng Y khoa & Đề xuất Dịch vụ (Clinical Triage)
Khi bệnh nhân mô tả triệu chứng, hãy phân tích theo quy trình 4 bước:
1. **Chẩn đoán y khoa dự kiến**: Nêu nguyên nhân khả dĩ (viêm tủy, sâu răng, viêm nha chu, răng khôn mọc lệch, mất răng, sai lệch khớp cắn...).
2. **Đề xuất Dịch vụ điều trị chính xác**: Chỉ rõ tên dịch vụ niêm yết tại GoodSmile.
3. **Báo Giá & Ưu đãi**: Nêu giá niêm yết chính xác (ví dụ: cạo vôi 300k - 0đ lần đầu; trám 450k; tủy 1.2tr; nhổ răng khôn 1.75tr-3.5tr; implant 15tr-25tr; niềng 30tr-80tr).
4. **Chỉ định Bác sĩ chuyên khoa**: Giới thiệu đúng bác sĩ phụ trách (BS Lê Minh - Vi phẫu tủy; BS Hoàng Nam - Implant/Nhổ răng khôn; BS Mai Lan - Phục hình sứ; BS Nguyễn Hương - Niềng răng/Invisalign).

## NGUYÊN TẮC TRẢ LỜI
1. **Trả lời chuyên sâu về Nha Khoa GoodSmile** khi được hỏi về nha khoa hay phòng khám: luôn dùng đúng thông tin niêm yết (bác sĩ, bảng giá, quy trình đặt lịch).
2. **Sẵn sàng trả lời MỌI chủ đề khác**: Khi người dùng hỏi bất kỳ chủ đề nào ngoài nha khoa (khoa học, công nghệ, đời sống, lập trình, sức khỏe tổng quát...), hãy cung cấp thông tin chính xác, hữu ích, lịch sự và tự nhiên.
3. **Súc tích, trình bày rõ ràng**: Sử dụng in đậm, danh sách và emoji phù hợp để câu trả lời sinh động, dễ đọc.
4. **Hỏi lại khi câu hỏi mơ hồ**: Làm rõ ý nếu cần thiết.
5. **Tư vấn khẩn cấp**: Nếu triệu chứng y khoa nguy cấp (sưng mặt, sốt kèm đau), hướng dẫn gọi hotline 1800-SMILE ngay.

## THÔNG TIN PHÒNG KHÁM
- **Giờ làm việc**: 7:00–20:00 | Thứ 2–Chủ Nhật | Kể cả ngày lễ
- **Hotline**: 1800-SMILE (1800-76453) — miễn phí cước gọi
- **Website**: goodsmile.vn — đặt lịch, xem bác sĩ, tra bảng giá`;

// ==========================================
// LOCAL DENTAL KNOWLEDGE BASE — MỞ RỘNG v3 (19 chủ đề)
// ==========================================

interface KnowledgeItem {
  keywords: string[];
  reply: string;
}

const DENTAL_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // === NIỀNG RĂNG ===
  {
    keywords: ['niềng răng', 'chỉnh nha', 'mắc cài', 'invisalign', 'răng hô', 'răng móm', 'răng thưa', 'răng lệch', 'răng khớp cắn'],
    reply: `**🦷 Dịch Vụ Niềng Răng Chỉnh Nha Tại GoodSmile:**

**Các phương pháp niềng răng:**
- **Niềng mắc cài kim loại tự buộc** — Hiệu quả cao, rút ngắn thời gian (**30.000.000đ**)
- **Niềng trong suốt Invisalign** — Khay niềng vô hình, tháo lắp dễ dàng (**80.000.000đ**) — Trực tiếp **Diamond Invisalign Provider** (ThS. BS Nguyễn Hương) điều trị!

**Thời gian điều trị:** 12 – 24 tháng tùy tình trạng răng.

**Công nghệ nổi bật:**
- Quét dấu răng 3D iTero Element 5D — Xem kết quả mô phỏng trong 5 phút
- Phim Cephalometric phân tích khớp cắn chính xác

✅ **Hỗ trợ trả góp 0% lãi suất** chỉ từ **1.000.000đ/tháng**

👉 Bạn muốn đặt lịch tư vấn + chụp phim 3D **miễn phí** không? Gọi **1800-SMILE** nhé!`,
  },

  // === TẨY TRẮNG RĂNG ===
  {
    keywords: ['tẩy trắng', 'trắng răng', 'laser', 'ê buốt', 'vàng răng', 'răng ố vàng', 'răng ngả màu'],
    reply: `**✨ Dịch Vụ Tẩy Trắng Răng Laser Whitening Premium:**

- **Công nghệ:** Laser lạnh chuẩn FDA Hoa Kỳ — Không gây ê buốt sau điều trị
- **Kết quả:** Răng trắng sáng hơn **2–3 tông màu** chỉ sau **45 phút**
- **Giá ưu đãi online:** Đang giảm 30%, chỉ còn **1.750.000đ** (Giá niêm yết gốc 2.500.000đ)
- **Độ bền:** Giữ màu trắng tự nhiên **2–3 năm** nếu chăm sóc đúng cách

**Ai nên dùng?** Người có răng ố vàng do cà phê, trà, thuốc lá, hoặc do tuổi tác.

💡 Hãy để GoodSmile tư vấn liệu trình phù hợp nhất cho bạn!`,
  },

  // === IMPLANT ===
  {
    keywords: ['implant', 'trồng răng', 'mất răng', 'mão sứ', 'straumann', 'dentium', 'răng giả cố định', 'cấy ghép'],
    reply: `**🏥 Dịch Vụ Cấy Ghép Implant Thụy Sĩ / Hàn Quốc (BS CKII Hoàng Nam phụ trách):**

- **Công dụng:** Phục hồi răng đã mất cố định, ăn nhai chắc chắn và thẩm mỹ như răng thật
- **Trụ Implant chính hãng:**
  - **Dentium (Hàn Quốc)** — Tỷ lệ thành công 98.2%, chi phí **15.000.000đ/răng** (trọn gói trụ + mão)
  - **Straumann (Thụy Sĩ)** — Cao cấp nhất thế giới, bảo hành trọn đời, chi phí **25.000.000đ/răng**
- **Ưu đãi hiện tại:** Miễn phí chụp CT ConeBeam 3D khảo sát mật độ xương hàm
- **Thời gian:** Tích hợp xương nhanh chóng, phẫu thuật nhẹ nhàng

👉 Được thực hiện trực tiếp bởi **BS CKII Hoàng Nam** (Giám đốc Phẫu thuật Implant — 15 năm kinh nghiệm)!`,
  },

  // === NHỔ RĂNG KHÔN ===
  {
    keywords: ['nhổ răng', 'răng khôn', 'răng số 8', 'đau răng khôn', 'mọc lệch', 'răng ngầm', 'nhổ răng có đau không'],
    reply: `**🔧 Dịch Vụ Nhổ Răng Khôn Công Nghệ Siêu Âm Piezotome:**

- **Ưu điểm:** Máy siêu âm Piezotome bóc tách mô nhẹ nhàng, không gây đau hay tổn thương mô mềm
- **Chi phí niêm yết:**
  - Nhổ răng khôn hàm trên: **1.750.000đ/răng**
  - Nhổ răng khôn mọc lệch / ngầm Piezotome hàm dưới: **3.500.000đ/răng**
- **Quy trình an toàn:** Chụp X-quang Panorama / CT 3D xác định vị trí dây thần kinh trước khi thực hiện

**Chăm sóc sau nhổ răng:**
- Cắn gạc 30–60 phút, chườm đá bên ngoài má
- Uống thuốc theo đơn của bác sĩ

💬 Bạn đang bị đau răng khôn mọc lệch hay hàm trên/dưới?`,
  },

  // === CẠO VÔI RĂNG ===
  {
    keywords: ['cạo vôi', 'lấy cao răng', 'vệ sinh răng', 'hôi miệng', 'chảy máu chân răng', 'viêm nướu', 'vôi răng'],
    reply: `**🦷 Dịch Vụ Lấy Cao Răng & Vệ Sinh Nâng Cao:**

- **Tác dụng:** Loại bỏ sạch vôi răng và mảng bám vi khuẩn, điều trị dứt điểm hôi miệng và viêm nướu
- **Công nghệ:** Sóng siêu âm êm ái — Sạch sâu không ê buốt men răng
- **Chi phí niêm yết:** **300.000đ** *(Miễn phí 100% cho lần đầu đặt lịch online!)*
- **Khuyên dùng:** Định kỳ 6 tháng/lần

💡 Đặt lịch khám online ngay hôm nay để nhận ưu đãi lấy cao răng miễn phí 100%!`,
  },

  // === TRÁM RĂNG ===
  {
    keywords: ['trám răng', 'sâu răng', 'lỗ sâu', 'mẻ răng', 'vỡ răng', 'nứt răng'],
    reply: `**🛠️ Dịch Vụ Trám Răng Thẩm Mỹ Composite:**

- **Ưu điểm:** Phục hồi hình dáng và màu sắc răng tự nhiên, trùng màu răng thật, độ bền cao
- **Chi phí niêm yết:** **450.000đ/răng**
- **Thời gian:** Nhanh chóng chỉ **25 phút/răng**

**Dấu hiệu cần trám răng ngay:**
- Ê buốt khi ăn đồ lạnh, nóng, ngọt
- Thấy lỗ sâu sẫm màu hoặc vết mẻ răng

⚠️ Nên trám sớm khi lỗ sâu còn nhỏ để tránh vi khuẩn ăn vào tủy răng!`,
  },

  // === BỌC RĂNG SỨ / VENEER ===
  {
    keywords: ['bọc răng sứ', 'răng sứ', 'veneer', 'dán sứ', 'mão răng', 'zirconia', 'e-max', 'cercon', 'răng thưa dán sứ'],
    reply: `**👑 Dịch Vụ Bọc Răng Sức Cercon HT & Phục Hình Thẩm Mỹ (BS CKI Mai Lan phụ trách):**

- **Bọc Răng Sứ Cercon HT toàn sứ:** Phục hồi răng vỡ lớn, sứt mẻ, chữa tủy hoặc răng ố màu — **5.000.000đ/răng** (Bảo hành 10 năm)
- **Công nghệ:** Phục hình CAD/CAM nguyên khối tự nhiên, trùng khớp nụ cười theo thiết kế Digital Smile Design (DSD)

👉 Thực hiện bởi **BS CKI Mai Lan** (Trưởng bộ phận Phục hình Thẩm mỹ — 8 năm kinh nghiệm)!`,
  },

  // === ĐIỀU TRỊ TỦY ===
  {
    keywords: ['tủy răng', 'viêm tủy', 'điều trị tủy', 'đau tủy', 'chữa tủy', 'răng ê buốt nhiều', 'đau buốt răng'],
    reply: `**🏥 Dịch Vụ Điều Trị Tủy Răng Nội Nha (ThS. BS Lê Minh phụ trách):**

- **Khi nào cần chữa tủy?** Răng đau buốt dữ dội, đau về đêm, sưng lợi hoặc ê buốt kéo dài
- **Công nghệ:** Máy điều trị tủy nội nha định vị chóp vi phẫu dưới kính hiển vi — Triệt tiêu tận gốc vi khuẩn, không đau
- **Chi phí niêm yết:** **1.200.000đ/răng**

👉 Trực tiếp **ThS. BS Lê Minh** (Trưởng khoa Bảo tồn & Vi phẫu răng — 12 năm kinh nghiệm) thực hiện!`,
  },

  // === RĂNG TRẺ EM ===
  {
    keywords: ['răng trẻ em', 'trẻ em', 'răng sữa', 'trẻ nhỏ', 'bé bị sâu răng', 'mấy tuổi khám răng', 'trẻ sợ nha sĩ', 'trẻ mọc răng'],
    reply: `**👶 Nha Khoa Trẻ Em Tại GoodSmile (Pediatric Dentistry):**

**Khi nào nên đưa trẻ đi khám lần đầu?**
→ Ngay khi chiếc răng đầu tiên mọc, hoặc **trước sinh nhật 1 tuổi**.

**Các dịch vụ cho trẻ:**
- 🦷 Khám và tư vấn sức khỏe răng miệng
- Trám răng sữa bị sâu bằng vật liệu an toàn cho trẻ
- Nhổ răng sữa lung lay đúng thời điểm
- Bôi Fluor phòng ngừa sâu răng
- Trám bít hố rãnh (phòng ngừa sâu răng hiệu quả 90%)

**Mẹo chăm sóc răng cho trẻ:**
- Không cho trẻ ngủ với bình sữa — Gây sâu răng sữa nghiêm trọng
- Dùng kem đánh răng có Fluor từ khi răng đầu tiên mọc (lượng nhỏ như hạt gạo)
- Khám răng định kỳ mỗi 6 tháng

💡 GoodSmile có phòng khám riêng cho trẻ em với không gian vui vẻ, thân thiện!`,
  },

  // === BỆNH NƯỚU / NHA CHU ===
  {
    keywords: ['nha chu', 'bệnh nướu', 'tụt nướu', 'viêm nha chu', 'chảy máu nướu', 'nướu sưng', 'ghép nướu', 'răng lung lay'],
    reply: `**🏥 Điều Trị Bệnh Nha Chu (Nướu Răng) Tại GoodSmile:**

**Các mức độ bệnh nha chu:**
1. **Viêm nướu (nhẹ):** Nướu đỏ, sưng, chảy máu khi đánh răng → Điều trị bằng cạo vôi răng
2. **Viêm nha chu (vừa):** Tụt nướu, lộ chân răng, hơi thở hôi → Cạo vôi dưới nướu
3. **Viêm nha chu nặng:** Răng lung lay, túi nướu sâu → Cần phẫu thuật nha chu

**Dấu hiệu cảnh báo cần gặp bác sĩ ngay:**
- Nướu chảy máu thường xuyên kể cả khi không đánh răng
- Nướu tụt, lộ chân răng
- Răng lung lay hoặc thay đổi vị trí
- Hôi miệng liên tục không dứt

⚠️ Bệnh nha chu là nguyên nhân hàng đầu gây mất răng ở người trưởng thành. Đừng bỏ qua!`,
  },

  // === HÀM GIẢ / PHỤC HÌNH ===
  {
    keywords: ['hàm giả', 'hàm tháo lắp', 'cầu răng', 'mất nhiều răng', 'phục hình răng', 'răng giả tháo lắp'],
    reply: `**🦷 Dịch Vụ Phục Hình Răng Tại GoodSmile:**

**Hàm Tháo Lắp (Removable Denture):**
- Phù hợp người mất nhiều răng hoặc mất toàn bộ răng
- Loại nhựa acrylic thông thường: từ **3.000.000đ/hàm**
- Loại khung kim loại (bền hơn): từ **5.000.000đ/hàm**
- Thời gian làm: 1–2 tuần

**Cầu Răng Sứ Cố Định (Fixed Bridge):**
- Dùng khi mất 1–2 răng, mài 2 răng bên cạnh làm trụ đỡ
- Vật liệu: Sứ Zirconia – bền đẹp như răng thật
- Chi phí: Từ **4.000.000đ/đơn vị răng**
- Không cần phẫu thuật, thực hiện trong 2 lần hẹn

**So sánh với Implant:**
- Cầu răng: Rẻ hơn, nhanh hơn, nhưng phải mài răng lành
- Implant: Đắt hơn nhưng không ảnh hưởng răng kề, bền lâu dài hơn

👉 Bác sĩ GoodSmile sẽ tư vấn phương án phù hợp nhất với tình trạng và ngân sách của bạn!`,
  },

  // === THIẾT KẾ NỤ CƯỜI / THẨM MỸ TOÀN DIỆN ===
  {
    keywords: ['thiết kế nụ cười', 'smile design', 'thẩm mỹ răng', 'nụ cười đẹp', 'làm đẹp răng', 'nha khoa thẩm mỹ', 'cải thiện nụ cười'],
    reply: `**💫 Dịch Vụ Thiết Kế Nụ Cười Toàn Diện (Digital Smile Design):**

GoodSmile áp dụng công nghệ **Digital Smile Design (DSD)** — Thiết kế nụ cười hoàn hảo bằng phần mềm 3D trước khi thực hiện.

**Các bước thực hiện:**
1. **Phân tích khuôn mặt & chụp ảnh kỹ thuật số**
2. **Thiết kế nụ cười trên phần mềm 3D** — Bạn thấy kết quả trước
3. **Trao đổi và điều chỉnh** theo ý muốn
4. **Thực hiện điều trị** theo thiết kế đã duyệt

**Có thể kết hợp nhiều dịch vụ:**
- Dán sứ Veneer (thay đổi hình dáng, màu sắc)
- Tẩy trắng răng Laser
- Niềng răng chỉnh hàm
- Bọc răng sứ Zirconia

✨ Mỗi nụ cười là độc nhất — GoodSmile cam kết cho bạn nụ cười TỰ NHIÊN và PHÙ HỢP nhất với khuôn mặt của bạn!`,
  },

  // === XỬ LÝ KHẨN CẤP / ĐAU RĂNG CẤP ===
  {
    keywords: ['đau răng dữ dội', 'sưng mặt', 'sưng má', 'áp xe răng', 'đau không ngủ được', 'đau cấp', 'cấp cứu răng', 'khẩn cấp'],
    reply: `**🚨 Xử Lý Tình Huống Đau Răng Khẩn Cấp:**

⚠️ **Triệu chứng cần đến gặp bác sĩ NGAY:**
- Sưng mặt/má lan rộng (có thể là áp xe răng)
- Đau dữ dội liên tục không thể ngủ
- Sốt kèm theo đau răng
- Sưng nướu có mủ

**Trong khi chờ gặp bác sĩ:**
- Uống thuốc giảm đau Paracetamol (Panadol) theo hướng dẫn
- Súc miệng nước muối ấm 3–4 lần/ngày
- Không chườm nóng — Chỉ chườm lạnh bên ngoài má
- Tránh thức ăn quá nóng, lạnh, cứng

📞 **Hotline GoodSmile: 1800-SMILE (1800-76453)**
- Hỗ trợ tư vấn và đặt lịch khẩn cấp 7:00 – 20:00 mỗi ngày
- Ưu tiên tiếp nhận ca đau cấp không cần chờ đợi lâu

💊 Áp xe răng là tình trạng NGUY HIỂM — Không tự điều trị tại nhà, hãy gặp bác sĩ ngay!`,
  },

  // === CHẾ ĐỘ ĂN UỐNG & RĂNG ===
  {
    keywords: ['ăn gì tốt cho răng', 'thức ăn hại răng', 'đồ uống hại răng', 'cà phê hại răng', 'đường hại răng', 'dinh dưỡng răng'],
    reply: `**🥗 Chế Độ Ăn Uống Bảo Vệ Răng:**

**✅ Thực phẩm TỐT cho răng:**
- 🥛 Sữa, phô mai, sữa chua — Cung cấp Canxi tăng cường men răng
- 🥦 Rau xanh, cần tây — Kích thích tiết nước bọt tự làm sạch răng
- 🍎 Táo, cà rốt — Chà sạch mảng bám tự nhiên
- 🐟 Cá hồi, cá thu — Giàu Vitamin D hấp thu Canxi tốt hơn
- 🟢 Trà xanh — Chứa Catechin kháng khuẩn tự nhiên

**❌ Thực phẩm CẦN HẠN CHẾ:**
- 🍬 Kẹo ngọt, bánh kẹo — Vi khuẩn ăn đường tạo axit phá men răng
- ☕ Cà phê, trà đen — Gây ố vàng răng theo thời gian
- 🥤 Nước ngọt có ga — Axit Phosphoric ăn mòn men răng
- 🍋 Trái cây chua (chanh, cam) — Uống bằng ống hút để giảm tiếp xúc với răng
- 🍷 Rượu vang đỏ — Gây ố màu và khô miệng

💡 Sau khi ăn đồ ngọt/chua, hãy súc miệng nước lọc ngay — Đừng đánh răng ngay trong vòng 30 phút!`,
  },

  // === CHĂM SÓC SAU ĐIỀU TRỊ ===
  {
    keywords: ['sau điều trị', 'sau nhổ răng', 'sau niềng răng', 'sau tẩy trắng', 'sau implant', 'chăm sóc sau', 'ăn gì sau', 'kiêng gì sau'],
    reply: `**📋 Hướng Dẫn Chăm Sóc Sau Các Điều Trị Nha Khoa:**

**Sau nhổ răng / răng khôn:**
- Cắn gạc 30–60 phút, không nhổ nước bọt, không dùng ống hút
- Chườm đá bên ngoài 15 phút/lần trong 24 giờ đầu
- Ăn thức ăn mềm lỏng, tránh nóng và cứng trong 3–5 ngày
- Không hút thuốc ít nhất 72 giờ

**Sau tẩy trắng răng:**
- Tránh thực phẩm/đồ uống có màu: Cà phê, trà, nước ngọt trong 48 giờ
- Không hút thuốc lá
- Dùng kem đánh răng dành cho răng nhạy cảm nếu ê buốt

**Sau niềng răng (tháo mắc cài):**
- **BẮT BUỘC** đeo hàm duy trì (retainer) theo chỉ dẫn — Không đeo sẽ bị tái phát
- Tránh ăn đồ cứng giòn trong thời gian đeo mắc cài

**Sau cấy Implant:**
- Không chạm vào vùng phẫu thuật bằng lưỡi hoặc tay
- Ăn thức ăn mềm trong 2 tuần đầu
- Chải răng nhẹ nhàng, tránh vùng implant trong giai đoạn lành thương

💡 GoodSmile luôn gửi tài liệu chăm sóc sau điều trị qua Zalo/email cho bạn!`,
  },

  // === BẢNG GIÁ ===
  {
    keywords: ['bảng giá', 'giá dịch vụ', 'chi phí', 'bao nhiêu tiền', 'giá', 'phí', 'tốn bao nhiêu'],
    reply: `**💰 Bảng Giá Niêm Yết Dịch Vụ Nha Khoa GoodSmile:**

| Dịch vụ | Giá niêm yết | Ưu đãi online / Ghi chú |
|---|---|---|
| 🔍 Khám & Lập kế hoạch điều trị | 100.000đ | **Miễn phí 100%** lần đầu online |
| 📸 Chụp X-quang Panorama toàn hàm | 150.000đ | **Miễn phí 100%** lần đầu online |
| 🖼️ Chụp phim CT ConeBeam 3D | 500.000đ | **Miễn phí 100%** lần đầu online |
| 🦷 Cạo vôi răng & Vệ sinh nâng cao | 300.000đ | **Miễn phí 100%** lần đầu online |
| 🛠️ Trám răng composite thẩm mỹ | 450.000đ/răng | Độ bền cao, trùng màu răng |
| ✨ Tẩy trắng Laser Whitening | 2.500.000đ | **1.750.000đ** *(Giảm 30% online)* |
| 🔧 Nhổ răng khôn hàm trên | 1.750.000đ/răng | Nhẹ nhàng, không đau |
| ⚡ Nhổ răng khôn Piezotome hàm dưới | 3.500.000đ/răng | Siêu âm Piezotome lành nhanh |
| 🏥 Điều trị tủy răng nội nha | 1.200.000đ/răng | Định vị chóp vi phẫu |
| 👑 Bọc răng sứ Cercon HT | 5.000.000đ/răng | Toàn sứ cao cấp BH 10 năm |
| 🌱 Cấy ghép Implant Dentium (Hàn Quốc) | 15.000.000đ/răng | Đã bao gồm trụ & khớp nối |
| 🏆 Cấy ghép Implant Straumann (Thụy Sĩ) | 25.000.000đ/răng | Trụ cao cấp nhất thế giới |
| 📐 Niềng mắc cài kim loại tự buộc | 30.000.000đ | **Trả góp 0%** từ 1.000.000đ/tháng |
| 💎 Niềng trong suốt Invisalign | 80.000.000đ | Diamond Provider trực tiếp điều trị |
| 💎 Gắn đá kim cương thẩm mỹ | 500.000đ/viên | Kim cương nha khoa chính hãng |
| 🩹 Cắt chóp răng & Bơm rửa tủy | 3.000.000đ | Vi phẫu bảo tồn răng thật |

✅ *Bác sĩ báo giá chính xác sau khi khám — Cam kết 100% không phát sinh chi phí phụ!*`,
  },

  // === ĐẶT LỊCH / THÔNG TIN ===
  {
    keywords: ['đặt lịch', 'hẹn khám', 'đăng ký', 'giờ làm việc', 'địa chỉ', 'mấy giờ', 'hotline', 'liên hệ', 'gọi điện'],
    reply: `**📅 Thông Tin Đặt Lịch & Liên Hệ GoodSmile:**

- ⏰ **Giờ làm việc:** 7:00 – 20:00 | Thứ 2 – Chủ Nhật | **Làm cả ngày lễ Tết**
- 📞 **Hotline:** 1800-SMILE (1800-76453) — *Miễn phí cước gọi*
- 💻 **Đặt lịch online:** Nhấp nút **"Đặt lịch khám"** trên trang chủ — Chọn bác sĩ & giờ trong 30 giây!

**Lợi ích khi đặt lịch online:**
- ✅ Khám & Chụp X-Quang 3D **miễn phí** lần đầu
- ✅ Cạo vôi răng **miễn phí 100%** lần đầu
- ✅ Không phải chờ lâu — Ưu tiên phục vụ theo giờ đặt trước
- ✅ Nhắc lịch tự động qua Zalo/SMS

👉 Bạn muốn tôi hỗ trợ đặt lịch ngay bây giờ không?`,
  },

  // === TRẢ GÓP / ƯU ĐÃI ===
  {
    keywords: ['trả góp', 'góp', '0% lãi suất', 'ưu đãi', 'giảm giá', 'khuyến mãi', 'miễn phí', 'mã giảm giá'],
    reply: `**🎁 Ưu Đãi & Chính Sách Trả Góp Tại GoodSmile:**

**💳 Trả Góp 0% Lãi Suất:**
- Áp dụng cho dịch vụ từ **5.000.000đ** trở lên
- Trả góp qua thẻ tín dụng các ngân hàng hợp tác (Visa, Mastercard, JCB)
- Tối thiểu chỉ **1.000.000đ/tháng** cho niềng răng

**🎀 Ưu Đãi Hiện Tại:**
- ✅ Khám & Chụp X-Quang 3D: **Miễn phí** (mọi bệnh nhân)
- ✅ Cạo vôi răng: **Miễn phí 100%** lần đầu đặt online
- ✅ Tẩy trắng Laser: Giảm **30%** khi đăng ký trực tuyến (còn 1.750.000đ)
- ✅ Implant tháng này: **Tặng kèm mão sứ trị giá 5.000.000đ**

📱 Đặt lịch qua website hoặc gọi **1800-SMILE** và đề cập ưu đãi.`,
  },

  // === CHĂM SÓC HÀNG NGÀY ===
  {
    keywords: ['đánh răng', 'chỉ nha khoa', 'nước súc miệng', 'bàn chải', 'kem đánh răng', 'chăm sóc răng', 'vệ sinh răng miệng', 'fluor'],
    reply: `**🪥 Hướng Dẫn Chăm Sóc Răng Miệng Đúng Cách:**

**Đánh răng đúng kỹ thuật:**
- Đánh ít nhất **2 lần/ngày** (sáng và tối trước khi ngủ)
- Mỗi lần **2 phút** theo kỹ thuật Bass (chải 45° so với nướu, chuyển động tròn nhỏ)
- Dùng bàn chải **lông mềm** — Không chải quá mạnh gây tụt nướu

**Dùng chỉ nha khoa:**
- **Dùng mỗi tối** trước khi đánh răng
- Nhét chỉ vào kẽ răng, kéo nhẹ theo hình chữ C để làm sạch mảng bám

**Nước súc miệng:**
- Chọn loại có Fluor hoặc kháng khuẩn Chlorhexidine (nếu viêm nướu)
- Súc sau khi đánh răng, **không súc lại bằng nước lã**

💡 Nhớ **thay bàn chải 3 tháng/lần** hoặc khi lông bàn chải bị xòe ra!`,
  },

  // === BÁC SĨ CHUNG ===
  {
    keywords: ['bác sĩ', 'bác sỹ', 'nha sĩ', 'đội ngũ bác sĩ', 'bác sĩ giỏi', 'bác sĩ nào', 'chọn bác sĩ', 'kinh nghiệm bác sĩ'],
    reply: `**👨‍⚕️ Đội Ngũ Bác Sĩ Chuyên Khoa Chính Thức Tại GoodSmile:**

GoodSmile quy tụ 4 bác sĩ chuyên khoa hàng đầu, làm việc cố định tại các phòng khám:

1. 🩺 **ThS. BS Lê Minh (D-01)** — *Trưởng khoa Bảo tồn & Vi Phẫu răng (Phòng 102)*
   - **Kinh nghiệm:** 12 năm | 8.500+ ca thành công
   - **Chuyên sâu:** Vi phẫu điều trị tủy dưới kính hiển vi, tái tạo bảo tồn răng thật.

2. 🦷 **BS CKII Hoàng Nam (D-02)** — *Giám đốc Phẫu thuật Hàm Mặt & Implant (Phòng 105)*
   - **Kinh nghiệm:** 15 năm | 5.200+ ca cấy ghép Implant
   - **Chuyên sâu:** Implant Straumann/Dentium, All-on-4, nhổ răng khôn sóng siêu âm Piezotome.

3. ✨ **BS CKI Mai Lan (D-03)** — *Trưởng bộ phận Phục Hình Thẩm Mỹ (Phòng 108)*
   - **Kinh nghiệm:** 8 năm | 4.100+ ca thẩm mỹ
   - **Chuyên sâu:** Dán sứ Veneer Emax siêu mỏng, bọc răng sứ Cercon HT, Digital Smile Design.

4. 📐 **ThS. BS Nguyễn Hương (D-04)** — *Cố vấn Chỉnh Nha & Chỉnh Hình Răng Mặt (Phòng 110)*
   - **Kinh nghiệm:** 10 năm | 6.300+ ca chỉnh nha | **Diamond Invisalign Provider**
   - **Chuyên sâu:** Niềng trong suốt Invisalign, niềng mắc cài kim loại tự buộc, niềng trẻ em.

👉 Khi đặt lịch online, bạn có thể chọn đích danh bác sĩ phụ trách cho mình!`,
  },

  // === CHI TIẾT BÁC SĨ LÊ MINH ===
  {
    keywords: ['bác sĩ lê minh', 'bs lê minh', 'lê minh', 'bác sĩ minh', 'vi phẫu', 'điều trị tủy'],
    reply: `**🩺 Thạc sĩ - Bác sĩ Lê Minh (Mã BS: D-01):**

- 🏥 **Chức vụ:** Trưởng khoa Bảo tồn & Vi Phẫu răng tại GoodSmile (Phòng 102)
- 🎓 **Trình độ:** Thạc sĩ Răng Hàm Mặt (ĐH Y Dược TP.HCM), Tu nghiệp Nội nha chuyên sâu tại ĐH Pennsylvania (Mỹ).
- ⏱️ **Kinh nghiệm:** 12 năm kinh nghiệm thực tiễn | **8.500+ ca** bảo tồn răng thành công.
- 💡 **Thế mạnh:** 
  - Điều trị tủy răng phức tạp dưới kính hiển vi
  - Vi phẫu cuống răng và tái tạo vùng tổn thương
  - Tái tạo răng thẩm mỹ sau chữa tủy
- 💬 **Tâm niệm:** *"Bảo tồn răng thật của bệnh nhân là sứ mệnh tối cao của bác sĩ nha khoa y đức."*`,
  },

  // === CHI TIẾT BÁC SĨ HOÀNG NAM ===
  {
    keywords: ['bác sĩ hoàng nam', 'bs hoàng nam', 'hoàng nam', 'bác sĩ nam', 'implant', 'trồng răng'],
    reply: `**🦷 Bác sĩ Chuyên Khoa II Hoàng Nam (Mã BS: D-02):**

- 🏥 **Chức vụ:** Giám đốc Phẫu thuật Hàm Mặt & Cấy ghép Implant tại GoodSmile (Phòng 105)
- 🎓 **Trình độ:** BS CKII Phẫu thuật Hàm Mặt (ĐH Y Hà Nội), Tu nghiệp Implant tại ĐH Bordeaux (Pháp), ITI Fellow (Thụy Sĩ).
- ⏱️ **Kinh nghiệm:** 15 năm kinh nghiệm | **5.200+ ca** cấy ghép Implant thành công.
- 💡 **Thế mạnh:**
  - Trồng răng Implant Straumann (Thụy Sĩ) & Dentium (Hàn Quốc)
  - Phẫu thuật cấy ghép All-on-4 / All-on-6 cho người mất răng toàn hàm
  - Nhổ răng khôn ngầm bằng máy sóng siêu âm Piezotome không đau
- 💬 **Tâm niệm:** *"Một ca phẫu thuật thành công dựa trên kỹ thuật chính xác và sự an tâm của bệnh nhân."*`,
  },

  // === CHI TIẾT BÁC SĨ MAI LAN ===
  {
    keywords: ['bác sĩ mai lan', 'bs mai lan', 'mai lan', 'bác sĩ lan', 'bọc sứ', 'dán sứ', 'veneer', 'smile design'],
    reply: `**✨ Bác sĩ Chuyên Khoa I Mai Lan (Mã BS: D-03):**

- 🏥 **Chức vụ:** Trưởng bộ phận Phục Hình Thẩm Mỹ & Thiết kế nụ cười tại GoodSmile (Phòng 108)
- 🎓 **Trình độ:** BS CKI Răng Hàm Mặt, Tốt nghiệp Hiệp hội Nha khoa Thẩm mỹ Châu Á (AACD), DSD Master Tokyo.
- ⏱️ **Kinh nghiệm:** 8 năm kinh nghiệm | **4.100+ ca** phục hình nụ cười cho doanh nhân & nghệ sĩ.
- 💡 **Thế mạnh:**
  - Dán sứ Veneer Emax siêu mỏng hạn chế mài răng tối đa
  - Bọc răng sứ Cercon HT nguyên khối tự nhiên
  - Thiết kế nụ cười toàn diện Digital Smile Design (DSD) chuẩn tỷ lệ vàng
- 💬 **Tâm niệm:** *"Mỗi nụ cười là một tác phẩm nghệ thuật độc bản."*`,
  },

  // === CHI TIẾT BÁC SĨ NGUYỄN HƯƠNG ===
  {
    keywords: ['bác sĩ nguyễn hương', 'bs nguyễn hương', 'nguyễn hương', 'bác sĩ hương', 'niềng răng', 'invisalign'],
    reply: `**📐 Thạc sĩ - Bác sĩ Nguyễn Hương (Mã BS: D-04):**

- 🏥 **Chức vụ:** Cố vấn Chỉnh Nha & Chỉnh hình Răng Mặt tại GoodSmile (Phòng 110)
- 🎓 **Trình độ:** Thạc sĩ Chỉnh nha ĐH Quốc gia Seoul (Hàn Quốc), Chứng chỉ Biomechanics ĐH Sydney (Úc).
- 🏆 **Danh hiệu:** Bác sĩ hạng **Diamond Provider** của Invisalign toàn cầu | Hội viên danh dự WFO.
- ⏱️ **Kinh nghiệm:** 10 năm kinh nghiệm | **6.300+ ca** niềng răng thành công.
- 💡 **Thế mạnh:**
  - Niềng răng khay trong suốt Invisalign độ khó cao
  - Niềng mắc cài kim loại tự buộc kết hợp Minivis giải quyết hô/móm nặng không phẫu thuật
  - Niềng răng chỉnh hình tăng trưởng cho trẻ em từ sớm
- 💬 **Tâm niệm:** *"Chỉnh nha là tái cấu trúc nụ cười và cải thiện chất lượng sống của bệnh nhân."*`,
  },

  // === VỊ TRÍ PHÒNG KHÁM ===
  {
    keywords: ['vị trí', 'địa chỉ phòng khám', 'ở đâu', 'cơ sở', 'chi nhánh', 'đường', 'quận', 'tìm đường', 'bản đồ', 'chỉ đường'],
    reply: `**📍 Vị Trí & Địa Chỉ Phòng Khám GoodSmile:**

GoodSmile hiện có hệ thống phòng khám hiện đại, dễ tìm và có chỗ đỗ xe rộng rãi.

**Thông tin liên hệ:**
- 📞 **Hotline:** 1800-SMILE (1800-76453) — Miễn phí cước gọi
- ⏰ **Giờ làm việc:** 7:00 – 20:00 | Thứ 2 – Chủ Nhật (kể cả ngày lễ)
- 🌐 **Website:** goodsmile.vn để xem bản đồ & chỉ đường chi tiết

**Tiện ích tại phòng khám:**
- 🚗 Bãi giữ xe ô tô & xe máy miễn phí
- ☕ Khu vực chờ tiện nghi, wifi, nước uống
- 👶 Góc vui chơi cho trẻ em
- ♿ Lối đi dành cho người khuyết tật

💡 Bạn có thể xem **bản đồ Google Maps** chi tiết và chỉ đường trực tiếp từ trang chủ của GoodSmile nhé!`,
  },

  // === HƯỚNG DẪN ĐẶT LỊCH ===
  {
    keywords: ['hướng dẫn đặt lịch', 'cách đặt lịch', 'đặt lịch như thế nào', 'đặt lịch online', 'đặt lịch qua app', 'đặt hẹn', 'book lịch'],
    reply: `**📅 Cách Đặt Lịch Khám Tại GoodSmile:**

**Đặt lịch online (nhanh nhất):**
1. Vào trang chủ → nhấn **"Đặt lịch khám"**
2. Chọn **Dịch vụ** cần khám
3. Chọn **Bác sĩ** (xem hồ sơ bác sĩ trước)
4. Chọn **Ngày & Khung giờ** trống
5. Nhập **Họ tên & Số điện thoại**
6. Nhận mã **OTP xác thực** qua SMS → Nhập OTP → Xác nhận
7. Nhận tin nhắn xác nhận lịch hẹn qua Zalo/SMS

**Đặt qua điện thoại:**
- Gọi **1800-SMILE (1800-76453)** — Hỗ trợ 7:00–20:00 hàng ngày

**Lưu ý:** Nếu khung giờ vừa có người khác đặt, hệ thống báo lỗi và yêu cầu chọn giờ khác.

✅ Đặt online lần đầu: **Khám & X-Quang 3D miễn phí** + **Cạo vôi răng miễn phí**!`,
  },

  // === HỦY LỊCH ===
  {
    keywords: ['hủy lịch', 'đổi lịch', 'dời lịch', 'thay đổi lịch hẹn', 'không đến được', 'hủy hẹn', 'reschedule'],
    reply: `**🔄 Hướng Dẫn Hủy / Đổi Lịch Hẹn Tại GoodSmile:**

**Cách hủy / đổi lịch nhanh:**

**1. Qua tài khoản GoodSmile (nếu đã đăng nhập):**
- Vào **Cổng bệnh nhân** → Tab **"Lịch hẹn của tôi"**
- Chọn lịch hẹn cần thay đổi → Nhấn **"Hủy"** hoặc **"Đổi lịch"**
- Chọn thời gian mới (nếu đổi lịch) → Xác nhận

**2. Gọi hotline:**
- Gọi **1800-SMILE (1800-76453)** ít nhất **2 giờ trước giờ hẹn**
- Nhân viên sẽ hỗ trợ hủy hoặc dời lịch cho bạn ngay

**Lưu ý quan trọng:**
- ⏰ Hủy/đổi lịch ít nhất **2 giờ trước** để không ảnh hưởng đến lịch bác sĩ
- Hủy lịch đột ngột nhiều lần có thể ảnh hưởng đến ưu tiên đặt lịch sau
- Nếu có trường hợp khẩn cấp, hãy báo hotline ngay để được hỗ trợ tốt nhất

💬 Bạn cần hủy lịch hẹn nào không? Tôi có thể hướng dẫn chi tiết hơn!`,
  },

  // === QUY TRÌNH KHÁM ===
  {
    keywords: ['quy trình khám', 'khám như thế nào', 'đến khám', 'buổi khám', 'khám lần đầu', 'lần đầu đến khám', 'check up', 'khám tổng quát'],
    reply: `**🩺 Quy Trình Khám Răng Tại GoodSmile:**

**Bước 1: Tiếp nhận & Đăng ký (5 phút)**
- Đến quầy lễ tân, xuất trình thông tin đặt lịch (tên, SĐT)
- Điền phiếu thông tin sức khỏe tổng quát (lần đầu)
- Nhận số thứ tự và ngồi chờ tại khu vực tiện nghi

**Bước 2: Khám tổng quát & Chụp X-Quang (10–15 phút)**
- Bác sĩ khám toàn bộ hàm răng bằng dụng cụ chuyên dụng
- Chụp phim X-Quang Panorama (toàn cảnh) hoặc CT Cone Beam 3D nếu cần
- Hoàn toàn **miễn phí** cho lần đầu đến GoodSmile

**Bước 3: Tư vấn & Lập kế hoạch điều trị (15–20 phút)**
- Bác sĩ phân tích kết quả X-Quang, giải thích tình trạng răng miệng
- Đưa ra phác đồ điều trị chi tiết với **chi phí rõ ràng từng hạng mục**
- Bạn có quyền hỏi, thảo luận và quyết định trước khi bắt đầu

**Bước 4: Điều trị (tùy dịch vụ)**
- Thực hiện điều trị theo đúng kế hoạch đã thống nhất
- Bác sĩ giải thích từng bước trong quá trình điều trị

✅ GoodSmile cam kết **không có chi phí phát sinh** ngoài báo giá ban đầu!`,
  },

  // === QUY TRÌNH TOÀN BỘ: ĐẶT LỊCH → THANH TOÁN ===
  {
    keywords: ['quy trình từ đặt lịch', 'quy trình tổng thể', 'từ đặt lịch đến thanh toán', 'toàn bộ quy trình', 'các bước khám', 'flow khám chữa'],
    reply: `**🗺️ Quy Trình Đầy Đủ Tại GoodSmile:**

**📱 Bước 1 — Đặt lịch online**
Chọn dịch vụ → Chọn bác sĩ → Chọn khung giờ trống → Nhập họ tên + SĐT → Xác thực **OTP** → Nhận SMS/Zalo xác nhận lịch hẹn.

**🏥 Bước 2 — Đến phòng khám**
Lễ tân check-in → Bệnh nhân vào hàng chờ (trạng thái: **Waiting**).

**🔍 Bước 3 — Bác sĩ khám & điều trị**
Bác sĩ gọi vào ghế → trạng thái: **InChair** → Khám tổng quát + chụp X-Quang (miễn phí lần đầu) → Tư vấn & báo giá chi tiết → Điều trị theo kế hoạch đã thống nhất.

**✅ Bước 4 — Hoàn tất khám**
Bác sĩ lưu bệnh án + dịch vụ thực hiện → trạng thái: **Completed** → **Hệ thống tự động tạo hóa đơn**.

**💳 Bước 5 — Thanh toán**
Ra quầy thu ngân → Chọn: **Tiền mặt / Ví GoodSmile / Chuyển khoản VietQR / VNPay** → Nhận phiếu bảo hành (nếu có).

**📊 Bước 6 — Theo dõi sau điều trị**
Đăng nhập tài khoản → Xem lịch sử điều trị, bệnh án, hóa đơn trong **Cổng bệnh nhân**.

💡 Toàn bộ quy trình **minh bạch chi phí** — cam kết không phát sinh ngoài báo giá ban đầu!`,
  },


  // === THANH TOÁN ===
  {
    keywords: ['thanh toán', 'hình thức thanh toán', 'trả tiền', 'chuyển khoản', 'tiền mặt', 'ví goodsmile', 'vietqr', 'vnpay', 'hóa đơn', 'nạp ví'],
    reply: `**💳 Thanh Toán Tại GoodSmile:**

Hóa đơn được tạo **tự động** sau khi bác sĩ hoàn tất khám. Bệnh nhân ra quầy thu ngân chọn 1 trong 3 hình thức:

- 💵 **Tiền mặt** — Trả trực tiếp tại quầy
- 💰 **Ví GoodSmile** — Trừ số dư trong tài khoản (nhanh, không cần quét QR)
- 📱 **Chuyển khoản VietQR** — Quét mã QR ngân hàng, thanh toán online ngay tại chỗ
- 🏧 **Cổng VNPay** — Thanh toán qua QR VNPay, ATM Napas, thẻ Visa/Mastercard

**Nạp tiền Ví GoodSmile:**
Đăng nhập → Mục **"Ví của tôi"** → Chọn số tiền → Quét QR VietQR → Số dư cập nhật ngay.

**Trả góp 0% lãi suất:**
Áp dụng cho dịch vụ từ **5.000.000đ** trở lên qua thẻ tín dụng (liên hệ lễ tân hỗ trợ).

💡 Muốn thanh toán nhanh mọi lần? Nạp sẵn tiền vào Ví GoodSmile — chỉ cần một click!`,
  },

  // === HỒ SƠ BỆNH ÁN ===
  {
    keywords: ['hồ sơ bệnh án', 'bệnh án', 'lịch sử khám', 'lịch sử điều trị', 'kết quả khám', 'xem bệnh án', 'hồ sơ sức khỏe', 'phim x-quang cũ', 'đơn thuốc'],
    reply: `**📁 Hồ Sơ Bệnh Án & Lịch Sử Điều Trị Tại GoodSmile:**

**Bệnh án điện tử tại GoodSmile bao gồm:**
- 📋 **Thông tin khám** — Ngày khám, bác sĩ phụ trách, tình trạng ban đầu
- 🦷 **Sơ đồ răng (Dental Chart)** — Ghi nhận tình trạng từng chiếc răng theo chuẩn ISO FDI
- 🔍 **Phim X-Quang** — Lưu trữ toàn bộ ảnh X-Quang Panorama và CT Cone Beam 3D
- 💊 **Đơn thuốc** — Danh sách thuốc được kê sau điều trị
- 📐 **Phác đồ điều trị** — Kế hoạch điều trị nhiều buổi (nếu có)
- 💰 **Lịch sử hóa đơn** — Toàn bộ chi phí và thanh toán từng lần

**Cách xem hồ sơ bệnh án:**
1. **Đăng nhập** vào tài khoản GoodSmile trên website
2. Vào **Cổng bệnh nhân** → Tab **"Hồ sơ bệnh án"**
3. Xem chi tiết từng lần khám, tải phim X-Quang, đơn thuốc

**Chia sẻ hồ sơ:**
- Bệnh nhân có thể yêu cầu in hoặc xuất file PDF hồ sơ bệnh án
- Bảo mật tuyệt đối — Chỉ bệnh nhân và bác sĩ phụ trách mới được xem

🔒 GoodSmile cam kết **bảo mật 100%** thông tin bệnh án theo quy định của Bộ Y tế!`,
  },

  // === CHỨC NĂNG KHI ĐĂNG NHẬP ===
  {
    keywords: ['đăng nhập', 'tài khoản', 'chức năng tài khoản', 'đăng ký tài khoản', 'cổng bệnh nhân', 'tạo tài khoản', 'login', 'quên mật khẩu', 'tính năng sau đăng nhập'],
    reply: `**🔐 Tài Khoản Bệnh Nhân GoodSmile:**

**Đăng ký:**
Nhấn **"Đăng ký"** trên trang chủ → Nhập họ tên + SĐT + mật khẩu → Xác thực **OTP** qua SMS → Hoàn tất!

**Đăng nhập:** Bằng SĐT và mật khẩu.
**Quên mật khẩu:** Nhập SĐT → Nhận OTP → Đặt mật khẩu mới.

**Sau khi đăng nhập, bạn có thể:**
- 📅 **Quản lý lịch hẹn** — Xem, hủy, đổi lịch không cần gọi điện
- 📁 **Xem hồ sơ bệnh án** — Lịch sử điều trị, sơ đồ răng, đơn thuốc
- 💳 **Xem hóa đơn & Ví GoodSmile** — Số dư ví, lịch sử thanh toán
- 🏅 **Theo dõi hạng thành viên** — Tự động nâng hạng theo số lần khám
- 👤 **Cập nhật thông tin** — SĐT, địa chỉ, đổi mật khẩu

**Hạng thành viên (Loyalty):**
| Hạng | Điều kiện | Giảm giá |
|---|---|---|
| 🥉 Bronze | Mặc định | 0% |
| 🥈 Silver | ≥ 5 lần khám | 5% |
| 🥇 Gold | ≥ 15 lần khám | 10% |
| 💎 Platinum | ≥ 30 lần khám | 15% |

💡 Hạng được cập nhật tự động sau mỗi lần thanh toán thành công!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: ĐAU RĂNG / NHỨC TỦY ===
  {
    keywords: ['bị đau răng', 'đau nhức răng', 'đau răng buốt', 'đau răng về đêm', 'đau buốt', 'nhức răng', 'đau nhức dữ dội', 'răng bị đau'],
    reply: `**🩺 Chẩn Đoán Triệu Chứng: Đau Nhức Răng Buốt**

**Chẩn đoán y khoa khả dĩ:**
- **Viêm tủy răng** (nếu đau nhức nhói về đêm, đau tự nhiên không cần ăn uống)
- **Sâu răng nặng ăn vào ngà/tủy** (nếu đau khi ăn ngọt, nóng hoặc lạnh)
- **Áp xe chân răng** (nếu răng cắn vào bị đau, nướu dưới răng có bọc mủ)

**Dịch vụ điều trị đề xuất:**
1. 🏥 **Điều trị tủy răng nội nha** (khi tủy đã bị viêm/chết): **1.200.000đ/răng**
2. 🛠️ **Trám răng composite thẩm mỹ** (khi tủy chưa tổn thương): **450.000đ/răng**

**Bác sĩ chuyên khoa phụ trách:**
- 🩺 **ThS. BS Lê Minh** (Trưởng khoa Bảo tồn & Vi Phẫu răng — Phòng 102)

👉 Hãy gọi **Hotline 1800-SMILE** hoặc nhấn **"Đặt lịch khám"** để bác sĩ khám + chụp phim X-quang 3D **miễn phí** giúp bạn ngay!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: Ê BUỐT RĂNG ===
  {
    keywords: ['bị ê buốt', 'ê răng', 'uống nước lạnh bị buốt', 'ăn đồ chua bị ê', 'buốt răng', 'buốt chân răng', 'nhạy cảm'],
    reply: `**🧊 Chẩn Đoán Triệu Chứng: Răng Ê Buốt Nhạy Cảm**

**Chẩn đoán y khoa khả dĩ:**
- **Tụt nướu mòn cổ chân răng** (lộ lớp ngà răng nhạy cảm với nhiệt độ)
- **Mòn men răng** (do dùng bàn chải cứng hoặc ăn đồ chua axit)
- **Răng bị nứt vi mô / Sâu răng ngà**

**Dịch vụ điều trị đề xuất:**
1. 🛡️ **Bôi gel chống ê buốt chuyên dụng / Trám cổ chân răng**: **450.000đ/răng**
2. 🦷 **Cạo vôi răng & Vệ sinh nâng cao** (tránh vôi răng đẩy tụt nướu thêm): **300.000đ** *(0đ lần đầu đặt online)*

💡 Tránh chải răng quá mạnh nằm ngang, dùng bàn chải lông mềm và kem đánh răng Sensodyne/Fluor!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: CHẢY MÁU NƯỚU / HÔI MIỆNG ===
  {
    keywords: ['chảy máu chân răng', 'chảy máu nướu', 'hôi miệng', 'nướu sưng đỏ', 'đau lợi', 'vôi răng nhiều', 'sưng nướu'],
    reply: `**🩸 Chẩn Đoán Triệu Chứng: Chảy Máu Chân Răng & Hôi Miệng**

**Chẩn đoán y khoa khả dĩ:**
- **Viêm nướu (Gingivitis)** (nướu sưng đỏ, dễ chảy máu khi đánh răng)
- **Viêm nha chu (Periodontitis)** (nếu răng bắt đầu lung lay nhẹ, tụt nướu, hôi miệng dai dẳng)
- **Nguyên nhân chính:** Vôi răng (cao răng) bám dưới nướu chứa vi khuẩn độc hại gây viêm.

**Dịch vụ điều trị đề xuất:**
- 🦷 **Cạo vôi răng bằng sóng siêu âm & Vệ sinh nha chu**: **300.000đ** *(Miễn phí 100% lần đầu đặt online)*
- 💊 Bác sĩ kê nước súc miệng kháng khuẩn Chlorhexidine (nếu viêm nặng)

👉 Đặt lịch online ngay để nhận ưu đãi **Cạo vôi răng Miễn Phí 100%**!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: ĐAU RĂNG KHÔN ===
  {
    keywords: ['đau răng khôn', 'sưng má', 'sưng góc hàm', 'đau răng trong cùng', 'lợi trùm', 'răng khôn mọc lệch', 'mọc ngầm', 'không há được miệng'],
    reply: `**🔧 Chẩn Đoán Triệu Chứng: Đau Răng Khôn (Răng Số 8)**

**Chẩn đoán y khoa khả dĩ:**
- **Răng khôn mọc lệch / mọc ngầm** đâm vào răng số 7 bên cạnh
- **Viêm lợi trùm răng khôn** (thức ăn kẹt dưới vạt lợi gây sưng mủ, sốt, khó há miệng)

**Dịch vụ điều trị đề xuất:**
- ⚡ **Nhổ răng khôn bằng sóng siêu âm Piezotome**:
  - Hàm trên: **1.750.000đ/răng**
  - Hàm dưới mọc lệch/ngầm: **3.500.000đ/răng**
- 📸 **Miễn phí** Chụp phim X-quang Panorama / CT 3D kiểm tra hướng mọc và dây thần kinh

**Bác sĩ chuyên khoa phụ trách:**
- 🦷 **BS CKII Hoàng Nam** (Giám đốc Phẫu thuật Hàm Mặt — Phòng 105)

⚠️ Nên nhổ sớm răng khôn mọc lệch để tránh hỏng chiếc răng số 7 bên cạnh!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: MẤT RĂNG / RĂNG LUNG LAY ===
  {
    keywords: ['bị mất răng', 'răng lung lay', 'mất 1 răng', 'mất nhiều răng', 'trống răng', 'khó ăn nhai', 'hóp má'],
    reply: `**🏥 Chẩn Đoán Triệu Chứng: Mất Răng & Khó Ăn Nhai**

**Hậu quả y khoa nếu không phục hồi sớm:**
- Các răng bên cạnh bị **xô lệch, đổ nghiêng** vào khoảng trống
- Răng đối diện bị **trồi xuống**, biến dạng khớp cắn
- Tiêu xương hàm dẫn đến **hóp má, lão hóa sớm**

**Dịch vụ điều trị đề xuất tốt nhất:**
1. 🌱 **Cấy ghép Implant Dentium (Hàn Quốc)**: **15.000.000đ/răng** (trọn gói trụ + mão)
2. 🏆 **Cấy ghép Implant Straumann (Thụy Sĩ)**: **25.000.000đ/răng** (cao cấp trọn đời)

**Bác sĩ chuyên khoa phụ trách:**
- 🦷 **BS CKII Hoàng Nam** (Chuyên gia Implant 15 năm kinh nghiệm — Phòng 105)

👉 Đặt lịch ngay để được **Chụp phim CT 3D khảo sát xương miễn phí**!`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: RĂNG MẺ / VỠ / ĐEN RĂNG ===
  {
    keywords: ['răng bị mẻ', 'vỡ răng', 'gãy răng', 'nứt răng', 'răng bị đen', 'mòn răng'],
    reply: `**🔨 Chẩn Đoán Triệu Chứng: Răng Bị Mẻ, Vỡ Hoặc Đen**

**Chẩn đoán y khoa khả dĩ:**
- Tổn thương cơ học men/ngà răng do va đập hoặc cắn đồ cứng
- Sâu răng ngà nặng gây rỗng thân răng và đổi màu đen

**Dịch vụ điều trị đề xuất:**
- 🛠️ **Nếu mẻ/vỡ nhỏ**: **Trám răng composite thẩm mỹ** (**450.000đ/răng**) — Xong trong 25 phút.
- 👑 **Nếu vỡ lớn / chữa tủy**: **Bọc răng sứ Cercon HT toàn sứ** (**5.000.000đ/răng**) — Bảo hành 10 năm.

**Bác sĩ chuyên khoa phụ trách:**
- ✨ **BS CKI Mai Lan** (Trưởng bộ phận Phục hình Thẩm mỹ — Phòng 108)`,
  },

  // === CHẨN ĐOÁN TRIỆU CHỨNG: RĂNG HÔ, MÓM, THƯA, LỆCH ===
  {
    keywords: ['răng hô', 'răng móm', 'răng thưa', 'răng mọc chen chúc', 'khập khễnh', 'lệch khớp cắn', 'răng khập khễnh'],
    reply: `**📐 Chẩn Đoán Triệu Chứng: Răng Hô, Móm, Thưa & Lệch Khớp Cắn**

**Chẩn đoán y khoa khả dĩ:**
- Sai lệch khớp cắn cấp độ I, II, III (do di truyền hoặc thói quen xấu từ nhỏ)

**Dịch vụ điều trị đề xuất:**
1. 📐 **Niềng răng mắc cài kim loại tự buộc**: **30.000.000đ** *(Trả góp 0% từ 1tr/tháng)*
2. 💎 **Niềng khay trong suốt Invisalign**: **80.000.000đ** *(Khay vô hình, tháo lắp được)*

**Bác sĩ chuyên khoa phụ trách:**
- 📐 **ThS. BS Nguyễn Hương** (Diamond Invisalign Provider — Phòng 110)

👉 Được **quét dấu răng 3D iTero 5D & xem trước mô phỏng nụ cười miễn phí** khi đặt online!`,
  },

  // === MÁY TÍNH TRẢ GÓP 0% CHI TIẾT ===
  {
    keywords: ['tính trả góp', 'mỗi tháng bao nhiêu', 'trả góp thế nào', 'bài toán trả góp', 'trả trước bao nhiêu', 'kỳ hạn trả góp'],
    reply: `**🧮 Bảng Tính Trả Góp 0% Lãi Suất Chi Tiết Tại GoodSmile:**

Áp dụng trả góp 0% qua thẻ tín dụng ngân hàng (Visa, Mastercard, JCB) cho các gói từ **5.000.000đ** trở lên:

**1. Gói Niềng răng mắc cài kim loại (30.000.000đ):**
- Trả trước 30%: **9.000.000đ**
- Số tiền trả góp: **21.000.000đ**
- Kỳ hạn 12 tháng: **1.750.000đ/tháng** *(chỉ ~58k/ngày!)*
- Kỳ hạn 24 tháng: **875.000đ/tháng**

**2. Gói Niềng răng trong suốt Invisalign (80.000.000đ):**
- Trả trước 30%: **24.000.000đ**
- Số tiền trả góp: **56.000.000đ**
- Kỳ hạn 12 tháng: **4.666.000đ/tháng**
- Kỳ hạn 24 tháng: **2.333.000đ/tháng**

**3. Gói Trồng răng Implant Dentium (15.000.000đ/răng):**
- Kỳ hạn 6 tháng: **2.500.000đ/tháng**
- Kỳ hạn 12 tháng: **1.250.000đ/tháng**

💳 *Thủ tục hoàn tất trong 5 phút tại quầy lễ tân — Không cần chứng minh thu nhập!*`,
  },

  // === QUY TRÌNH SƠ CỨU ĐAU RĂNG TẠI NHÀ KHẨN CẤP ===
  {
    keywords: ['sơ cứu đau răng', 'đau răng tại nhà', 'giảm đau tạm thời', 'chưa đi khám được', 'làm sao bớt đau răng', 'mẹo giảm đau răng'],
    reply: `**🚨 Quy Trình 4 Bước Sơ Cứu Đau Răng Tạm Thời Tại Nhà:**

Nếu bạn đang bị đau nhức răng dữ dội mà chưa thể đến phòng khám GoodSmile ngay:

1. 🧂 **Súc miệng bằng nước muối ấm (0.9%)**: Súc nhẹ nhàng 30 giây để làm sạch vi khuẩn và dịu niêm mạc nướu.
2. 🧊 **Chườm đá lạnh bên ngoài má**: Dùng khăn mỏng bọc đá chườm lên vùng má bị đau trong 15 phút (giúp co mạch máu, giảm sưng và làm tê dây thần kinh tạm thời).
3. 🧵 **Làm sạch kẽ răng bằng chỉ nha khoa**: Nhẹ nhàng lấy sạch thức ăn thừa kẹt giữa các kẽ răng (tuyệt đối **KHÔNG dùng tăm nhọn** chọc vào lỗ sâu).
4. 💊 **Uống thuốc giảm đau tạm thời**: Uống 1 viên Paracetamol (500mg) hoặc Ibuprofen theo chỉ định của dược sĩ để cắt cơn đau.

⚠️ **LƯU Ý QUAN TRỌNG:** Đây chỉ là biện pháp tạm thời! Viêm tủy hay sâu răng không thể tự khỏi nếu không được bác sĩ làm sạch và hàn trám/chữa tủy.

📞 Gọi ngay **Hotline 1800-SMILE (1800-76453)** để bác sĩ GoodSmile xếp lịch khám gấp cho bạn!`,
  },
];

/**
 * Tìm câu trả lời từ Local Knowledge Base — khớp nhiều keyword nhất
 */
function findLocalKnowledgeReply(query: string): string | null {
  const q = query.toLowerCase().trim();
  let bestMatch: { item: KnowledgeItem; score: number } | null = null;

  for (const item of DENTAL_KNOWLEDGE_BASE) {
    const score = item.keywords.filter((kw) => q.includes(kw)).length;
    if (score > 0) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { item, score };
      }
    }
  }

  return bestMatch ? bestMatch.item.reply : null;
}

// ==========================================
// GEMINI API CONFIG
// ==========================================

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

// Endpoint streaming (Server-Sent Events)
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
// Endpoint non-streaming (fallback)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Số lượt chat lịch sử tối đa gửi lên AI
const MAX_HISTORY_TURNS = 10;

/** Xây dựng body request chung cho Gemini */
function buildGeminiBody(message: string, history: ChatMessage[]) {
  const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
  const formattedHistory = recentHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  return {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: {
      temperature: 0.75,
      topK: 40,
      topP: 0.92,
      maxOutputTokens: 1500,
      candidateCount: 1,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };
}

// ==========================================
// CHAT API — Streaming + Non-Streaming + Fallback
// ==========================================

export const chatApi = {
  /**
   * Gửi tin nhắn STREAMING đến Gemini AI.
   * Gọi onChunk(text) liên tục khi từng đoạn text đến.
   * Trả về source cuối cùng.
   *
   * Nếu Gemini không khả dụng, fallback sang Knowledge Base
   * và gọi onChunk với hiệu ứng typewriter thủ công.
   */
  streamMessage: async (
    message: string,
    history: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<ChatResponse> => {

    // 1. Thử Gemini Streaming
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        const body = buildGeminiBody(message, history);

        const response = await fetch(GEMINI_STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let fullReply = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            // Xử lý từng dòng SSE
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const chunk: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                if (chunk) {
                  fullReply += chunk;
                  onChunk(chunk);
                }
              } catch {
                // Bỏ qua JSON lỗi
              }
            }
          }

          if (fullReply.trim()) {
            return { reply: fullReply.trim(), source: 'gemini' };
          }
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`⚠️ [GoodSmile AI] Gemini stream lỗi ${response.status}:`, errText);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        console.warn('⚠️ [GoodSmile AI] Gemini stream không khả dụng, dùng fallback.', err);
      }
    }

    // 2. Fallback: Knowledge Base + typewriter effect thủ công
    const localMatch = findLocalKnowledgeReply(message);
    const fallbackReply = localMatch ?? `Dạ chào bạn! Tôi là **Trợ lý AI Nha Khoa GoodSmile** 🦷\n\nTôi có thể hỗ trợ bạn về:\n\n- 🦷 **Các dịch vụ nha khoa** (niềng răng, implant, tẩy trắng, bọc sứ...)\n- 👶 **Nha khoa trẻ em** và chăm sóc răng sữa\n- 🏥 **Bệnh lý nướu răng** và điều trị tủy\n- 📋 **Bảng giá, ưu đãi** và chính sách trả góp\n- 📅 **Đặt lịch hẹn** và thông tin phòng khám\n- 🪥 **Chăm sóc răng miệng** hàng ngày\n\nBạn muốn hỏi về điều gì, tôi sẵn sàng tư vấn ngay nhé! 😊`;

    // Typewriter effect: emit từng cụm ký tự mỗi ~18ms
    const CHUNK_SIZE = 5;
    const DELAY_MS = 18;
    for (let i = 0; i < fallbackReply.length; i += CHUNK_SIZE) {
      if (signal?.aborted) break;
      const chunk = fallbackReply.slice(i, i + CHUNK_SIZE);
      onChunk(chunk);
      await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
    }

    return { reply: fallbackReply, source: 'knowledge_base' };
  },

  /**
   * Gửi tin nhắn NON-STREAMING (dùng cho ManagerAiChat hoặc khi cần toàn bộ reply).
   */
  sendMessage: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        const body = buildGeminiBody(message, history);
        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply?.trim()) return { reply: reply.trim(), source: 'gemini' };
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ [GoodSmile AI] Gemini API lỗi ${response.status}:`, errorText);
        }
      } catch (err) {
        console.warn('⚠️ [GoodSmile AI] Gemini không khả dụng, chuyển sang Knowledge Base.', err);
      }
    }

    const localMatch = findLocalKnowledgeReply(message);
    if (localMatch) return { reply: localMatch, source: 'knowledge_base' };

    return {
      reply: `Dạ chào bạn! Tôi là **Trợ lý AI Nha Khoa GoodSmile** 🦷\n\nTôi có thể hỗ trợ bạn về:\n\n- 🦷 **Các dịch vụ nha khoa** (niềng răng, implant, tẩy trắng, bọc sứ...)\n- 👶 **Nha khoa trẻ em** và chăm sóc răng sữa\n- 🏥 **Bệnh lý nướu răng** và điều trị tủy\n- 📋 **Bảng giá, ưu đãi** và chính sách trả góp\n- 📅 **Đặt lịch hẹn** và thông tin phòng khám\n- 🪥 **Chăm sóc răng miệng** hàng ngày\n\nBạn muốn hỏi về điều gì, tôi sẵn sàng tư vấn ngay nhé! 😊`,
      source: 'knowledge_base',
    };
  },
};
