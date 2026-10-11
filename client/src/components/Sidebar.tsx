import React, { useState } from 'react';
import { Menu, Search, Plus, Check, CheckCheck } from 'lucide-react';
import { Chat } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { formatUyghurTime, normalizeUyghurText } from '../utils/uyghur';

interface SidebarProps {
  chats: Chat[];
  activeChatId: number | null;
  onSelectChat: (chat: Chat) => void;
  onOpenNewChat: () => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenProfile,
}) => {
  const { onlineUsers, typingMap } = useSocket();
  const [filterTab, setFilterTab] = useState<'all' | 'dm' | 'group' | 'channel'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats by tab & search query
  const filteredChats = chats.filter((chat) => {
    if (filterTab !== 'all' && chat.type !== filterTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = normalizeUyghurText(searchQuery.toLowerCase());
      const title = normalizeUyghurText((chat.title || '').toLowerCase());
      const lastMsg = normalizeUyghurText((chat.latest_message?.body || '').toLowerCase());
      return title.includes(q) || lastMsg.includes(q);
    }
    return true;
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-[#17212b] border-l border-gray-200 dark:border-gray-800 select-none">
      {/* Top App Bar */}
      <div className="p-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenProfile}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-[#202b36] transition"
            title="تەڭشەكلەر"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-telegram-blue animate-pulse" />
            <h1 className="text-lg font-black tracking-tight text-telegram-blue">
              ئالاقە
            </h1>
          </div>
        </div>

        <button
          onClick={onOpenNewChat}
          className="p-2 text-telegram-blue hover:bg-telegram-blue/10 rounded-xl transition flex items-center gap-1 text-xs font-bold"
          title="يېڭى سۆھبەت"
        >
          <Plus className="w-4 h-4" />
          <span>يېڭى</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="ئىزدەش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-gray-100 dark:bg-[#242f3d] rounded-xl text-xs outline-none focus:ring-2 focus:ring-telegram-blue transition text-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Chat Category Tabs */}
      <div className="flex px-2 border-b border-gray-100 dark:border-gray-800 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            filterTab === 'all'
              ? 'border-telegram-blue text-telegram-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          ھەممىسى
        </button>
        <button
          onClick={() => setFilterTab('dm')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            filterTab === 'dm'
              ? 'border-telegram-blue text-telegram-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          شەخسىي
        </button>
        <button
          onClick={() => setFilterTab('group')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            filterTab === 'group'
              ? 'border-telegram-blue text-telegram-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          گۇرۇپپا
        </button>
        <button
          onClick={() => setFilterTab('channel')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            filterTab === 'channel'
              ? 'border-telegram-blue text-telegram-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          كانال
        </button>
      </div>

      {/* Chat List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-transparent">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            سۆھبەت تېپىلمىدى
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isOnline = chat.type === 'dm' && chat.other_user
              ? onlineUsers.has(chat.other_user.id) || chat.is_online
              : false;

            // Check if someone in this chat is typing
            const typingUsers = typingMap[chat.id] || [];
            const isTyping = typingUsers.length > 0;

            const latestMsg = chat.latest_message;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition relative ${
                  isActive
                    ? 'bg-telegram-blue/10 dark:bg-[#2b5278]/40 border-r-4 border-telegram-blue'
                    : 'hover:bg-gray-50 dark:hover:bg-[#202b36]'
                }`}
              >
                {/* Avatar with Online Badge */}
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.avatar_url}
                    alt={chat.title}
                    className="w-12 h-12 rounded-full object-cover shadow-xs"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold truncate text-gray-900 dark:text-white">
                      {chat.title}
                    </h3>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">
                      {formatUyghurTime(chat.last_activity)}
                    </span>
                  </div>

                  {/* Message Snippet or Typing Indicator */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs truncate flex-1 text-gray-500 dark:text-gray-400">
                      {isTyping ? (
                        <span className="text-telegram-blue font-medium animate-pulse flex items-center gap-1">
                          <span>يازىۋاتىدۇ...</span>
                        </span>
                      ) : latestMsg ? (
                        <span>
                          {latestMsg.type === 'voice' && '🎤 ئاۋازلىق ئۇچۇر'}
                          {latestMsg.type === 'image' && '📷 رەسىم'}
                          {latestMsg.type === 'file' && '📎 ھۆججەت'}
                          {latestMsg.type === 'text' && latestMsg.body}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">سۆھبەت باشلاندى</span>
                      )}
                    </p>

                    {/* Unread badge or check status */}
                    <div className="flex items-center gap-1 flex-shrink-0 mr-1.5">
                      {chat.unread_count > 0 ? (
                        <span className="px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-bold text-white bg-telegram-blue rounded-full shadow-xs">
                          {chat.unread_count}
                        </span>
                      ) : latestMsg && latestMsg.sender_id === chat.owner_id ? (
                        <span className="text-gray-400">
                          {latestMsg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-telegram-blue" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
