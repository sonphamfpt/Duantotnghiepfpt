import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from './Icon';
import { chatApi, ChatMessage as ApiChatMessage } from '../services/api/chatApi';

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  isStreaming?: boolean;
}

const WELCOME_TEXT =
  'Xin chào! Tôi là **Trợ lý AI Nha Khoa GoodSmile** 🦷\n\nTôi có thể tư vấn về dịch vụ, bảng giá, niềng răng, implant, chăm sóc răng trẻ em và hướng dẫn đặt lịch khám cho bạn ngay lập tức!\n\n*Bạn muốn hỏi điều gì?* 😊';

// Các câu hỏi gợi ý nhanh (xoay vòng nhiều chủ đề)
const SUGGESTED_QUESTIONS = [
  'Cách đặt lịch khám?',
  'Niềng răng giá bao nhiêu?',
  'Quy trình khám tổng quát?',
  'Thanh toán bằng hình thức nào?',
  'Đăng nhập có tính năng gì?',
  'Tẩy trắng răng có đau không?',
  'Implant mất bao lâu?',
  'Răng trẻ em khám từ mấy tuổi?',
];

/**
 * Định dạng markdown sang HTML.
 * Hỗ trợ: **bold**, *italic*, danh sách -, bảng markdown, xuống dòng.
 */
function formatMarkdownText(text: string): string {
  return text
    // Bảng markdown
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_match, header, rows) => {
      const thCells = header
        .split('|')
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join('');
      const trRows = rows
        .trim()
        .split('\n')
        .map((row: string) => {
          const tds = row
            .split('|')
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');
      return `<table class="ai-table"><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-→•] (.*)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="ai-list">$1</ul>')
    .replace(/\n/g, '<br/>');
}

let msgIdCounter = 2;

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'bot', text: WELCOME_TEXT },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, isOpen, scrollToBottom]);

  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = (customText ?? inputText).trim();
    if (!userText || isStreaming) return;

    const userMsgId = ++msgIdCounter;
    const botMsgId = ++msgIdCounter;

    // Thêm tin nhắn user
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    if (!customText) setInputText('');
    setIsStreaming(true);

    // Thêm tin nhắn bot rỗng với isStreaming=true (hiển thị cursor nhấp nháy)
    setMessages(prev => [...prev, { id: botMsgId, sender: 'bot', text: '', isStreaming: true }]);

    // Lấy lịch sử TRƯỚC khi thêm 2 tin nhắn mới
    const historyForApi: ApiChatMessage[] = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text,
      timestamp: new Date(),
    }));

    // Tạo AbortController để có thể hủy nếu cần
    abortRef.current = new AbortController();

    try {
      await chatApi.streamMessage(
        userText,
        historyForApi,
        // onChunk: cập nhật text của tin nhắn bot liên tục
        (chunk: string) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === botMsgId ? { ...m, text: m.text + chunk } : m
            )
          );
        },
        abortRef.current.signal
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? { ...m, text: 'Dạ xin lỗi, hệ thống AI đang khởi động lại. Bạn thử lại hoặc gọi **Hotline 1800-SMILE** nhé!' }
              : m
          )
        );
      }
    } finally {
      // Khi stream xong: tắt isStreaming trên tin nhắn bot
      setMessages(prev =>
        prev.map(m => (m.id === botMsgId ? { ...m, isStreaming: false } : m))
      );
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    abortRef.current?.abort();
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([{ id: 1, sender: 'bot', text: WELCOME_TEXT }]);
    setIsStreaming(false);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
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
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[400px] h-[580px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden z-50 transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-primary via-blue-700 to-emerald-700 text-white flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
                <Icon name="smart_toy" className="text-lg" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-bold text-[13px] leading-tight text-white">Trợ Lý AI GoodSmile</h3>
              <p className="text-[10px] text-white/75 flex items-center gap-1 mt-0.5">
                {isStreaming ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" />
                    Đang trả lời...
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Gemini AI · Tư vấn 24/7
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={handleReset}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white/70 hover:text-white cursor-pointer"
                title="Xóa hội thoại"
              >
                <Icon name="refresh" className="text-[15px]" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
              title="Đóng"
            >
              <Icon name="close" className="text-[15px]" />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/80 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              {/* Bot avatar */}
              {msg.sender === 'bot' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0 mb-0.5">
                  <Icon name="smart_toy" className="text-white text-[10px]" />
                </div>
              )}

              <div
                className={`px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                  msg.sender === 'bot'
                    ? 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none max-w-[84%]'
                    : 'bg-gradient-to-br from-primary to-blue-700 text-white rounded-br-none font-medium max-w-[78%]'
                }`}
              >
                {msg.sender === 'bot' ? (
                  <>
                    {/* Render markdown HTML */}
                    <div
                      dangerouslySetInnerHTML={{ __html: formatMarkdownText(msg.text) }}
                    />
                    {/* Cursor nhấp nháy khi đang stream */}
                    {msg.isStreaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle animate-[blink_0.8s_step-end_infinite]" />
                    )}
                  </>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>

              {/* User avatar */}
              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm flex-shrink-0 mb-0.5">
                  <Icon name="person" className="text-white text-[10px]" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length < 4 && !isStreaming && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(undefined, q)}
                className="text-[10px] font-semibold text-primary bg-primary/5 hover:bg-primary hover:text-white border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="p-2.5 bg-white border-t border-outline-variant shrink-0">
          <form onSubmit={handleSendChat} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Hỏi về niềng răng, implant, trẻ em..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-slate-50 transition-all disabled:opacity-60"
            />

            {/* Nút Stop khi đang stream / Send khi không */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                className="w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-all shrink-0 cursor-pointer shadow-sm"
                title="Dừng lại"
              >
                <Icon name="stop" className="text-base" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 bg-gradient-to-br from-primary to-blue-700 text-white rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <Icon name="send" className="text-base" />
              </button>
            )}
          </form>
        </div>

        {/* Inline CSS */}
        <style>{`
          .ai-list { margin: 3px 0; padding-left: 14px; list-style: disc; }
          .ai-list li { margin-bottom: 2px; }
          .ai-table { border-collapse: collapse; width: 100%; font-size: 11px; margin: 5px 0; border-radius: 6px; overflow: hidden; }
          .ai-table th { background: #eff6ff; font-weight: 700; padding: 5px 8px; border: 1px solid #dbeafe; text-align: left; font-size: 10.5px; }
          .ai-table td { padding: 4px 8px; border: 1px solid #e2e8f0; }
          .ai-table tr:nth-child(even) td { background: #f8fafc; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>
      </div>
    </>
  );
};
