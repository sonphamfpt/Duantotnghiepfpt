import { BASE_URL } from './apiClient';

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
// GEMINI SYSTEM PROMPT — Nha Khoa GoodSmile
// ==========================================

const SYSTEM_INSTRUCTION = `Bạn là Chuyên gia tư vấn & Trợ lý AI thông minh của Hệ Thống Nha Khoa Quốc Tế GoodSmile.
Nhiệm vụ của bạn là hỗ trợ bệnh nhân và nhân viên phòng khám giải đáp các thắc mắc về:
1. Các dịch vụ nha khoa: Tẩy trắng răng Laser Whitening, Niềng răng Chỉnh nha (mắc cài/Invisalign), Cấy ghép Implant Thụy Sĩ/Hàn Quốc, Nhổ răng khôn, Trám răng thẩm mỹ, Điều trị tủy, Răng sứ thẩm mỹ, Cạo vôi răng...
2. Bảng giá, chương trình ưu đãi, mã giảm giá và chính sách trả góp 0% lãi suất.
3. Quy trình khám chữa bệnh, lịch làm việc (7:00 - 20:00 tất cả các ngày trong tuần), cách thức đặt lịch trực tuyến.
4. Chăm sóc răng miệng và tư vấn phòng ngừa bệnh lý nha khoa.

Quy tắc ứng xử:
- Trả lời bằng tiếng Việt thân thiện, lịch sự, chuyên nghiệp, súc tích và mạch lạc.
- Sử dụng các định dạng rõ ràng (dấu gạch đầu dòng -, câu in đậm **text**) để người xem dễ quan sát.
- Nếu câu hỏi hoàn toàn không liên quan đến nha khoa hay y tế, hãy khéo léo từ chối và hướng dẫn người dùng đặt câu hỏi về chăm sóc răng miệng hoặc dịch vụ phòng khám.`;

// ==========================================
// LOCAL DENTAL KNOWLEDGE BASE (Smart Fallback Engine)
// ==========================================

interface KnowledgeItem {
  keywords: string[];
  reply: string;
}

const DENTAL_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    keywords: ['niềng răng', 'chỉnh nha', 'mắc cài', 'invisalign', 'răng hô', 'răng móm', 'răng thưa'],
    reply: `**Dịch Vụ Niềng Răng Chỉnh Nha Tại GoodSmile:**\n\n- **Các phương pháp:** Niềng răng mắc cài kim loại/sứ cao cấp và niềng răng trong suốt Invisalign.\n- **Chi phí:** Chỉ từ **30.000.000đ** (Hỗ trợ trả góp 0% lãi suất chỉ từ 1.000.000đ/tháng).\n- **Thời gian:** Trung bình từ 12 – 24 tháng tùy tình trạng răng.\n- **Công nghệ:** Quét dấu răng 3D iTero Element 5D xem trước kết quả niềng răng mô phỏng ngay trong 5 phút!\n\n👉 *Bạn có muốn đăng ký khám tư vấn và chụp phim 3D miễn phí hôm nay không?*`,
  },
  {
    keywords: ['tẩy trắng', 'trắng răng', 'laser', 'ê buốt', 'vàng răng'],
    reply: `**Dịch Vụ Tẩy Trắng Răng Laser Whitening Premium:**\n\n- **Ưu điểm:** Răng trắng bật từ 2 – 3 tông chỉ sau 45 phút điều trị, không ê buốt nhờ ánh sáng Laser lạnh chuẩn FDA.\n- **Giá ưu đãi:** Đang giảm 30% chỉ còn từ **1.750.000đ** (Giá gốc 2.500.000đ) khi đăng ký trực tuyến.\n- **Độ bền màu:** Giữ độ trắng sáng tự nhiên từ 2 – 3 năm nếu chăm sóc đúng cách.`,
  },
  {
    keywords: ['implant', 'trồng răng', 'mất răng', 'mão sứ', 'straumann'],
    reply: `**Dịch Vụ Cấy Ghép Implant Thụy Sĩ / Hàn Quốc:**\n\n- **Công dụng:** Phục hồi răng đã mất cố định, ăn nhai chắc chắn và thẩm mỹ 100% như răng thật.\n- **Trụ Implant:** Sử dụng trụ chính hãng Straumann (Thụy Sĩ), Dentium (Hàn Quốc) có thẻ bảo hành từ 15 – 25 năm.\n- **Ưu đãi hiện tại:** Tặng kèm mão sứ cao cấp trị giá **5.000.000đ** khi cấy trụ Implant trong tháng này.\n- **Chi phí:** Trọn gói chỉ từ **15.000.000đ/răng**.`,
  },
  {
    keywords: ['nhổ răng', 'răng khôn', 'răng số 8', 'đau răng khôn', 'mọc lệch'],
    reply: `**Dịch Vụ Nhổ Răng Khôn Bằng Công Nghệ Sóng Siêu Âm Piezotome:**\n\n- **Ưu điểm:** Nhổ răng siêu êm, giảm sưng đau tối đa, vết thương lành nhanh gấp 2 lần so với phương pháp truyền thống.\n- **Chi phí:** Chỉ từ **1.000.000đ – 3.500.000đ/răng** tùy mức độ mọc lệch/ngầm của răng.\n- **Quy trình:** Chụp phim X-quang Panorama chẩn đoán chính xác vị trí dây thần kinh trước khi thực hiện.`,
  },
  {
    keywords: ['cạo vôi', 'lấy cao răng', 'vệ sinh răng', 'hôi miệng', 'chảy máu chân răng'],
    reply: `**Dịch Vụ Lấy Cao Răng Sóng Siêu Âm Mịn:**\n\n- **Tác dụng:** Loại bỏ hoàn toàn mảng bám vôi răng, sạch khuẩn tận gốc, dứt điểm hôi miệng và viêm nướu.\n- **Chi phí:** Chỉ **300.000đ** (Miễn phí 100% cho bệnh nhân lần đầu đặt lịch trực tuyến).\n- **Khuyên dùng:** Nên cạo vôi răng định kỳ 6 tháng/lần.`,
  },
  {
    keywords: ['trám răng', 'sâu răng', 'lỗ sâu', 'mẻ răng'],
    reply: `**Dịch Vụ Trám Răng Thẩm Mỹ Composite:**\n\n- **Ưu điểm:** Phục hồi hình dáng và màu sắc răng tự nhiên, ngăn ngừa vi khuẩn sâu răng phát triển.\n- **Chi phí:** Chỉ từ **350.000đ – 500.000đ/răng**.\n- **Thời gian:** Thực hiện nhanh chóng chỉ 15 – 20 phút/răng.`,
  },
  {
    keywords: ['bảng giá', 'giá dịch vụ', 'chi phí', 'bao nhiêu tiền', 'giá'],
    reply: `**Bảng Giá Dịch Vụ Niêm Yết Tại Nha Khoa GoodSmile:**\n\n1. **Khám & Chụp X-Quang 3D:** Miễn Phí\n2. **Cạo Vôi Răng Siêu Âm:** 300.000đ *(Ưu đãi 0đ lần đầu)*\n3. **Trám Răng Thẩm Mỹ:** 350.000đ – 500.000đ/răng\n4. **Tẩy Trắng Răng Laser:** 1.750.000đ *(Giảm 30%)*\n5. **Nhổ Răng Khôn Piezotome:** 1.000.000đ – 3.500.000đ\n6. **Cấy Ghép Implant:** Từ 15.000.000đ/răng\n7. **Niềng Răng Chỉnh Nha:** Từ 30.000.000đ *(Trả góp 0%)*\n\n👉 *Tất cả chi phí đều được bác sĩ báo rõ ràng trước khi điều trị, cam kết không phát sinh!*`,
  },
  {
    keywords: ['đặt lịch', 'hẹn khám', 'đăng ký', 'giờ làm việc', 'địa chỉ', 'mấy giờ'],
    reply: `**Thông Tin Đặt Lịch & Giờ Làm Việc GoodSmile:**\n\n- **Thời gian mở cửa:** 7:00 – 20:00 (Từ Thứ 2 đến Chủ Nhật, làm việc cả ngày lễ).\n- **Hotline tổng đài:** 1800-SMILE (1800-76453) - Miễn phí cước gọi.\n- **Cách đặt lịch nhanh:** Nhấp vào nút **"Đặt lịch khám"** ở góc màn hình hoặc trang chủ để chọn giờ và bác sĩ mong muốn trong 30 giây!`,
  },
];

