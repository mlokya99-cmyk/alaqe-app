import React, { useState, useEffect } from 'react';
import { X, Search, Users, Radio, MessageSquare, Plus } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: number) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [tab, setTab] = useState<'dm' | 'group' | 'channel'>('dm');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Group / Channel creation state
  const [title, setTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.auth.getDemoUsers().then((res) => {
        setDemoUsers(res.users);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.users.search(searchQuery);
        setSearchResults(res.users);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleStartDM = async (userId: number) => {
    try {
      const res = await api.chats.create({ type: 'dm', target_user_id: userId });
      onChatCreated(res.chat_id);
      onClose();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCreateGroupOrChannel = async () => {
    if (!title.trim()) {
      alert('نامنى كىرگۈزۈڭ');
      return;
    }

    try {
      const res = await api.chats.create({
        type: tab,
        title: title.trim(),
        member_ids: selectedUsers,
      });
      onChatCreated(res.chat_id);
      onClose();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {tab === 'dm' && 'يېڭى شەخسىي سۆھبەت'}
            {tab === 'group' && 'يېڭى گۇرۇپپا قۇرۇش'}
            {tab === 'channel' && 'يېڭى كانال قۇرۇش'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0e1621]">
          <button
            onClick={() => setTab('dm')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'dm'
                ? 'border-telegram-blue text-telegram-blue bg-white dark:bg-[#17212b]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            شەخسىي
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'group'
                ? 'border-telegram-blue text-telegram-blue bg-white dark:bg-[#17212b]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            گۇرۇپپا
          </button>
          <button
            onClick={() => setTab('channel')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'channel'
                ? 'border-telegram-blue text-telegram-blue bg-white dark:bg-[#17212b]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Radio className="w-4 h-4" />
            كانال
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          {tab === 'dm' ? (
            <div>
              {/* Search user */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute right-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ئىشلەتكۈچى ئىسمى ياكى تېلېفون نومۇرى..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 bg-gray-100 dark:bg-[#242f3d] rounded-xl text-sm outline-none focus:ring-2 focus:ring-telegram-blue"
                />
              </div>

              {/* Search results or Suggested users */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  {searchQuery ? 'ئىزدەش نەتىجىسى:' : 'تەۋسىيە قىلىنغان دوستلار:'}
                </p>

                {(searchQuery ? searchResults : demoUsers).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartDM(u.id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#202b36] cursor-pointer transition"
                  >
                    <img src={u.avatar_url} alt={u.display_name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.display_name}</p>
                      <p className="text-xs text-gray-400 truncate">@{u.username || u.phone}</p>
                    </div>
                    <button className="p-2 bg-telegram-blue/10 text-telegram-blue hover:bg-telegram-blue hover:text-white rounded-full transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  {tab === 'group' ? 'گۇرۇپپا نامى' : 'كانال نامى'}
                </label>
                <input
                  type="text"
                  placeholder={tab === 'group' ? 'مەسىلەن: ئەدەبىيات كۇلۇبى' : 'مەسىلەن: تېخنىكا دۇنياسى'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-[#242f3d] rounded-xl text-sm outline-none focus:ring-2 focus:ring-telegram-blue"
                />
              </div>

              {tab === 'group' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">
                    ئەزالارنى تاللاڭ
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {demoUsers.map((u) => {
                      const isSelected = selectedUsers.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                            } else {
                              setSelectedUsers([...selectedUsers, u.id]);
                            }
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                            isSelected
                              ? 'bg-telegram-blue/15 border border-telegram-blue/30'
                              : 'hover:bg-gray-100 dark:hover:bg-[#202b36]'
                          }`}
                        >
                          <img src={u.avatar_url} alt={u.display_name} className="w-8 h-8 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs truncate">{u.display_name}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-telegram-blue focus:ring-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateGroupOrChannel}
                className="w-full py-3 bg-telegram-blue hover:bg-telegram-blue-hover text-white rounded-xl font-bold text-sm transition shadow-md"
              >
                {tab === 'group' ? 'گۇرۇپپىنى قۇرۇش' : 'كانالنى ئېچىش'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
