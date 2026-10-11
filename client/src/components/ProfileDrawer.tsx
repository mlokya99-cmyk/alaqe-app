import React, { useState } from 'react';
import { X, Moon, Sun, LogOut, Edit3, Check, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');

  if (!isOpen || !user) return null;

  const handleSaveProfile = async () => {
    try {
      const res = await api.users.updateProfile({
        display_name: displayName,
        bio,
      });
      updateUser(res.user);
      setIsEditing(false);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer content (Right side in RTL) */}
      <div className="relative w-80 bg-white dark:bg-[#17212b] h-full shadow-2xl flex flex-col z-10 border-l border-gray-100 dark:border-gray-800 animate-slideRight">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-base">ھېسابات تەڭشەكلىرى</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Details */}
        <div className="p-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 text-center">
          <div className="relative mb-3">
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-20 h-20 rounded-full shadow-md border-2 border-telegram-blue"
            />
          </div>

          {isEditing ? (
            <div className="w-full space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ئىسمىڭىز"
                className="w-full px-3 py-1.5 text-center bg-gray-100 dark:bg-[#242f3d] rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-telegram-blue"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="ئۆزىڭىز ھەققىدە قىسقىچە..."
                rows={2}
                className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-[#242f3d] rounded-xl outline-none focus:ring-2 focus:ring-telegram-blue"
              />
              <button
                onClick={handleSaveProfile}
                className="px-4 py-1.5 bg-telegram-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 mx-auto hover:bg-telegram-blue-hover transition"
              >
                <Check className="w-3.5 h-3.5" />
                ساقلاش
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  {user.display_name}
                </h4>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-telegram-blue transition"
                  title="تەھرىرلەش"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-telegram-blue mt-0.5">@{user.username || 'username'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic px-2">
                "{user.bio || 'تېخى تونۇشتۇرۇش يېزىلمىغان'}"
              </p>
            </>
          )}
        </div>

        {/* Options List */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Switch Account */}
          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#202b36] transition text-sm"
          >
            <Users className="w-5 h-5 text-telegram-blue" />
            <span className="flex-1 text-right font-medium">ھېسابات ئالماشتۇرۇش</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#202b36] transition text-sm"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500" />
            )}
            <span className="flex-1 text-right font-medium">
              {isDarkMode ? 'يورۇق ئۇسلۇبقا ئۆتۈش' : 'قاراڭغۇ ئۇسلۇب (Dark Mode)'}
            </span>
          </button>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>چېكىنىش</span>
          </button>
        </div>
      </div>
    </div>
  );
};