/**
 * Tìm câu trả lời từ Local Knowledge Base
 */
function findLocalKnowledgeReply(query: string): string | null {
  const q = query.toLowerCase().trim();
  for (const item of DENTAL_KNOWLEDGE_BASE) {
    if (item.keywords.some((kw) => q.includes(kw))) {
      return item.reply;
    }
  }
  return null;
}

// ==========================================
// GEMINI API CLIENT (Gửi tin nhắn Gemini + Smart Fallback)
// ==========================================

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const chatApi = {
  /**
   * Gửi tin nhắn đến AI (Ưu tiên Gemini, tự động Fallback sang Knowledge Base nếu thiếu Key hoặc gặp lỗi)
   */
  sendMessage: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
    // 1. Kiểm tra nếu có API Key hợp lệ thì thử gọi Gemini
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        const formattedHistory = history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        }));

        const body = {
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            ...formattedHistory,
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        };

        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return { reply, source: 'gemini' };
          }
        }
      } catch (err) {
        console.warn('⚠️ [AI Service] Gemini API tạm thời không khả dụng, chuyển sang Smart Knowledge Base.', err);
      }
    }

    // 2. Tra cứu bằng Smart Dental Knowledge Base (Fallback chính xác 100%)
    const localMatch = findLocalKnowledgeReply(message);
    if (localMatch) {
      return { reply: localMatch, source: 'knowledge_base' };
    }

    // 3. Phản hồi mặc định nếu chưa khớp chủ đề nha khoa
    return {
      reply: `Dạ chào bạn, tôi là **Trợ lý AI Nha Khoa GoodSmile**. Tôi chuyên hỗ trợ tư vấn các vấn đề về răng miệng như:\n\n- 🦷 **Tẩy trắng răng, Niềng răng, Cấy ghép Implant**\n- 🩺 **Nhổ răng khôn, Trám răng, Cạo vôi răng**\n- 📋 **Bảng giá dịch vụ, Lịch làm việc & Đặt lịch hẹn**\n\nBạn có thể đặt câu hỏi cụ thể hơn để tôi tư vấn chi tiết cho bạn ngay nhé!`,
      source: 'knowledge_base',
    };
  },
};
