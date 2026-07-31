import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { chatApi, ChatMessage as ApiChatMessage } from '../services/api/chatApi';

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

// Các câu hỏi gợi ý nhanh
const SUGGESTED_QUESTIONS = [
  'Niềng răng giá bao nhiêu?',
  'Tẩy trắng răng có đau không?',
  'Cấy ghép Implant mất bao lâu?',
  'Khám tổng quát lần đầu có miễn phí không?',
];

// Helper format text có markdown đơn giản
function formatMarkdownText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '• $1')
    .replace(/\n/g, '<br/>');
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'bot', 
      text: 'Xin chào! Tôi là **Trợ lý AI Nha Khoa GoodSmile** 🦷.\n\nTôi có thể hỗ trợ tư vấn dịch vụ, bảng giá, quy trình điều trị và hướng dẫn đặt lịch khám cho bạn ngay lập tức!' 
    },
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

  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = (customText ?? inputText).trim();
    if (!userText || isTyping) return;

    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    if (!customText) setInputText('');
    setIsTyping(true);

    try {
      // Chuyển đổi lịch sử chat sang định dạng API
      const historyForApi: ApiChatMessage[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.text,
        timestamp: new Date(),
      }));

      const res = await chatApi.sendMessage(userText, historyForApi);
      setMessages(prev => [...prev, { sender: 'bot', text: res.reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Dạ xin lỗi, hệ thống AI đang khởi động lại. Bạn có thể thử đặt lại câu hỏi hoặc liên hệ Hotline 1800-SMILE để được tư vấn trực tiếp nhé!' },
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
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary via-blue-600 to-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        title="Chat với Trợ lý AI GoodSmile"
      >
        <Icon name="smart_toy" className="text-2xl" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white"></span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-96 h-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden z-50 transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary via-blue-700 to-emerald-700 text-white flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
              <Icon name="smart_toy" className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">Trợ Lý AI GoodSmile</h3>
              <p className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Tư vấn tự động 24/7
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
            title="Đóng"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-[88%] text-[13px] leading-relaxed shadow-sm ${
                  msg.sender === 'bot'
                    ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                    : 'bg-primary text-white rounded-tr-none font-medium'
                }`}
                dangerouslySetInnerHTML={{ __html: formatMarkdownText(msg.text) }}
              />
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-none shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length < 5 && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(undefined, q)}
                className="text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary hover:text-white border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={(e) => handleSendChat(e)} className="p-3 bg-white border-t border-outline-variant flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Hỏi AI về niềng răng, tẩy trắng, giá..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isTyping}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary bg-slate-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            <Icon name="send" className="text-base" />
          </button>
        </form>
      </div>
    </>
  );
};
