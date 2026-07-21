import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

// ==========================================
// Gemini API config
// ==========================================
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Bạn là trợ lý AI nha khoa của phòng khám GoodSmile.
Hãy tư vấn về sức khỏe răng miệng, dịch vụ nha khoa (niềng răng, tẩy trắng, cấy implant, trám răng, lấy cao răng...) một cách thân thiện và dễ hiểu bằng tiếng Việt.
Câu trả lời ngắn gọn, tối đa 3-4 câu. Nếu câu hỏi không liên quan nha khoa, hãy từ chối lịch sự.`;

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Chào bạn! Tôi là trợ lý AI nha khoa GoodSmile. Tôi có thể giúp gì cho sức khỏe răng miệng của bạn hôm nay?' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputText('');
    setIsTyping(true);

    try {
      // Chuyển lịch sử sang định dạng Gemini
      const history: GeminiContent[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const body = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      };

      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `Lỗi ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        ?? 'Xin lỗi, tôi không nhận được phản hồi. Vui lòng thử lại.';

      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: `⚠️ Lỗi kết nối AI: ${err.message}. Vui lòng thử lại.` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        title="Chat với Trợ lý AI"
      >
        <Icon name="smart_toy" className="text-2xl" />
        <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border-2 border-white"></span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden z-50 transition-all origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="smart_toy" className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">AI Trợ Lý GoodSmile</h3>
              <p className="text-[11px] text-primary-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Hỗ trợ bởi Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[13.5px] leading-relaxed shadow-sm ${
                  msg.sender === 'bot'
                    ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    : 'bg-primary text-white rounded-tr-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-none shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi..."
              disabled={isTyping}
              className="flex-1 bg-surface-container border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 px-4 py-2.5 outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary transition-all cursor-pointer shrink-0"
            >
              <Icon name="send" className="text-[18px] ml-1" />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            AI có thể mắc lỗi. Vui lòng tham khảo ý kiến bác sĩ khi cần.
          </p>
        </div>
      </div>
    </>
  );
};
