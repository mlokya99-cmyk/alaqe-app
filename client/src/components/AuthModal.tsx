import React, { useState, useEffect } from 'react';
import { Smartphone, KeyRound, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, switchDemoUser } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.auth.getDemoUsers().then((res) => {
        setDemoUsers(res.users);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 7) {
      alert('تېلېفون نومۇرىنى تولۇق كىرگۈزۈڭ');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.sendCode(phone);
      if (res.dev_code) {
        setDevCode(res.dev_code);
        setCode(res.dev_code);
      }
      setStep('otp');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      alert('تەستىقلاش كودىنى كىرگۈزۈڭ');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.verifyCode({
        phone,
        code,
        display_name: displayName,
      });
      login(res.token, res.user);
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#17212b] rounded-3xl w-full max-w-md shadow-2xl p-6 border border-gray-100 dark:border-gray-800">
        {/* Logo and Brand */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-telegram-blue text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-telegram-blue/30">
            <span className="text-2xl font-black">ئالاقە</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            «ئالاقە» گە كىرىش
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            تېلېگرام ئۇسلۇبىدىكى تېز، بىخەتەر ۋە ئۆزگىچە ئۇيغۇرچە ئالاقە
          </p>
        </div>

        {/* 1-Click Fast Switch Demo Accounts */}
        <div className="mb-6 p-3.5 bg-gray-50 dark:bg-[#0e1621] rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-telegram-blue mb-2.5">
            <UserCheck className="w-4 h-4" />
            <span>سىناق ھېساباتلار بىلەن تېز كىرىش:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchDemoUser(u.id);
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#17212b] hover:border-telegram-blue border border-gray-200 dark:border-gray-700 text-right transition group"
              >
                <img src={u.avatar_url} alt={u.display_name} className="w-7 h-7 rounded-full flex-shrink-0" />
                <span className="text-xs font-semibold truncate group-hover:text-telegram-blue">
                  {u.display_name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Phone OTP flow */}
        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                تېلېفون نومۇرى
              </label>
              <div className="relative">
                <Smartphone className="w-5 h-5 absolute right-3.5 top-3.5 text-gray-400" />
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-3 pr-11 py-3 bg-gray-100 dark:bg-[#242f3d] rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-telegram-blue text-left"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-telegram-blue hover:bg-telegram-blue-hover text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-telegram-blue/25 flex items-center justify-center gap-2"
            >
              <span>داۋاملاشتۇرۇش</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-400">
                  تەستىق كودى
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-telegram-blue hover:underline"
                >
                  نومۇرنى ئۆزگەرتىش
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute right-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  dir="ltr"
                  placeholder="6 خانىلىق كود"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-3 pr-11 py-3 bg-gray-100 dark:bg-[#242f3d] rounded-2xl text-center text-lg tracking-widest font-mono font-bold outline-none focus:ring-2 focus:ring-telegram-blue"
                />
              </div>
              {devCode && (
                <p className="text-[11px] text-green-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  سىناق كودى تولدۇرۇلدى: {devCode}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                ئىسمىڭىز (تۇنجى قېتىم بولسا)
              </label>
              <input
                type="text"
                placeholder="مەسىلەن: ئەلىشەر"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-[#242f3d] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-telegram-blue hover:bg-telegram-blue-hover text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-telegram-blue/25"
            >
              تەستىقلاش ۋە كىرىش
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
