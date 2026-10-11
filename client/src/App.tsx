import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSocket } from './contexts/SocketContext';
import { api } from './services/api';
import { Chat } from './types';

import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { NewChatModal } from './components/NewChatModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { onNewMessage } = useSocket();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Modals & Drawers
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('alaqe_theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('alaqe_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('alaqe_theme', 'light');
    }
  }, [isDarkMode]);

  // Load chat list
  const loadChats = async () => {
    if (!user) return;
    try {
      const res = await api.chats.list();
      setChats(res.chats);
      // Auto select first chat on initial desktop load if none selected
      if (!activeChat && res.chats.length > 0 && window.innerWidth >= 768) {
        setActiveChat(res.chats[0]);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadChats();
    } else {
      setChats([]);
      setActiveChat(null);
    }
  }, [user]);

  // Listen to incoming messages to reorder and update chat previews
  useEffect(() => {
    const unsub = onNewMessage((newMsg) => {
      setChats((prev) => {
        const chatIdx = prev.findIndex((c) => c.id === newMsg.chat_id);
        if (chatIdx === -1) {
          // New chat created or not in list yet, reload all
          loadChats();
          return prev;
        }

        const targetChat = prev[chatIdx];
        const isCurrentActive = activeChat?.id === newMsg.chat_id;
        const unreadInc = (!isCurrentActive && newMsg.sender_id !== user?.id) ? 1 : 0;

        const updatedChat: Chat = {
          ...targetChat,
          latest_message: newMsg,
          unread_count: targetChat.unread_count + unreadInc,
          last_activity: newMsg.created_at,
        };

        // Move active chat to top
        const rest = prev.filter((c) => c.id !== newMsg.chat_id);
        return [updatedChat, ...rest];
      });
    });

    return () => unsub();
  }, [activeChat?.id, user?.id]);

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat);
    // Reset unread count locally
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleChatCreated = async (chatId: number) => {
    await loadChats();
    try {
      const res = await api.chats.get(chatId);
      setActiveChat(res.chat);
    } catch (err) {
      console.error('Get chat error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0e1621] text-telegram-blue">
        <div className="w-16 h-16 rounded-full border-4 border-telegram-blue/20 border-t-telegram-blue animate-spin mb-4" />
        <p className="text-sm font-bold animate-pulse">«ئالاقە» يۈكلىنىۋاتىدۇ...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-[#f5f5f5]">
      {/* Sidebar: hidden on mobile if chat is active */}
      <div className={`h-full ${activeChat ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar
          chats={chats}
          activeChatId={activeChat?.id || null}
          onSelectChat={handleSelectChat}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 h-full ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        <ChatArea
          chat={activeChat}
          onBackMobile={() => setActiveChat(null)}
        />
      </div>

      {/* Modals & Drawers */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onChatCreated={handleChatCreated}
      />

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};
