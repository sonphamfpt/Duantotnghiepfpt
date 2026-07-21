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
}

// ==========================================
// GEMINI SYSTEM PROMPT — Nha Khoa GoodSmile
// ==========================================

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI thông minh của phòng khám nha khoa GoodSmile. 
Nhiệm vụ của bạn là hỗ trợ nhân viên và bệnh nhân về các vấn đề liên quan đến:
- Tư vấn dịch vụ nha khoa (tẩy trắng, niềng răng, cấy implant, nhổ răng, trám răng...)
- Thông tin về sức khỏe răng miệng và phòng ngừa bệnh lý
- Hỗ trợ nhân viên tra cứu thông tin chuyên môn
- Giải thích quy trình điều trị cho bệnh nhân

Hãy trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp và dễ hiểu.
Nếu câu hỏi không liên quan đến nha khoa hay y tế, hãy lịch sự từ chối và hướng dẫn người dùng hỏi đúng chủ đề.`;

// ==========================================
// GEMINI API CLIENT (Direct call from frontend)
// ==========================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const chatApi = {
  /**
   * Gửi tin nhắn đến Gemini AI với lịch sử hội thoại
   */
  sendMessage: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
    // Chuyển đổi lịch sử sang định dạng Gemini API
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `Lỗi API Gemini (${response.status})`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error('Không nhận được phản hồi từ AI.');
    }

    return { reply };
  },
};
