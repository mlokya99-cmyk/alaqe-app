import React from 'react';
import { Message } from '../types';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { formatFileSize } from '../utils/uyghur';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  isGroup: boolean;
  onImageClick?: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOutgoing,
  isGroup,
  onImageClick,
}) => {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col mb-2.5 max-w-[85%] md:max-w-[70%] ${isOutgoing ? 'self-end' : 'self-start'}`}>
      <div
        className={`relative px-3.5 py-2 rounded-2xl shadow-sm text-sm transition ${
          isOutgoing
            ? 'bg-[#2b5278] dark:bg-[#2b5278] text-white rounded-br-none'
            : 'bg-white dark:bg-[#182533] text-gray-900 dark:text-[#f5f5f5] rounded-bl-none border border-gray-100 dark:border-transparent'
        }`}
      >
        {/* Sender name for incoming messages in group chats */}
        {!isOutgoing && isGroup && (
          <div className="text-xs font-semibold text-telegram-blue mb-1 flex items-center gap-1.5 cursor-pointer hover:underline">
            <span>{message.sender.display_name}</span>
            {message.sender.username && (
              <span className="text-[10px] text-gray-400 font-normal">@{message.sender.username}</span>
            )}
          </div>
        )}

        {/* Content Type: Image */}
        {message.type === 'image' && message.media_url && (
          <div className="mb-1.5 rounded-lg overflow-hidden max-w-sm">
            <img
              src={message.media_url}
              alt="يوللانغان رەسىم"
              className="w-full max-h-72 object-cover rounded-lg cursor-pointer hover:opacity-95 transition"
              onClick={() => onImageClick?.(message.media_url!)}
              loading="lazy"
            />
          </div>
        )}

        {/* Content Type: Voice Recording */}
        {message.type === 'voice' && message.media_url && (
          <div className="mb-1">
            <AudioPlayer
              src={message.media_url}
              duration={message.voice_duration}
              isOutgoing={isOutgoing}
            />
          </div>
        )}

        {/* Content Type: Document / File */}
        {message.type === 'file' && message.media_url && (
          <div className="flex items-center gap-3 p-2 my-1 rounded-xl bg-black/5 dark:bg-white/5">
            <div className={`p-2.5 rounded-full ${isOutgoing ? 'bg-white/20' : 'bg-telegram-blue/20 text-telegram-blue'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" dir="ltr">
                {message.file_name || 'ھۆججەت'}
              </p>
              <p className="text-[10px] opacity-70">
                {formatFileSize(message.file_size)}
              </p>
            </div>
            <a
              href={message.media_url}
              download={message.file_name || 'download'}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition"
              title="چۈشۈرۈش"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Content Type: Text Message */}
        {message.body && (
          <div className="leading-relaxed break-words whitespace-pre-wrap select-text font-normal text-[14.5px]">
            {message.body}
          </div>
        )}

        {/* Timestamp and status ticks footer */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[11px] select-none ${
            isOutgoing ? 'text-white/70' : 'text-gray-400 dark:text-gray-400'
          }`}
        >
          <span>{time}</span>

          {/* Status ticks for outgoing messages */}
          {isOutgoing && (
            <span className="flex items-center">
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#4fae5b] dark:text-[#5ec8d8]" />
              ) : (
                <Check className="w-3.5 h-3.5 opacity-80" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
