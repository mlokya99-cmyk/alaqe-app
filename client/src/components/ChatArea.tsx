import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Chat, Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { MessageBubble } from './MessageBubble';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatAreaProps {
  chat: Chat | null;
  onBackMobile?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ chat, onBackMobile }) => {
  const { user } = useAuth();
  const { sendMessage, sendTyping, markRead, onlineUsers, typingMap, onNewMessage, onMessageRead } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Load chat messages when active chat changes
  useEffect(() => {
    if (!chat) return;

    let isMounted = true;
    setIsLoadingMessages(true);

    api.chats.getMessages(chat.id)
      .then((res) => {
        if (isMounted) {
          setMessages(res.messages);
          setIsLoadingMessages(false);
          markRead(chat.id);
        }
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chat?.id]);

  // Listen to incoming WebSocket messages
  useEffect(() => {
    const unsubMsg = onNewMessage((newMsg) => {
      if (chat && newMsg.chat_id === chat.id) {
        setMessages((prev) => {
          // Avoid duplicate messages if already present
          if (prev.some((m) => m.msg_id === newMsg.msg_id)) {
            return prev;
          }
          return [...prev, newMsg];
        });

        // If message is from someone else, mark as read
        if (user && newMsg.sender_id !== user.id) {
          markRead(chat.id, newMsg.msg_id);
        }
      }
    });

    const unsubRead = onMessageRead((data) => {
      if (chat && data.chat_id === chat.id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender_id === user?.id && m.status !== 'read') {
              return { ...m, status: 'read' };
            }
            return m;
          })
        );
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
    };
  }, [chat?.id, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMap]);

  if (!chat) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#0e1621] select-none text-center">
        <div className="w-24 h-24 rounded-full bg-telegram-blue/10 flex items-center justify-center mb-4 text-telegram-blue shadow-inner">
          <span className="text-4xl font-black">ئالاقە</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          سۆھبەتنى تاللاڭ ياكى يېڭىسىنى باشلاڭ
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-sm leading-relaxed">
          سول تەرەپتىكى سۆھبەتلەردىن بىرىنى تاللاڭ ياكى دوستلىرىڭىز بىلەن ئۇيغۇرچە يېڭى ئالاقىنى باشلاڭ.
        </p>
      </div>
    );
  }

  // Active chat details
  const isOnline = chat.type === 'dm' && chat.other_user
    ? onlineUsers.has(chat.other_user.id) || chat.is_online
    : false;

  const typingUsers = typingMap[chat.id] || [];

  const handleSendText = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(chat.id, inputText.trim(), { type: 'text' });
    setInputText('');
    sendTyping(chat.id, 'stopped');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    sendTyping(chat.id, 'typing');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(chat.id, 'stopped');
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    setIsRecordingVoice(false);
    try {
      const res = await api.media.upload(audioBlob, `voice-${Date.now()}.webm`);
      sendMessage(chat.id, '', {
        type: 'voice',
        media_url: res.media.url,
        voice_duration: duration,
      });
    } catch (err) {
      alert('ئاۋازنى ئەۋەتىش مەغلۇپ بولدى');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.media.upload(file);
      const isImg = file.type.startsWith('image/');

      sendMessage(chat.id, isImg ? '' : file.name, {
        type: isImg ? 'image' : 'file',
        media_url: res.media.url,
        file_name: file.name,
        file_size: file.size,
      });
    } catch (err) {
      alert('ھۆججەت يوللاش مەغلۇپ بولدى');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#eef2f5] dark:bg-[#0e1621] relative overflow-hidden">
      {/* Chat Top Header */}
      <header className="h-16 px-4 bg-white dark:bg-[#17212b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="p-1.5 md:hidden text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <img
              src={chat.avatar_url}
              alt={chat.title}
              className="w-10 h-10 rounded-full object-cover"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {chat.title}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {typingUsers.length > 0 ? (
                <span className="text-telegram-blue font-semibold animate-pulse">
                  {typingUsers[0].displayName} يازىۋاتىدۇ...
                </span>
              ) : chat.type === 'dm' ? (
                isOnline ? (
                  <span className="text-green-500 font-medium">توردا</span>
                ) : (
                  'ئەڭ ئاخىرقى قېتىم يېقىندا كۆرۈلگەن'
                )
              ) : chat.type === 'group' ? (
                `${chat.member_count || 3} ئەزا`
              ) : (
                'رەسمىي كانال'
              )}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <button
            onClick={() => alert('ئاۋازلىق چاقىرىق ئىقتىدارى (WebRTC) كېيىنكى باسقۇچتا قوزغىتىلىدۇ')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#202b36] rounded-full transition"
            title="ئاۋازلىق چاقىرىش"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#202b36] rounded-full transition"
            title="ئىزدەش"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#202b36] rounded-full transition"
            title="تاللانما"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-between">
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            ئۇچۇرلار ئوقۇلۇۋاتىدۇ...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="bg-white/80 dark:bg-[#182533]/80 backdrop-blur-xs p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-sm">
              <h3 className="font-bold text-sm mb-1">تېخى ھېچقانداق ئۇچۇر يوق</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                «سالام» دەپ ئۇچۇر ئەۋەتىپ سۆھبەتنى باشلاڭ!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-end">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.msg_id}
                message={msg}
                isOutgoing={msg.sender_id === user?.id}
                isGroup={chat.type !== 'dm'}
                onImageClick={(url) => setPreviewImage(url)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing Bubble */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-telegram-blue animate-pulse flex items-center gap-1.5 select-none">
          <span className="w-2 h-2 rounded-full bg-telegram-blue animate-ping" />
          <span>{typingUsers.map((u) => u.displayName).join('، ')} يازىۋاتىدۇ...</span>
        </div>
      )}

      {/* Input Bar */}
      <footer className="p-3 bg-white dark:bg-[#17212b] border-t border-gray-200 dark:border-gray-800 z-10">
        {isRecordingVoice ? (
          <VoiceRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-telegram-blue hover:bg-gray-100 dark:hover:bg-[#202b36] rounded-full transition"
              title="ھۆججەت ياكى رەسىم يوللاش"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setInputText((prev) => prev + ' 😊')}
              className="p-2 text-gray-400 hover:text-telegram-blue hover:bg-gray-100 dark:hover:bg-[#202b36] rounded-full transition"
              title="ئېموجى"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="ئۇچۇر يېزىڭ..."
                rows={1}
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-[#f5f5f5] rounded-2xl text-sm outline-none resize-none max-h-32 focus:ring-2 focus:ring-telegram-blue transition"
              />
            </div>

            {/* Send or Voice Button */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="p-2.5 bg-telegram-blue hover:bg-telegram-blue-hover text-white rounded-full transition shadow-md shadow-telegram-blue/20"
                title="ئەۋەتىش"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 bg-gray-100 dark:bg-[#242f3d] text-gray-500 hover:text-telegram-blue hover:bg-gray-200 dark:hover:bg-[#2b5278] rounded-full transition"
                title="ئاۋازلىق ئۇچۇر"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </footer>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 left-4 p-2 text-white bg-black/40 rounded-full hover:bg-black/60 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="رەسىم كۆرۈنۈشى"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
