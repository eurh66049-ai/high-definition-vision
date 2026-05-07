import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Mic, Square, Loader2 } from 'lucide-react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { createBookSlug } from '@/utils/bookSlug';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
interface AuthorInfo {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  country_name?: string;
  books_count?: number;
  followers_count?: number;
  website?: string;
  slug?: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  books?: Array<{
    id: string;
    slug?: string;
    title: string;
    author: string;
    cover_image_url: string;
  }>;
  authorInfo?: AuthorInfo | null;
}

export const KotobiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! 👋 أنا مساعد كتبي الذكي. يمكنني مساعدتك في العثور على الكتب والإجابة على أسئلتك حول مكتبتنا الرقمية.',
      isBot: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ملاحظة: تم حذف ميزة قراءة الردود صوتياً نهائياً.


  const sendMessageWithText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      isBot: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabaseFunctions.functions.invoke('kotobi-assistant', {
        body: { message: trimmed },
      });

      if (error) throw error;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        isBot: true,
        books: data.books || [],
        authorInfo: data.authorInfo || null,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        isBot: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const sendMessage = () => sendMessageWithText(inputValue);

  const voiceRecorder = useVoiceRecorder({
    onTranscribed: (text) => {
      setVoiceError(null);
      sendMessageWithText(text);
    },
    onError: (msg) => {
      setVoiceError(msg);
      setTimeout(() => setVoiceError(null), 4000);
    },
  });

  const handleMicClick = () => {
    if (isLoading) return;
    setVoiceError(null);
    if (voiceRecorder.state === 'recording') {
      voiceRecorder.stop();
    } else if (voiceRecorder.state === 'idle') {
      voiceRecorder.start();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div 
        className={`fixed bottom-24 right-6 z-[10001] transition-all duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
      >
        {/* حلقة متحركة خارجية */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-20" 
             style={{ backgroundColor: '#FFD600' }} />
        
        <button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full w-[70px] h-[70px] flex items-center justify-center shadow-2xl hover:shadow-[0_0_40px_rgba(255,214,0,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{ 
            background: 'linear-gradient(135deg, #FFD600 0%, #FFA000 100%)',
            boxShadow: '0 8px 20px rgba(255, 214, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          aria-label="فتح مساعد كتبي"
        >
          {/* تأثير لمعان */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <span className="relative text-4xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">💬</span>
        </button>
      </div>

      {/* نافذة المحادثة */}
      <div 
        className={`fixed bottom-28 right-6 z-[10001] transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        <div className="bg-white rounded-xl shadow-lg w-[350px] h-[500px] flex flex-col overflow-hidden" style={{ boxShadow: '0 6px 12px rgba(0,0,0,0.2)' }}>
          {/* رأس النافذة */}
          <div className="p-3 flex items-center justify-between" style={{ background: '#222', color: '#fff' }}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">مساعد Kotobi</span>
              <img src="https://www2.0zz0.com/2025/08/18/17/788850650.png" alt="Kotobi Logo" style={{ height: 30 }} />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="إغلاق النافذة"
              style={{ color: '#fff' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* منطقة الرسائل */}
          <div className="flex-1 overflow-y-auto p-3" style={{ fontSize: 14 }}>
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] p-2 rounded-lg ${
                      message.isBot 
                        ? 'bg-chat-incoming text-chat-incoming-foreground' 
                        : 'bg-chat-outgoing text-chat-outgoing-foreground'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>

                {/* بطاقة المؤلف */}
                {message.authorInfo && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <a 
                      href={`/author/${message.authorInfo.slug || message.authorInfo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={message.authorInfo.avatar_url || '/default-author-avatar.png'}
                        alt={message.authorInfo.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-1">
                          ✍️ {message.authorInfo.name}
                        </h4>
                        {message.authorInfo.country_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            🌍 {message.authorInfo.country_name}
                          </p>
                        )}
                        {message.authorInfo.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {message.authorInfo.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {message.authorInfo.books_count && (
                            <span>📚 {message.authorInfo.books_count} كتاب</span>
                          )}
                          {message.authorInfo.followers_count && (
                            <span>👥 {message.authorInfo.followers_count} متابع</span>
                          )}
                        </div>
                      </div>
                    </a>
                  </div>
                )}

                {message.books && message.books.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {message.books.map((book) => (
                      <a 
                        key={book.id} 
                        href={`/book/${book.slug || createBookSlug(book.title, book.author)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer bg-card border border-border rounded-lg p-2 max-w-[100px]"
                      >
                        <img
                          src={book.cover_image_url || '/src/assets/default-book-cover.png'}
                          alt={book.title}
                          className="w-16 h-20 object-cover rounded border border-border"
                          loading="lazy"
                        />
                        <p className="text-xs mt-2 text-center font-medium text-foreground leading-tight max-w-[90px] overflow-hidden">
                          <span className="line-clamp-2 block">{book.title}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 text-center line-clamp-1 max-w-[90px]">
                          {book.author}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="p-2 rounded-lg bg-chat-incoming text-chat-incoming-foreground">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: '#FFD600', borderTopColor: 'transparent' }}></div>
                    يكتب...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* منطقة الإدخال */}
          <div className="border-t" style={{ borderTopColor: '#ddd', borderTopWidth: 1 }}>
            {voiceError && (
              <div className="px-3 pt-2 text-xs text-red-600 text-right">{voiceError}</div>
            )}
            {voiceRecorder.state === 'recording' && (
              <div className="px-3 pt-2 text-xs text-right" style={{ color: '#d32f2f' }}>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1" />
                جاري التسجيل... اضغط على الزر مجدداً لإرسال الصوت
              </div>
            )}
            <div className="flex gap-2 p-3">
              <button
                onClick={handleMicClick}
                disabled={isLoading || voiceRecorder.state === 'processing'}
                className="px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={
                  voiceRecorder.state === 'recording'
                    ? 'إيقاف التسجيل وإرسال'
                    : voiceRecorder.state === 'processing'
                    ? 'جاري معالجة الصوت'
                    : 'تسجيل صوتي'
                }
                title={
                  voiceRecorder.state === 'recording'
                    ? 'إيقاف وإرسال'
                    : 'التحدث مع المساعد'
                }
                style={{
                  background:
                    voiceRecorder.state === 'recording' ? '#d32f2f' : '#f1f1f1',
                  color: voiceRecorder.state === 'recording' ? '#fff' : '#222',
                }}
              >
                {voiceRecorder.state === 'processing' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : voiceRecorder.state === 'recording' ? (
                  <Square size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  voiceRecorder.state === 'recording'
                    ? '... جاري التسجيل'
                    : 'اكتب رسالتك أو تحدث...'
                }
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none border border-border bg-background text-foreground placeholder:text-muted-foreground"
                disabled={isLoading || voiceRecorder.state !== 'idle'}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || voiceRecorder.state !== 'idle'}
                className="px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="إرسال الرسالة"
                style={{ background: '#FFD600' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};