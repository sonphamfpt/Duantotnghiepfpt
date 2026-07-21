import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { chatApi, ChatMessage } from '../../../services/api/chatApi';

// Gợi ý câu hỏi nhanh
const QUICK_QUESTIONS = [
  'Niềng răng mất bao lâu?',
  'Cấy implant có đau không?',
  'Tẩy trắng răng an toàn không?',
  'Trẻ em bao nhiêu tuổi nên khám răng lần đầu?',
];

// Format text có markdown cơ bản (bold, list)
function formatAiText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-4 space-y-1">$1</ul>')
    .replace(/\n/g, '<br/>');
}

export const ManagerAiChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Tự scroll xuống khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = (text ?? inputValue).trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatApi.sendMessage(messageText, messages);
      const aiMessage: ChatMessage = {
        role: 'model',
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi kết nối AI.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-t-xl border border-outline-variant px-5 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <Icon name="smart_toy" className="text-white text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm">Trợ Lý AI GoodSmile</h3>
            <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Hỗ trợ bởi Gemini · Chuyên gia nha khoa ảo
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-xs text-on-surface-variant hover:text-red-500 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
          >
            <Icon name="delete_sweep" className="text-sm" />
            Xóa hội thoại
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white border-x border-outline-variant px-4 py-4 space-y-4">
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
              <Icon name="smart_toy" className="text-white text-3xl" />
            </div>
            <h4 className="font-bold text-on-surface text-base mb-1">Xin chào! Tôi là trợ lý AI GoodSmile</h4>
            <p className="text-xs text-on-surface-variant mb-6 max-w-xs">
              Hỏi tôi về dịch vụ nha khoa, sức khỏe răng miệng, hoặc quy trình điều trị.
            </p>
            {/* Quick questions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-2 rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 transition-all cursor-pointer font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {msg.role === 'model' ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Icon name="smart_toy" className="text-white text-xs" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  <Icon name="person" className="text-white text-xs" />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm'
                  : 'bg-white border border-outline-variant text-on-surface rounded-tl-sm'
              }`}
            >
              {msg.role === 'model' ? (
                <div
                  dangerouslySetInnerHTML={{ __html: formatAiText(msg.content) }}
                  className="prose prose-xs max-w-none"
                />
              ) : (
                <p>{msg.content}</p>
              )}
              <p
                className={`text-[9px] mt-1.5 ${
                  msg.role === 'user' ? 'text-violet-200 text-right' : 'text-on-surface-variant'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Icon name="smart_toy" className="text-white text-xs" />
            </div>
            <div className="bg-white border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
            <Icon name="error_outline" className="text-sm flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white rounded-b-xl border border-t-0 border-outline-variant px-4 py-3 flex-shrink-0 shadow-sm">
        {/* Quick questions (khi đã có chat) */}
        {messages.length > 0 && messages.length < 4 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="text-[10px] whitespace-nowrap px-2.5 py-1.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi về nha khoa... (Enter để gửi)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-outline-variant px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all disabled:opacity-60 placeholder:text-on-surface-variant leading-relaxed max-h-28 overflow-y-auto"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 112) + 'px';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center hover:from-violet-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          >
            <Icon name="send" className="text-sm" />
          </button>
        </div>
        <p className="text-[9px] text-on-surface-variant mt-2 text-center">
          AI có thể mắc sai sót. Hãy xác minh thông tin với bác sĩ khi cần thiết.
        </p>
      </div>
    </div>
  );
};
